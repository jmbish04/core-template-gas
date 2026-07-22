import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, asc, desc, eq, inArray, isNull, isNotNull, like, ne, or } from "drizzle-orm";

import { getDb } from "../../db";
import { getWorkerApiKey } from "../../utils/secrets";
import {
  researchDocuments,
  researchPwas,
  researchTagDefs,
  researchTagMappings,
  selectResearchDocumentSchema,
  selectResearchPwaSchema,
} from "../../db/schema";

const bearerHeaderSchema = z.object({
  authorization: z.string().optional(),
});

const documentIngestSchema = z.object({
  googleDocId: z.string().min(1),
  googleDocUrl: z.string().url(),
  sourceTitle: z.string().min(1),
  researchCategory: z.enum(["DEFAULT", "PRODUCT", "BRAND", "SHOWROOM"]).default("DEFAULT"),
  markdown: z.string().min(1),
  createdAt: z.string().datetime(),
  modifiedAt: z.string().datetime().optional(),
  formattedLogUrl: z.string().url().optional(),
  gatewayId: z.string().min(1),
});

const pwaCandidateSchema = z.object({
  documentId: z.string().min(1),
  documentUrl: z.string().url(),
  title: z.string().min(1),
  createdAt: z.string().datetime(),
  modifiedAt: z.string().datetime().optional(),
});

const pwaIngestSchema = z.object({
  driveFileId: z.string().min(1),
  driveFileUrl: z.string().url(),
  sourceTitle: z.string().min(1),
  researchCategory: z.enum(["DEFAULT", "PRODUCT", "BRAND", "SHOWROOM"]).default("DEFAULT"),
  html: z.string().min(1),
  createdAt: z.string().datetime(),
  modifiedAt: z.string().datetime().optional(),
  relatedDocumentCandidates: z.array(pwaCandidateSchema),
  gatewayId: z.string().min(1),
});

export type DocumentIngestInput = z.infer<typeof documentIngestSchema>;
export type PwaIngestInput = z.infer<typeof pwaIngestSchema>;

const libraryQuerySchema = z.object({
  q: z.string().optional(),
  kind: z.enum(["all", "documents", "pwas"]).optional(),
  orphan: z.enum(["all", "orphans", "related"]).optional(),
});

const documentPatchSchema = z.object({
  tags: z.array(z.string()).optional(),
});

const pwaPatchSchema = z.object({
  tags: z.array(z.string()).optional(),
  relatedGoogleDocId: z.string().nullable().optional(),
});

const relationSchema = z.object({
  driveFileId: z.string().min(1),
  relatedGoogleDocId: z.string().nullable(),
});

const driveWakeSchema = z.object({
  source: z.literal("appsscript-trigger").default("appsscript-trigger"),
  fileIds: z.array(z.string().min(1)).max(100).default([]),
});

const tagDefInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).default(""),
  htmlColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  isActive: z.boolean().default(true),
});

const tagMappingInputSchema = z.object({ tagIds: z.array(z.number().int().positive()) });

const geminiProxyQuerySchema = z.object({
  target: z.string().url(),
});

const libraryResponseSchema = z.object({
  documents: z.array(
    z.object({
      id: z.string(),
      googleDocId: z.string(),
      googleDocUrl: z.string().url(),
      sourceTitle: z.string(),
      generatedTitle: z.string().nullable(),
      summary: z.string().nullable(),
      tags: z.array(z.object({
        id: z.number(),
        name: z.string(),
        description: z.string(),
        htmlColor: z.string(),
        isActive: z.boolean(),
        timestamp: z.any(),
      })),
      pwa: z.object({ id: z.string(), driveFileId: z.string(), title: z.string() }).nullable(),
      createdAt: z.string(),
      syncedAt: z.string(),
    }),
  ),
  pwas: z.array(
    z.object({
      id: z.string(),
      driveFileId: z.string(),
      driveFileUrl: z.string().url(),
      sourceTitle: z.string(),
      generatedTitle: z.string().nullable(),
      summary: z.string().nullable(),
      tags: z.array(z.string()),
      relatedGoogleDocId: z.string().nullable(),
      geminiPatched: z.boolean(),
      createdAt: z.string(),
      syncedAt: z.string(),
    }),
  ),
});

