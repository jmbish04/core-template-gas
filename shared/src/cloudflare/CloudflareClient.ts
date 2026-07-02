import {HttpClient} from '@shared/core/HttpClient';

export interface CloudflareConfig {
  accountId: string;
  apiToken: string;
  email?: string;
  baseUrl?: string;
}

export class CloudflareClient {
  constructor(private readonly config: CloudflareConfig) {}

  get accountId(): string {
    return this.config.accountId;
  }

  request<T>(pathname: string, method: GoogleAppsScript.URL_Fetch.HttpMethod = 'get', body?: unknown): T {
    const baseUrl = this.config.baseUrl ?? 'https://api.cloudflare.com/client/v4';
    const payload =
      body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
    return HttpClient.requestJson<T>(`${baseUrl}${pathname}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.config.apiToken}`
      },
      payload,
      contentType: typeof body === 'string' ? 'text/plain' : 'application/json'
    });
  }
}
