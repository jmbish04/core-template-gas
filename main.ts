const DEFAULT_WORKER_BASE_URL = "https://core-gsuite-tools.hacolby.workers.dev";
const DEFAULT_AUTH_HEADER_NAME = "Authorization";

declare global {
  interface Window {
    [key: string]: unknown;
  }
}

export function buildCoreGsuiteToolsUrl(baseUrl: string, pathname: string): string {
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${trimmedBase}${normalizedPath}`;
}

export function buildWorkerHeaders(apiKey?: string, headerName = DEFAULT_AUTH_HEADER_NAME): Record<string, string> {
  if (!apiKey) {
    return {};
  }

  if (headerName.toLowerCase() === "authorization") {
    return { Authorization: `Bearer ${apiKey}` };
  }

  return { [headerName]: apiKey };
}

function getScriptProperty(name: string, fallback = ""): string {
  return PropertiesService.getScriptProperties().getProperty(name) ?? fallback;
}

function workerBaseUrl(): string {
  return getScriptProperty("CORE_GSUITE_TOOLS_BASE_URL", DEFAULT_WORKER_BASE_URL);
}

function workerHeaders(): Record<string, string> {
  const apiKey = getScriptProperty("CORE_GSUITE_TOOLS_API_KEY");
  const headerName = getScriptProperty("CORE_GSUITE_TOOLS_API_KEY_HEADER", DEFAULT_AUTH_HEADER_NAME);
  return buildWorkerHeaders(apiKey, headerName);
}

function workerAccount(): string {
  return getScriptProperty("CORE_GSUITE_TOOLS_ACCOUNT");
}

function requestJson(pathname: string, method: GoogleAppsScript.URL_Fetch.HttpMethod, payload?: Record<string, unknown>): unknown {
  const body = workerAccount() ? { ...(payload ?? {}), account: workerAccount() } : payload;
  const response = UrlFetchApp.fetch(buildCoreGsuiteToolsUrl(workerBaseUrl(), pathname), {
    method,
    headers: workerHeaders(),
    contentType: "application/json",
    payload: body ? JSON.stringify(body) : undefined,
    muteHttpExceptions: true,
  });
  const text = response.getContentText();

  if (response.getResponseCode() >= 400) {
    throw new Error(`Worker request failed (${response.getResponseCode()}): ${text}`);
  }

  return JSON.parse(text);
}

function pingCoreGsuiteTools(): unknown {
  return requestJson("/api/health", "get");
}

function searchWorkerGmail(query: string, maxResults = 10): unknown {
  return requestJson("/api/gmail/search", "post", { query, maxResults });
}

function readWorkerSheet(spreadsheetId: string, range: string): unknown {
  const encodedId = encodeURIComponent(spreadsheetId);
  const encodedRange = encodeURIComponent(range);
  return requestJson(`/api/sheets/${encodedId}/read?range=${encodedRange}${workerAccount() ? `&account=${encodeURIComponent(workerAccount())}` : ""}`, "get");
}

function queryWorkerD1(database: string, sql: string, params: unknown[] = []): unknown {
  return requestJson("/api/cloudflare/d1/query", "post", { database, sql, params });
}

function getWorkerKv(namespace: string, key: string): unknown {
  return requestJson("/api/cloudflare/kv/get", "post", { namespace, key });
}

function putWorkerKv(namespace: string, key: string, value: string): unknown {
  return requestJson("/api/cloudflare/kv/put", "post", { namespace, key, value });
}

const callableExports = {
  pingCoreGsuiteTools,
  searchWorkerGmail,
  readWorkerSheet,
  queryWorkerD1,
  getWorkerKv,
  putWorkerKv,
};

Object.assign(globalThis as Record<string, unknown>, callableExports);
