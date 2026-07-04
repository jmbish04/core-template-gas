import {HttpClient} from '@shared/core/HttpClient';

export interface CoreGsuiteToolsConfig {
  apiKey?: string;
  apiKeyHeaderName?: string;
  baseUrl?: string;
  defaultAccount?: string;
}

export interface RequestOptions {
  account?: string;
  method?: GoogleAppsScript.URL_Fetch.HttpMethod;
  payload?: Record<string, unknown> | undefined;
  query?: Record<string, string | number | boolean | undefined>;
}

export class CoreGsuiteToolsClient {
  constructor(private readonly config: CoreGsuiteToolsConfig = {}) {}

  get baseUrl(): string {
    return (this.config.baseUrl ?? 'https://core-gsuite-tools.hacolby.workers.dev').replace(/\/+$/, '');
  }

  get cloudflare(): CoreGsuiteToolsCloudflareProxy {
    return new CoreGsuiteToolsCloudflareProxy(this);
  }

  get gmail(): CoreGsuiteToolsGmailProxy {
    return new CoreGsuiteToolsGmailProxy(this);
  }

  get docs(): CoreGsuiteToolsDocsProxy {
    return new CoreGsuiteToolsDocsProxy(this);
  }

  get sheets(): CoreGsuiteToolsSheetsProxy {
    return new CoreGsuiteToolsSheetsProxy(this);
  }

  get drive(): CoreGsuiteToolsDriveProxy {
    return new CoreGsuiteToolsDriveProxy(this);
  }

  get appsScript(): CoreGsuiteToolsAppsScriptProxy {
    return new CoreGsuiteToolsAppsScriptProxy(this);
  }

  health<T>(): T {
    return this.request<T>('/api/health');
  }

  openApi<T>(): T {
    return this.request<T>('/openapi.json');
  }

  request<T>(pathname: string, options: RequestOptions = {}): T {
    const query = new URLSearchParams();
    const headers = this.buildHeaders();

    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) {
        query.set(key, String(value));
      }
    }

    const url = `${this.baseUrl}${pathname}${query.size > 0 ? `?${query.toString()}` : ''}`;
    const payload = this.withAccount(options.payload, options.account);

    return HttpClient.requestJson<T>(url, {
      method: options.method ?? 'get',
      headers,
      payload: payload ? JSON.stringify(payload) : undefined
    });
  }

  private buildHeaders(): Record<string, string> {
    if (!this.config.apiKey) {
      return {};
    }

    const headerName = this.config.apiKeyHeaderName ?? 'Authorization';
    if (headerName.toLowerCase() === 'authorization') {
      return {Authorization: `Bearer ${this.config.apiKey}`};
    }

    return {[headerName]: this.config.apiKey};
  }

  private withAccount(
    payload: Record<string, unknown> | undefined,
    explicitAccount?: string
  ): Record<string, unknown> | undefined {
    const account = explicitAccount ?? this.config.defaultAccount;
    if (!account) {
      return payload;
    }

    return {
      ...(payload ?? {}),
      account
    };
  }
}

export interface CloudflareInvocationOptions {
  account?: string;
}

export interface WorkspaceInvocationOptions {
  account?: string;
}

export class CoreGsuiteToolsCloudflareProxy {
  constructor(private readonly client: CoreGsuiteToolsClient) {}

  invoke<T>(
    resource: string,
    action: string,
    payload: Record<string, unknown> = {},
    options: CloudflareInvocationOptions = {}
  ): T {
    return this.client.request<T>(`/api/cloudflare/${resource}/${action}`, {
      method: 'post',
      payload,
      account: options.account
    });
  }

  queryD1<T>(
    database: string,
    sql: string,
    params: unknown[] = [],
    options: CloudflareInvocationOptions = {}
  ): T {
    return this.invoke<T>('d1', 'query', {database, sql, params}, options);
  }

  getKv<T>(namespace: string, key: string, options: CloudflareInvocationOptions = {}): T {
    return this.invoke<T>('kv', 'get', {namespace, key}, options);
  }

  putKv<T>(namespace: string, key: string, value: string, options: CloudflareInvocationOptions = {}): T {
    return this.invoke<T>('kv', 'put', {namespace, key, value}, options);
  }

  deleteKv<T>(namespace: string, key: string, options: CloudflareInvocationOptions = {}): T {
    return this.invoke<T>('kv', 'delete', {namespace, key}, options);
  }

  listKvKeys<T>(namespace: string, prefix?: string, options: CloudflareInvocationOptions = {}): T {
    return this.invoke<T>('kv', 'list', {namespace, prefix}, options);
  }

  listImages<T>(options: CloudflareInvocationOptions = {}): T {
    return this.invoke<T>('images', 'list', {}, options);
  }

  vectorizeQuery<T>(index: string, query: Record<string, unknown>, options: CloudflareInvocationOptions = {}): T {
    return this.invoke<T>('vectorize', 'query', {index, ...query}, options);
  }

  vectorizeInsert<T>(index: string, payload: Record<string, unknown>, options: CloudflareInvocationOptions = {}): T {
    return this.invoke<T>('vectorize', 'insert', {index, ...payload}, options);
  }