export const researchRouter = new OpenAPIHono<{ Bindings: Env }>();

/** Shared document upsert used by both Apps Script HTTP ingest and Drive scan. */
export async function ingestResearchDocument(env: Env, body: DocumentIngestInput) {
  const db = getDb(env);
  const [existing] = await db.select().from(researchDocuments)
    .where(eq(researchDocuments.googleDocId, body.googleDocId)).limit(1);
  if (isCurrentDriveRevision(existing?.driveModifiedAt, body.modifiedAt, Boolean(existing))) {
    return existing!;
  }
  const summary = await summarizeText(env, `Summarize this research document in 2-3 sentences.\n\n${body.markdown}`);
  const generatedTitle = await summarizeText(
    env,
    `Return a concise title for this research document.\n\n${body.markdown.slice(0, 5000)}`,
  );
  await upsertDocumentEmbedding(env, body.googleDocId, body.markdown, {
    googleDocId: body.googleDocId,
    sourceTitle: body.sourceTitle,
    researchCategory: body.researchCategory,
    gatewayId: body.gatewayId,
  });
  const values = {
    googleDocId: body.googleDocId,
    googleDocUrl: body.googleDocUrl,
    sourceTitle: body.sourceTitle,
    researchCategory: body.researchCategory,
    generatedTitle,
    summary,
    markdown: body.markdown,
    formattedLogUrl: body.formattedLogUrl ?? null,
    driveModifiedAt: body.modifiedAt ? new Date(body.modifiedAt) : new Date(body.createdAt),
    createdAt: new Date(body.createdAt),
    syncedAt: new Date(),
  };
  const [row] = existing
    ? await db.update(researchDocuments).set(values)
        .where(eq(researchDocuments.googleDocId, body.googleDocId)).returning()
    : await db.insert(researchDocuments).values(values).returning();
  return row!;
}

/** Shared HTML/PWA upsert used by Apps Script HTTP ingest and Drive scan. */
export async function ingestResearchPwa(env: Env, body: PwaIngestInput) {
  const db = getDb(env);
  const [existing] = await db.select().from(researchPwas)
    .where(eq(researchPwas.driveFileId, body.driveFileId)).limit(1);
  if (isCurrentDriveRevision(existing?.driveModifiedAt, body.modifiedAt, Boolean(existing))) {
    return existing!;
  }
  const r2Key = `research-pwas/${body.driveFileId}.html`;
  await env.R2_RESEARCH_PWAS.put(r2Key, body.html, {
    httpMetadata: { contentType: "text/html; charset=utf-8" },
  });
  const geminiApiTarget = findGeminiApiTarget(body.html);
  const summary = await summarizeText(env, `Summarize this HTML/PWA app in 2-3 sentences.\n\n${body.html.slice(0, 8000)}`);
  const generatedTitle = await summarizeText(
    env,
    `Return a concise title for this HTML/PWA app.\n\n${body.html.slice(0, 5000)}`,
  );
  const inferredRelation = existing?.relationSource === "MANUAL"
    ? null
    : await inferRelatedDocument(
        env,
        {
          driveFileId: body.driveFileId,
          title: body.sourceTitle,
          html: body.html,
          createdAt: body.createdAt,
          researchCategory: body.researchCategory,
        },
        body.relatedDocumentCandidates,
      );
  const values = {
    driveFileId: body.driveFileId,
    driveFileUrl: body.driveFileUrl,
    sourceTitle: body.sourceTitle,
    researchCategory: body.researchCategory,
    generatedTitle,
    summary,
    r2Key,
    relatedGoogleDocId: existing?.relationSource === "MANUAL"
      ? existing.relatedGoogleDocId
      : inferredRelation?.documentId ?? null,
    relationSource: existing?.relationSource === "MANUAL"
      ? "MANUAL"
      : inferredRelation ? "AUTO" : "UNMAPPED",
    relationConfidence: existing?.relationSource === "MANUAL"
      ? existing.relationConfidence
      : inferredRelation?.confidence ?? null,
    driveModifiedAt: body.modifiedAt ? new Date(body.modifiedAt) : new Date(body.createdAt),
    geminiApiTarget,
    geminiPatched: Boolean(geminiApiTarget),
    createdAt: new Date(body.createdAt),
    syncedAt: new Date(),
  };
  const [row] = existing
    ? await db.update(researchPwas).set(values)
        .where(eq(researchPwas.driveFileId, body.driveFileId)).returning()
    : await db.insert(researchPwas).values(values).returning();
  return row!;
}

