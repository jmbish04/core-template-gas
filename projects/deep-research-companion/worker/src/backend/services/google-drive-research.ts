/**
 * Direct Google Drive ingestion for the research Worker.
 *
 * Auth follows Google's documented service-account JWT bearer flow:
 * https://developers.google.com/identity/protocols/oauth2/service-account
 * Folder discovery uses Drive v3 files.list and document export uses
 * files.export:
 * https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list
 * https://developers.google.com/workspace/drive/api/reference/rest/v3/files/export
 */
import { eq } from "drizzle-orm";

import {
  DEFAULT_LOG_FOLDER_ID,
  RESEARCH_FOLDERS,
  type ResearchCategory,
} from "../../../../research-folders";
import { getDb } from "../db";
import {
  appsScriptLoggerErrors,
  appsScriptLoggerFiles,
  appsScriptLoggerLines,
  researchDocuments,
  researchPwas,
} from "../db/schema";
import {
  ingestResearchDocument,
  ingestResearchPwa,
  type DocumentIngestInput,
  type PwaIngestInput,
} from "../api/routes/research";
import { getSecret } from "../utils/secrets";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";
const HTML_MIME = "text/html";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
};

export type DriveResearchSyncResult = {
  folders: number;
  discovered: number;
  documentsIngested: number;
  pwasIngested: number;
  loggerFilesDiscovered: number;
  loggerFilesIngested: number;
  unchanged: number;
  errors: Array<{ folder: string; file?: string; message: string }>;
};

/** Scan every shared folder and upsert changed files through the common ingest layer. */
export async function syncResearchFoldersFromDrive(env: Env): Promise<DriveResearchSyncResult> {
  const token = await getGoogleDriveAccessToken(env);
  const result: DriveResearchSyncResult = {
    folders: Object.keys(RESEARCH_FOLDERS).length + 1,
    discovered: 0,
    documentsIngested: 0,
    pwasIngested: 0,
    loggerFilesDiscovered: 0,
    loggerFilesIngested: 0,
    unchanged: 0,
    errors: [],
  };
  const discovered = new Map<string, DriveFile & { researchCategory: ResearchCategory; folder: string }>();

  for (const [folder, definition] of Object.entries(RESEARCH_FOLDERS)) {
    try {
      for (const file of await listFolderFiles(token, definition.folderId)) {
        if (file.mimeType !== GOOGLE_DOC_MIME && !isHtmlFile(file)) continue;
        discovered.set(file.id, { ...file, researchCategory: definition.researchCategory, folder });
      }
    } catch (error) {
      result.errors.push({ folder, message: errorMessage(error) });
    }
  }
  result.discovered = discovered.size;

  const documents = [...discovered.values()].filter((file) => file.mimeType === GOOGLE_DOC_MIME);
  const candidates = documents.map((file) => ({
    documentId: file.id,
    documentUrl: file.webViewLink ?? `https://docs.google.com/document/d/${file.id}/edit`,
    title: file.name,
    createdAt: file.createdTime,
  }));

  // Documents go first so HTML relationship inference can reference the full set.
  for (const file of documents) {
    try {
      if (await isDocumentCurrent(env, file)) { result.unchanged += 1; continue; }
      const markdown = await exportGoogleDocument(token, file.id);
      const payload: DocumentIngestInput = {
        googleDocId: file.id,
        googleDocUrl: file.webViewLink ?? `https://docs.google.com/document/d/${file.id}/edit`,
        sourceTitle: file.name,
        researchCategory: file.researchCategory,
        markdown,
        createdAt: file.createdTime,
        modifiedAt: file.modifiedTime,
        gatewayId: env.AI_GATEWAY_ID,
      };
      await ingestResearchDocument(env, payload);
      result.documentsIngested += 1;
    } catch (error) {
      result.errors.push({ folder: file.folder, file: file.id, message: errorMessage(error) });
    }
  }

  for (const file of discovered.values()) {
    if (!isHtmlFile(file)) continue;
    try {
      if (await isPwaCurrent(env, file)) { result.unchanged += 1; continue; }
      const payload: PwaIngestInput = {
        driveFileId: file.id,
        driveFileUrl: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
        sourceTitle: file.name,
        researchCategory: file.researchCategory,
        html: await downloadDriveFile(token, file.id),
        createdAt: file.createdTime,
        modifiedAt: file.modifiedTime,
        relatedDocumentCandidates: candidates,
        gatewayId: env.AI_GATEWAY_ID,
      };
      await ingestResearchPwa(env, payload);
      result.pwasIngested += 1;
    } catch (error) {
      result.errors.push({ folder: file.folder, file: file.id, message: errorMessage(error) });
    }
  }


  try {
    const loggerFiles = (await listFolderFiles(token, DEFAULT_LOG_FOLDER_ID)).filter(isProcessingLogFile);
    result.loggerFilesDiscovered = loggerFiles.length;
    const indexedLoggerFiles = await getDb(env)
      .select({ driveId: appsScriptLoggerFiles.driveId })
      .from(appsScriptLoggerFiles);
    const indexedDriveIds = new Set(indexedLoggerFiles.map(({ driveId }) => driveId));
    const newLoggerFiles = loggerFiles.filter((file) => !indexedDriveIds.has(file.id));
    result.unchanged += loggerFiles.length - newLoggerFiles.length;

    for (const file of newLoggerFiles) {
      try {
        await ingestAppsScriptLoggerFile(env, token, file);
        indexedDriveIds.add(file.id);
        result.loggerFilesIngested += 1;
      } catch (error) {
        result.errors.push({ folder: "processing-logs", file: file.id, message: errorMessage(error) });
      }
    }
  } catch (error) {
    result.errors.push({ folder: "processing-logs", message: errorMessage(error) });
  }

  return result;
}