  runWorkersAi<T>(model: string, input: unknown, options: CloudflareInvocationOptions = {}): T {
    return this.invoke<T>('workers-ai', 'run', {model, input}, options);
  }

  getAiGatewayUrl<T>(
    gateway: string,
    provider: string,
    options: CloudflareInvocationOptions = {}
  ): T {
    return this.invoke<T>('ai-gateway', 'url', {gateway, provider}, options);
  }
}

export class CoreGsuiteToolsGmailProxy {
  constructor(private readonly client: CoreGsuiteToolsClient) {}

  search<T>(query: string, maxResults = 10, options: WorkspaceInvocationOptions = {}): T {
    return this.client.request<T>('/api/gmail/search', {
      method: 'post',
      payload: {query, maxResults},
      account: options.account
    });
  }

  send<T>(
    to: string,
    subject: string,
    body: string,
    options: WorkspaceInvocationOptions & {cc?: string; bcc?: string; html?: boolean} = {}
  ): T {
    return this.client.request<T>('/api/gmail/send', {
      method: 'post',
      payload: {to, subject, body, cc: options.cc, bcc: options.bcc, html: options.html},
      account: options.account
    });
  }

  labels<T>(options: WorkspaceInvocationOptions = {}): T {
    return this.client.request<T>('/api/gmail/labels', {
      query: {account: options.account}
    });
  }
}

export class CoreGsuiteToolsDocsProxy {
  constructor(private readonly client: CoreGsuiteToolsClient) {}

  create<T>(name: string, html?: string, parentFolderId?: string, options: WorkspaceInvocationOptions = {}): T {
    return this.client.request<T>('/api/docs/create', {
      method: 'post',
      payload: {name, html, parentFolderId},
      account: options.account
    });
  }

  read<T>(id: string, options: WorkspaceInvocationOptions = {}): T {
    return this.client.request<T>(`/api/docs/${encodeURIComponent(id)}/read`, {
      query: {account: options.account}
    });
  }

  append<T>(id: string, text: string, options: WorkspaceInvocationOptions = {}): T {
    return this.client.request<T>(`/api/docs/${encodeURIComponent(id)}/append`, {
      method: 'post',
      payload: {text},
      account: options.account
    });
  }
}

export class CoreGsuiteToolsSheetsProxy {
  constructor(private readonly client: CoreGsuiteToolsClient) {}

  create<T>(title: string, options: WorkspaceInvocationOptions = {}): T {
    return this.client.request<T>('/api/sheets/create', {
      method: 'post',
      payload: {title},
      account: options.account
    });
  }

  list<T>(options: WorkspaceInvocationOptions = {}): T {
    return this.client.request<T>('/api/sheets/list', {
      query: {account: options.account}
    });
  }

  read<T>(id: string, range: string, options: WorkspaceInvocationOptions = {}): T {
    return this.client.request<T>(`/api/sheets/${encodeURIComponent(id)}/read`, {
      query: {range, account: options.account}
    });
  }

  write<T>(id: string, range: string, values: unknown[][], options: WorkspaceInvocationOptions = {}): T {
    return this.client.request<T>(`/api/sheets/${encodeURIComponent(id)}/write`, {
      method: 'post',
      payload: {range, values},
      account: options.account
    });
  }

  append<T>(id: string, range: string, values: unknown[][], options: WorkspaceInvocationOptions = {}): T {
    return this.client.request<T>(`/api/sheets/${encodeURIComponent(id)}/append`, {
      method: 'post',
      payload: {range, values},
      account: options.account
    });
  }
}

export class CoreGsuiteToolsDriveProxy {
  constructor(private readonly client: CoreGsuiteToolsClient) {}

  files<T>(options: WorkspaceInvocationOptions & {q?: string; pageSize?: number} = {}): T {
    return this.client.request<T>('/api/drive/files', {
      query: {q: options.q, pageSize: options.pageSize, account: options.account}
    });
  }

  search<T>(query: string, options: WorkspaceInvocationOptions & {pageSize?: number} = {}): T {
    return this.client.request<T>('/api/drive/search', {
      query: {query, pageSize: options.pageSize, account: options.account}
    });
  }

  recent<T>(options: WorkspaceInvocationOptions & {pageSize?: number} = {}): T {
    return this.client.request<T>('/api/drive/recent', {
      query: {pageSize: options.pageSize, account: options.account}
    });
  }
}

export class CoreGsuiteToolsAppsScriptProxy {
  constructor(private readonly client: CoreGsuiteToolsClient) {}

  projects<T>(options: WorkspaceInvocationOptions = {}): T {
    return this.client.request<T>('/api/appscript/projects', {
      query: {account: options.account}
    });
  }

  standalone<T>(title: string, options: WorkspaceInvocationOptions = {}): T {
    return this.client.request<T>('/api/appscript/standalone', {
      method: 'post',
      payload: {title},
      account: options.account
    });
  }

  run<T>(
    id: string,
    functionName: string,
    parameters: unknown[] = [],
    options: WorkspaceInvocationOptions = {}
  ): T {
    return this.client.request<T>(`/api/appscript/${encodeURIComponent(id)}/run`, {
      method: 'post',
      payload: {functionName, parameters},
      account: options.account
    });
  }
}