researchRouter.openapi(
  createRoute({
    method: "get",
    path: "/library",
    tags: ["Research"],
    summary: "List research documents and PWAs",
    operationId: "researchLibraryList",
    request: { query: libraryQuerySchema },
    responses: {
      200: {
        description: "Research library contents",
        content: {"application/json": {schema: libraryResponseSchema}},
      },
    },
  }),
  async (c) => {
    const { q, kind = "all", orphan = "all" } = c.req.valid("query");
    const db = getDb(c.env);

    const docWhere = q
      ? or(
          like(researchDocuments.sourceTitle, `%${q}%`),
          like(researchDocuments.generatedTitle, `%${q}%`),
          like(researchDocuments.summary, `%${q}%`),
        )
      : undefined;

    const pwaConditions = [];
    if (q) {
      pwaConditions.push(
        or(
          like(researchPwas.sourceTitle, `%${q}%`),
          like(researchPwas.generatedTitle, `%${q}%`),
          like(researchPwas.summary, `%${q}%`),
        ),
      );
    }
    if (orphan === "orphans") {
      pwaConditions.push(isNull(researchPwas.relatedGoogleDocId));
    } else if (orphan === "related") {
      pwaConditions.push(isNotNull(researchPwas.relatedGoogleDocId));
    }

    const [documents, pwas] = await Promise.all([
      kind === "pwas" ? Promise.resolve([]) : db.select().from(researchDocuments).where(docWhere).orderBy(desc(researchDocuments.createdAt)),
      kind === "documents"
        ? Promise.resolve([])
        : db
            .select()
            .from(researchPwas)
            .where(pwaConditions.length ? and(...pwaConditions) : undefined)
            .orderBy(desc(researchPwas.createdAt)),
    ]);

    const relatedDocumentIds = new Set(
      pwas.map((row) => row.relatedGoogleDocId).filter((value): value is string => Boolean(value)),
    );
    const filteredDocuments =
      orphan === "orphans"
        ? documents.filter((row) => !relatedDocumentIds.has(row.googleDocId))
        : orphan === "related"
          ? documents.filter((row) => relatedDocumentIds.has(row.googleDocId))
          : documents;

    const documentIds = filteredDocuments.map((row) => row.id);
    const mappings = documentIds.length
      ? await db
          .select({ itemId: researchTagMappings.researchItemId, tag: researchTagDefs })
          .from(researchTagMappings)
          .innerJoin(researchTagDefs, eq(researchTagMappings.researchTagId, researchTagDefs.id))
          .where(inArray(researchTagMappings.researchItemId, documentIds))
      : [];
    const tagsByDocument = new Map<string, typeof mappings[number]["tag"][]>();
    for (const mapping of mappings) {
      const tags = tagsByDocument.get(mapping.itemId) ?? [];
      tags.push(mapping.tag);
      tagsByDocument.set(mapping.itemId, tags);
    }

    return c.json(
      {
        documents: filteredDocuments.map((row) => ({
          ...row,
          generatedTitle: row.generatedTitle ?? null,
          summary: row.summary ?? null,
          tags: tagsByDocument.get(row.id) ?? [],
          pwa: pwas.find((pwa) => pwa.relatedGoogleDocId === row.googleDocId)
            ? (() => {
                const pwa = pwas.find((candidate) => candidate.relatedGoogleDocId === row.googleDocId)!;
                return { id: pwa.id, driveFileId: pwa.driveFileId, title: pwa.generatedTitle ?? pwa.sourceTitle };
              })()
            : null,
          createdAt: row.createdAt.toISOString(),
          syncedAt: row.syncedAt.toISOString(),
        })),
        pwas: pwas.map((row) => ({
          ...row,
          generatedTitle: row.generatedTitle ?? null,
          summary: row.summary ?? null,
          tags: parseTags(row.tagsJson),
          relatedGoogleDocId: row.relatedGoogleDocId ?? null,
          geminiPatched: Boolean(row.geminiPatched),
          createdAt: row.createdAt.toISOString(),
          syncedAt: row.syncedAt.toISOString(),
        })),
      },
      200,
    );
  },
);