type ProcessingLog = {
  document_id?: unknown;
  document_title?: unknown;
  timestamp?: unknown;
  elements?: unknown;
  errors?: unknown;
};

/** Persist one immutable Apps Script processing log and normalize its arrays. */
async function ingestAppsScriptLoggerFile(env: Env, token: string, file: DriveFile): Promise<void> {
  const db = getDb(env);
  const parsed = JSON.parse(await downloadDriveFile(token, file.id)) as ProcessingLog;
  const elements = Array.isArray(parsed.elements) ? parsed.elements : [];
  const errors = Array.isArray(parsed.errors) ? parsed.errors : [];
  const timestamp = parseLogTimestamp(parsed.timestamp, file.createdTime);
  const [loggerFile] = await db.insert(appsScriptLoggerFiles).values({
    timestamp,
    jsonFileName: file.name.replace(/\.json$/iu, ""),
    driveId: file.id,
    driveUrl: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
    driveFolderId: DEFAULT_LOG_FOLDER_ID,
    documentId: requiredLogString(parsed.document_id, "document_id", file.name),
    documentTitle: requiredLogString(parsed.document_title, "document_title", file.name),
  }).returning({ id: appsScriptLoggerFiles.id });

  try {
    for (const [arrayIndex, element] of elements.entries()) {
      const object = isRecord(element) ? element : {};
      await db.insert(appsScriptLoggerLines).values({
        loggerFileId: loggerFile.id,
        elementsArrayIndexNumber: arrayIndex,
        type: optionalLogString(object.type),
        snippet: optionalLogString(object.snippet),
        fullJsonObject: JSON.stringify(element),
      });
    }

    const entireErrorsArray = JSON.stringify(errors);
    for (const [arrayIndex] of errors.entries()) {
      await db.insert(appsScriptLoggerErrors).values({
        loggerFileId: loggerFile.id,
        errorsArrayIndexNumber: arrayIndex,
        entireErrorsArray,
      });
    }
  } catch (error) {
    await db.delete(appsScriptLoggerFiles).where(eq(appsScriptLoggerFiles.id, loggerFile.id));
    throw error;
  }
}

