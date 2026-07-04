import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, desc, eq, isNull, isNotNull, like, or } from "drizzle-orm";

import { getDb } from "../../db";
import {
  researchDocuments,
  researchPwas,
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
  markdown: z.string().min(1),
  createdAt: z.string().datetime(),
  formattedLogUrl: z.string().url().optional(),
  gatewayId: z.string().min(1),
});

const pwaCandidateSchema = z.object({
  documentId: z.string().min(1),
  documentUrl: z.string().url(),
  title: z.string().min(1),
  createdAt: z.string().datetime(),
});

const pwaIngestSchema = z.object({
  driveFileId: z.string().min(1),
  driveFileUrl: z.string().url(),
  sourceTitle: z.string().min(1),
  html: z.string().min(1),
  createdAt: z.string().datetime(),
  relatedDocumentCandidates: z.array(pwaCandidateSchema),
  gatewayId: z.string().min(1),
});

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
      tags: z.array(z.string()),
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

    return c.json(
      {
        documents: filteredDocuments.map((row) => ({
          ...row,
          generatedTitle: row.generatedTitle ?? null,
          summary: row.summary ?? null,
          tags: parseTags(row.tagsJson),
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
    assertWorkerApiKey(c.req.header("authorization"), c.env);
    const body = c.req.valid("json");
    const db = getDb(c.env);
    const summary = await summarizeText(c.env, `Summarize this research document in 2-3 sentences.\n\n${body.markdown}`);
    const generatedTitle = await summarizeText(
      c.env,
      `Return a concise title for this research document.\n\n${body.markdown.slice(0, 5000)}`,
    );
    await upsertDocumentEmbedding(c.env, body.googleDocId, body.markdown, {
      googleDocId: body.googleDocId,
      sourceTitle: body.sourceTitle,
      gatewayId: body.gatewayId,
    });

    const [existing] = await db
      .select()
      .from(researchDocuments)
      .where(eq(researchDocuments.googleDocId, body.googleDocId))
      .limit(1);

    const values = {
      googleDocId: body.googleDocId,
      googleDocUrl: body.googleDocUrl,
      sourceTitle: body.sourceTitle,
      generatedTitle,
      summary,
      markdown: body.markdown,
      formattedLogUrl: body.formattedLogUrl ?? null,
      createdAt: new Date(body.createdAt),
      syncedAt: new Date(),
    };

    const [row] = existing
      ? await db
          .update(researchDocuments)
          .set(values)
          .where(eq(researchDocuments.googleDocId, body.googleDocId))
          .returning()
      : await db.insert(researchDocuments).values(values).returning();

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
    assertWorkerApiKey(c.req.header("authorization"), c.env);
    const body = c.req.valid("json");
    const db = getDb(c.env);
    const r2Key = `research-pwas/${body.driveFileId}.html`;
    await (c.env as any).R2_RESEARCH_PWAS.put(r2Key, body.html, {
      httpMetadata: { contentType: "text/html; charset=utf-8" },
    });

    const geminiApiTarget = findGeminiApiTarget(body.html);
    const summary = await summarizeText(c.env, `Summarize this HTML/PWA app in 2-3 sentences.\n\n${body.html.slice(0, 8000)}`);
    const generatedTitle = await summarizeText(
      c.env,
      `Return a concise title for this HTML/PWA app.\n\n${body.html.slice(0, 5000)}`,
    );
    const relatedGoogleDocId = await inferRelatedDocumentId(c.env, summary, body.relatedDocumentCandidates, body.createdAt);

    const [existing] = await db.select().from(researchPwas).where(eq(researchPwas.driveFileId, body.driveFileId)).limit(1);
    const values = {
      driveFileId: body.driveFileId,
      driveFileUrl: body.driveFileUrl,
      sourceTitle: body.sourceTitle,
      generatedTitle,
      summary,
      r2Key,
      relatedGoogleDocId,
      geminiApiTarget,
      geminiPatched: Boolean(geminiApiTarget),
      createdAt: new Date(body.createdAt),
      syncedAt: new Date(),
    };

    const [row] = existing
      ? await db.update(researchPwas).set(values).where(eq(researchPwas.driveFileId, body.driveFileId)).returning()
      : await db.insert(researchPwas).values(values).returning();

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
    const [row] = await db
      .update(researchPwas)
      .set({
        tagsJson: body.tags ? JSON.stringify(body.tags) : undefined,
        relatedGoogleDocId: body.relatedGoogleDocId,
        syncedAt: new Date(),
      })
      .where(eq(researchPwas.driveFileId, driveFileId))
      .returning();
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
    const [row] = await db
      .update(researchPwas)
      .set({ relatedGoogleDocId: body.relatedGoogleDocId, syncedAt: new Date() })
      .where(eq(researchPwas.driveFileId, body.driveFileId))
      .returning();
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

function assertWorkerApiKey(header: string | undefined, env: Env): void {
  const configured = String((env as any).WORKER_API_KEY ?? "");
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

async function inferRelatedDocumentId(
  env: Env,
  summary: string,
  candidates: Array<{ documentId: string; title: string; createdAt: string }>,
  createdAtIso: string,
): Promise<string | null> {
  if (candidates.length === 0) {
    return null;
  }

  const createdAt = new Date(createdAtIso).getTime();
  const nearest = [...candidates].sort(
    (left, right) =>
      Math.abs(new Date(left.createdAt).getTime() - createdAt) -
      Math.abs(new Date(right.createdAt).getTime() - createdAt),
  )[0];

  try {
    const prompt = [
      "Pick the most likely related research document for this HTML/PWA export.",
      `PWA summary: ${summary}`,
      "Candidates:",
      ...candidates.map(
        (candidate, index) =>
          `${index + 1}. ${candidate.documentId} | ${candidate.title} | ${candidate.createdAt}`,
      ),
      "Return only the documentId, or NONE if no match is credible.",
    ].join("\n");
    const result = await summarizeText(env, prompt);
    const found = candidates.find((candidate) => result.includes(candidate.documentId));
    return found?.documentId ?? nearest.documentId ?? null;
  } catch {
    return nearest.documentId ?? null;
  }
}