researchRouter.get("/documents/:id", async (c) => {
  const db = getDb(c.env);
  const id = c.req.param("id");
  const [document] = await db.select().from(researchDocuments).where(eq(researchDocuments.id, id)).limit(1);
  if (!document) return c.json({ error: "Research document not found." }, 404);
  const [pwa, mappings, tagDefs] = await Promise.all([
    db.select().from(researchPwas).where(eq(researchPwas.relatedGoogleDocId, document.googleDocId)).limit(1),
    db.select({ tag: researchTagDefs }).from(researchTagMappings)
      .innerJoin(researchTagDefs, eq(researchTagMappings.researchTagId, researchTagDefs.id))
      .where(eq(researchTagMappings.researchItemId, document.id)),
    db.select().from(researchTagDefs).where(eq(researchTagDefs.isActive, true)).orderBy(asc(researchTagDefs.name)),
  ]);
  return c.json({
    document: { ...document, markdown: undefined, createdAt: document.createdAt.toISOString(), syncedAt: document.syncedAt.toISOString() },
    tags: mappings.map((row) => row.tag),
    availableTags: tagDefs,
    pwa: pwa[0] ? { ...pwa[0], createdAt: pwa[0].createdAt.toISOString(), syncedAt: pwa[0].syncedAt.toISOString() } : null,
  });
});

researchRouter.get("/pwas/unmapped", async (c) => {
  const rows = await getDb(c.env).select().from(researchPwas)
    .where(isNull(researchPwas.relatedGoogleDocId)).orderBy(desc(researchPwas.createdAt));
  return c.json({ pwas: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), syncedAt: row.syncedAt.toISOString() })) });
});

researchRouter.get("/tags", async (c) => {
  const rows = await getDb(c.env).select().from(researchTagDefs).orderBy(asc(researchTagDefs.name));
  return c.json({ tags: rows });
});

researchRouter.post("/tags", async (c) => {
  const body = tagDefInputSchema.parse(await c.req.json());
  const [row] = await getDb(c.env).insert(researchTagDefs).values(body).returning();
  return c.json(row!, 201);
});

researchRouter.patch("/tags/:id", async (c) => {
  const body = tagDefInputSchema.partial().parse(await c.req.json());
  const [row] = await getDb(c.env).update(researchTagDefs).set(body)
    .where(eq(researchTagDefs.id, Number(c.req.param("id")))).returning();
  return row ? c.json(row) : c.json({ error: "Tag not found." }, 404);
});

researchRouter.put("/documents/:id/tags", async (c) => {
  const { tagIds } = tagMappingInputSchema.parse(await c.req.json());
  const itemId = c.req.param("id");
  const db = getDb(c.env);
  await db.delete(researchTagMappings).where(eq(researchTagMappings.researchItemId, itemId));
  if (tagIds.length) {
    await db.insert(researchTagMappings).values(tagIds.map((researchTagId) => ({ researchItemId: itemId, researchTagId })))
      .onConflictDoNothing();
  }
  return c.json({ ok: true });
});