async function getGoogleDriveAccessToken(env: Env): Promise<string> {
  const [email, part1, part2] = await Promise.all([
    getSecret(env, "GOOGLE_CREDS_SA_CLIENT_EMAIL"),
    getSecret(env, "GOOGLE_CREDS_SA_PRIVATE_KEY_PT_1"),
    getSecret(env, "GOOGLE_CREDS_SA_PRIVATE_KEY_PT_2"),
  ]);
  if (!email || !part1 || !part2) throw new Error("Google service-account secrets are incomplete.");
  const privateKey = `${part1}${part2}`.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: "RS256", typ: "JWT" });
  const claims = base64UrlJson({
    iss: email,
    scope: DRIVE_SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const signingInput = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput));
  const assertion = `${signingInput}.${base64UrlBytes(new Uint8Array(signature))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const body = await response.json<{ access_token?: string; error_description?: string }>();
  if (!response.ok || !body.access_token) throw new Error(body.error_description ?? `Google token request failed (${response.status}).`);
  return body.access_token;
}

async function listFolderFiles(token: string, folderId: string): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("q", `'${folderId}' in parents and trashed = false`);
    url.searchParams.set("fields", "nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,webViewLink)");
    url.searchParams.set("pageSize", "1000");
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("includeItemsFromAllDrives", "true");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const body = await googleJson<{ files?: DriveFile[]; nextPageToken?: string }>(token, url);
    files.push(...(body.files ?? []));
    pageToken = body.nextPageToken;
  } while (pageToken);
  return files;
}

async function exportGoogleDocument(token: string, fileId: string): Promise<string> {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export`);
  url.searchParams.set("mimeType", "text/markdown");
  return googleText(token, url);
}

async function downloadDriveFile(token: string, fileId: string): Promise<string> {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set("alt", "media");
  return googleText(token, url);
}

async function googleJson<T>(token: string, url: URL): Promise<T> {
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Drive API ${response.status}: ${await response.text()}`);
  return response.json<T>();
}

async function googleText(token: string, url: URL): Promise<string> {
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Drive API ${response.status}: ${await response.text()}`);
  return response.text();
}

async function isDocumentCurrent(env: Env, file: DriveFile): Promise<boolean> {
  const [row] = await getDb(env).select({ driveModifiedAt: researchDocuments.driveModifiedAt })
    .from(researchDocuments).where(eq(researchDocuments.googleDocId, file.id)).limit(1);
  return Boolean(row?.driveModifiedAt && row.driveModifiedAt.getTime() >= new Date(file.modifiedTime).getTime());
}

async function isPwaCurrent(env: Env, file: DriveFile): Promise<boolean> {
  const [row] = await getDb(env).select({ driveModifiedAt: researchPwas.driveModifiedAt })
    .from(researchPwas).where(eq(researchPwas.driveFileId, file.id)).limit(1);
  return Boolean(row?.driveModifiedAt && row.driveModifiedAt.getTime() >= new Date(file.modifiedTime).getTime());
}

function base64UrlJson(value: unknown): string {
  return base64UrlBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function base64UrlBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/gu, "");
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0)).buffer;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isHtmlFile(file: Pick<DriveFile, "mimeType" | "name">): boolean {
  return file.mimeType === HTML_MIME || /\.html?$/iu.test(file.name);
}

function isProcessingLogFile(file: Pick<DriveFile, "name">): boolean {
  return /_processing_log\.json$/iu.test(file.name);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function optionalLogString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function requiredLogString(value: unknown, field: string, fileName: string): string {
  const resolved = optionalLogString(value)?.trim();
  if (!resolved) throw new Error(`${fileName} is missing required processing-log field ${field}.`);
  return resolved;
}

function parseLogTimestamp(value: unknown, fallback: string): Date {
  const date = new Date(typeof value === "string" ? value : fallback);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid processing-log timestamp: ${String(value)}`);
  return date;
}