researchRouter.get("/drive/status", async (c) => {
  const db = getDb(c.env);
  const [documents, pwas] = await Promise.all([
    db.select({ syncedAt: researchDocuments.syncedAt }).from(researchDocuments).orderBy(desc(researchDocuments.syncedAt)).limit(1),
    db.select({ syncedAt: researchPwas.syncedAt }).from(researchPwas).orderBy(desc(researchPwas.syncedAt)).limit(1),
  ]);
  return c.json({
    source: "google-drive-service-account",
    configuredFolders: 4,
    lastDocumentSyncAt: documents[0]?.syncedAt.toISOString() ?? null,
    lastPwaSyncAt: pwas[0]?.syncedAt.toISOString() ?? null,
  });
});

researchRouter.post("/drive/sync", async (c) => {
  await assertWorkerApiKey(c.req.header("authorization"), c.env);
  const { syncResearchFoldersFromDrive } = await import("../../services/google-drive-research");
  return c.json(await syncResearchFoldersFromDrive(c.env));
});

researchRouter.post("/drive/wake", async (c) => {
  await assertWorkerApiKey(c.req.header("authorization"), c.env);
  const signal = driveWakeSchema.parse(await c.req.json());
  const { syncResearchFoldersFromDrive } = await import("../../services/google-drive-research");
  c.executionCtx.waitUntil(
    syncResearchFoldersFromDrive(c.env)
      .then((result) => console.log("Apps Script wake-up Drive sync completed", { signal, result }))
      .catch((error) => console.error("Apps Script wake-up Drive sync failed", { signal, error })),
  );
  return c.json({ accepted: true, source: signal.source, hintedFileIds: signal.fileIds }, 202);
});

researchRouter.openapi(
  createRoute({
    method: "post",
    path: "/documents/ingest",
    tags: ["Research"],
    summary: "Ingest a Google Doc export",
    operationId: "researchDocumentsIngest",
    request: {
      headers: bearerHeaderSchema,
      body: { content: { "application/json": { schema: documentIngestSchema } } },
    },
    responses: {
      200: {
        description: "Upserted document row",
        content: { "application/json": { schema: selectResearchDocumentSchema } },
      },
    },
  }),
  async (c) => {
    await assertWorkerApiKey(c.req.header("authorization"), c.env);
    const row = await ingestResearchDocument(c.env, c.req.valid("json"));
    return c.json(row!, 200);
  },
);

researchRouter.openapi(
  createRoute({
    method: "post",
    path: "/pwas/ingest",
    tags: ["Research"],
    summary: "Ingest an HTML/PWA export",
    operationId: "researchPwasIngest",
    request: {
      headers: bearerHeaderSchema,
      body: { content: { "application/json": { schema: pwaIngestSchema } } },
    },
    responses: {
      200: {
        description: "Upserted PWA row",
        content: { "application/json": { schema: selectResearchPwaSchema } },
      },
    },
  }),
  async (c) => {
    await assertWorkerApiKey(c.req.header("authorization"), c.env);
    const row = await ingestResearchPwa(c.env, c.req.valid("json"));
    return c.json(row!, 200);
  },
);

researchRouter.openapi(
  createRoute({
    method: "patch",
    path: "/documents/{googleDocId}",
    tags: ["Research"],
    summary: "Update document tags",
    operationId: "researchDocumentsPatch",
    request: {
      params: z.object({ googleDocId: z.string().min(1) }),
      body: { content: { "application/json": { schema: documentPatchSchema } } },
    },
    responses: {
      200: {
        description: "Updated document",
        content: { "application/json": { schema: selectResearchDocumentSchema } },
      },
    },
  }),
  async (c) => {
    const { googleDocId } = c.req.valid("param");
    const body = c.req.valid("json");
    const db = getDb(c.env);
    const [row] = await db
      .update(researchDocuments)
      .set({
        tagsJson: body.tags ? JSON.stringify(body.tags) : undefined,
        syncedAt: new Date(),
      })
      .where(eq(researchDocuments.googleDocId, googleDocId))
      .returning();
    return c.json(row!, 200);
  },
);

researchRouter.openapi(
  createRoute({
    method: "patch",
    path: "/pwas/{driveFileId}",
    tags: ["Research"],
    summary: "Update PWA tags or relation",
    operationId: "researchPwasPatch",
    request: {
      params: z.object({ driveFileId: z.string().min(1) }),
      body: { content: { "application/json": { schema: pwaPatchSchema } } },
    },
    responses: {
      200: {
        description: "Updated PWA",
        content: { "application/json": { schema: selectResearchPwaSchema } },
      },
    },
  }),
  async (c) => {
    const { driveFileId } = c.req.valid("param");
    const body = c.req.valid("json");
    const db = getDb(c.env);
    if (body.relatedGoogleDocId !== undefined) {
      await setManualRelationship(db, driveFileId, body.relatedGoogleDocId);
    }
    const [row] = body.tags
      ? await db.update(researchPwas)
          .set({ tagsJson: JSON.stringify(body.tags), syncedAt: new Date() })
          .where(eq(researchPwas.driveFileId, driveFileId)).returning()
      : await db.select().from(researchPwas).where(eq(researchPwas.driveFileId, driveFileId)).limit(1);
    return c.json(row!, 200);
  },
);

researchRouter.openapi(
  createRoute({
    method: "post",
    path: "/relationships",
    tags: ["Research"],
    summary: "Set or clear a document relation for a PWA",
    operationId: "researchRelationsUpsert",
    request: {
      body: { content: { "application/json": { schema: relationSchema } } },
    },
    responses: {
      200: {
        description: "Updated PWA relation",
        content: { "application/json": { schema: selectResearchPwaSchema } },
      },
    },
  }),
  async (c) => {
    const body = c.req.valid("json");
    const db = getDb(c.env);
    const row = await setManualRelationship(db, body.driveFileId, body.relatedGoogleDocId);
    return c.json(row!, 200);
  },
);

researchRouter.get("/pwas/:driveFileId/render", async (c) => {
  const driveFileId = c.req.param("driveFileId");
  const db = getDb(c.env);
  const [row] = await db.select().from(researchPwas).where(eq(researchPwas.driveFileId, driveFileId)).limit(1);
  if (!row) {
    return c.text("PWA not found", 404);
  }

  const object = await (c.env as any).R2_RESEARCH_PWAS.get(row.r2Key);
  if (!object) {
    return c.text("Stored PWA HTML not found", 404);
  }

  const html = await object.text();
  return c.html(rewriteGeminiUrls(html, c.env, row.geminiApiTarget ?? undefined));
});

researchRouter.openapi(
  createRoute({
    method: "post",
    path: "/gemini-proxy",
    tags: ["Research"],
    summary: "Proxy Gemini browser requests through the worker",
    operationId: "researchGeminiProxy",
    request: {
      query: geminiProxyQuerySchema,
    },
    responses: {
      200: { description: "Gemini API response" },
    },
  }),
  async (c) => {
    const { target } = c.req.valid("query");
    const url = new URL(target);
    if (url.hostname !== "generativelanguage.googleapis.com" && !url.hostname.endsWith(".googleapis.com")) {
      return c.json({ error: "Only googleapis.com Gemini targets are allowed." }, 400);
    }

    const requestBody = await c.req.text();
    url.searchParams.set("key", String((c.env as any).GEMINI_API_KEY ?? ""));
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "content-type": c.req.header("content-type") ?? "application/json" },
      body: requestBody,
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  },
);

function parseTags(value: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isCurrentDriveRevision(
  storedModifiedAt: Date | null | undefined,
  incomingModifiedAt: string | undefined,
  exists: boolean,
): boolean {
  if (!exists) return false;
  if (!incomingModifiedAt) return true;
  return Boolean(storedModifiedAt && storedModifiedAt.getTime() >= new Date(incomingModifiedAt).getTime());
}

async function setManualRelationship(
  db: ReturnType<typeof getDb>,
  driveFileId: string,
  relatedGoogleDocId: string | null,
) {
  const [pwa] = await db.select().from(researchPwas)
    .where(eq(researchPwas.driveFileId, driveFileId)).limit(1);
  if (!pwa) throw new Error("PWA not found.");

  if (relatedGoogleDocId) {
    const [document] = await db.select({ id: researchDocuments.id }).from(researchDocuments)
      .where(eq(researchDocuments.googleDocId, relatedGoogleDocId)).limit(1);
    if (!document) throw new Error("Research document not found.");

    await db.update(researchPwas)
      .set({
        relatedGoogleDocId: null,
        relationSource: "UNMAPPED",
        relationConfidence: null,
        syncedAt: new Date(),
      })
      .where(and(
        eq(researchPwas.relatedGoogleDocId, relatedGoogleDocId),
        ne(researchPwas.driveFileId, driveFileId),
      ));
  }

  const [row] = await db.update(researchPwas)
    .set({
      relatedGoogleDocId,
      relationSource: "MANUAL",
      relationConfidence: relatedGoogleDocId ? 100 : null,
      syncedAt: new Date(),
    })
    .where(eq(researchPwas.driveFileId, driveFileId))
    .returning();
  return row;
}

async function assertWorkerApiKey(header: string | undefined, env: Env): Promise<void> {
  const configured = await getWorkerApiKey(env) ?? "";
  if (!configured) {
    return;
  }
  if (header !== `Bearer ${configured}`) {
    throw new Error("Unauthorized worker ingest request.");
  }
}

async function summarizeText(env: Env, prompt: string): Promise<string> {
  const response = await (env as any).AI.run((env as any).MODEL_CHAT ?? "@cf/openai/gpt-oss-120b", {
    messages: [
      {
        role: "system",
        content:
          "You summarize research assets for a document/PWA archive. Return concise, plain text only.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 220,
  });
  return (
    response?.response ??
    response?.result?.response ??
    response?.choices?.[0]?.message?.content ??
    ""
  )
    .toString()
    .trim();
}

async function upsertDocumentEmbedding(
  env: Env,
  googleDocId: string,
  markdown: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const embeddingResponse = await (env as any).AI.run(
    (env as any).DEFAULT_MODEL_EMBEDDING ?? "@cf/baai/bge-large-en-v1.5",
    { text: [markdown.slice(0, 12000)] },
  );
  const values = embeddingResponse?.data?.[0];
  if (Array.isArray(values)) {
    await (env as any).VECTORIZE_RESEARCH_ARCHIVE?.upsert?.([
      {
        id: googleDocId,
        values,
        namespace: googleDocId,
        metadata,
      },
    ]);
  }
}

function findGeminiApiTarget(html: string): string | null {
  const match = html.match(/https:\/\/generativelanguage\.googleapis\.com\/[^\s"'`]+/);
  if (!match?.[0]) {
    return null;
  }
  return match[0].replace(/\?key=\$\{apiKey\}.*$/u, "").replace(/\?key=[^"'`]+$/u, "");
}

function rewriteGeminiUrls(html: string, env: Env, explicitTarget?: string): string {
  const target = explicitTarget ?? findGeminiApiTarget(html);
  if (!target) {
    return html;
  }

  const proxyUrl = `/api/research/gemini-proxy?target=${encodeURIComponent(target)}`;
  return html.replace(/https:\/\/generativelanguage\.googleapis\.com\/[^\s"'`]+/g, proxyUrl);
}

async function inferRelatedDocument(
  env: Env,
  pwa: {
    driveFileId: string;
    title: string;
    html: string;
    createdAt: string;
    researchCategory: string;
  },
  candidates: Array<{ documentId: string; title: string; createdAt: string }>,
): Promise<{ documentId: string; confidence: number } | null> {
  if (candidates.length === 0) {
    return null;
  }

  const db = getDb(env);
  const [documents, mappedPwas] = await Promise.all([
    db.select().from(researchDocuments),
    db.select({ driveFileId: researchPwas.driveFileId, googleDocId: researchPwas.relatedGoogleDocId })
      .from(researchPwas)
      .where(and(isNotNull(researchPwas.relatedGoogleDocId), ne(researchPwas.driveFileId, pwa.driveFileId))),
  ]);
  const candidateIds = new Set(candidates.map((candidate) => candidate.documentId));
  const alreadyMapped = new Set(
    mappedPwas.map((row) => row.googleDocId).filter((value): value is string => Boolean(value)),
  );
  const pwaCreatedAt = new Date(pwa.createdAt).getTime();
  const pwaText = htmlToVisibleText(pwa.html);
  const eligible = documents.filter((document) =>
    candidateIds.has(document.googleDocId)
    && !alreadyMapped.has(document.googleDocId)
    && document.researchCategory === pwa.researchCategory
    && Math.abs(document.createdAt.getTime() - pwaCreatedAt) <= 86_400_000
  );

  const ranked = eligible.map((document) => {
    const ageMs = Math.abs(document.createdAt.getTime() - pwaCreatedAt);
    const contentScore = contentSimilarity(pwaText, document.markdown);
    const titleScore = titleSimilarity(pwa.title, document.sourceTitle);
    const timeScore = Math.max(0, 1 - ageMs / 86_400_000);
    return {
      document,
      contentScore,
      score: contentScore * 0.65 + titleScore * 0.25 + timeScore * 0.1,
    };
  }).sort((left, right) => right.score - left.score);

  const best = ranked[0];
  if (!best || best.contentScore < 0.2 || best.score < 0.4) return null;
  const runnerUp = ranked[1];
  if (runnerUp && best.score - runnerUp.score < 0.08) return null;
  return { documentId: best.document.googleDocId, confidence: Math.round(best.score * 100) };
}

function htmlToVisibleText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&(nbsp|amp|quot|apos|lt|gt);/giu, " ")
    .replace(/&#\d+;/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function contentSimilarity(left: string, right: string): number {
  const a = meaningfulTokens(left);
  const b = meaningfulTokens(right);
  if (!a.size || !b.size) return 0;
  const overlap = [...a].filter((token) => b.has(token)).length;
  return overlap / Math.min(a.size, b.size);
}

function meaningfulTokens(value: string): Set<string> {
  const stopWords = new Set([
    "about", "after", "also", "been", "before", "being", "between", "could", "deep", "document",
    "from", "have", "html", "into", "more", "most", "other", "research", "should", "that", "their",
    "there", "these", "they", "this", "through", "using", "were", "what", "when", "where", "which",
    "while", "with", "would", "your",
  ]);
  return new Set(
    value.toLowerCase().replace(/[^a-z0-9]+/gu, " ").split(/\s+/u)
      .filter((token) => token.length > 3 && !stopWords.has(token)),
  );
}

function titleSimilarity(left: string, right: string): number {
  const tokens = (value: string) => new Set(
    value.toLowerCase()
      .replace(/\.(html?|gdoc)$/u, "")
      .replace(/\b(deep|research|report|interactive|app|pwa|google|document)\b/gu, " ")
      .replace(/[^a-z0-9]+/gu, " ")
      .trim().split(/\s+/u).filter((token) => token.length > 2),
  );
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  const overlap = [...a].filter((token) => b.has(token)).length;
  return overlap / new Set([...a, ...b]).size;
}
