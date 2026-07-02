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
    return HttpClient.requestJson<T>(this.buildUrl(pathname), this.buildRequestOptions(method, body));
  }

  requestRaw(pathname: string, method: GoogleAppsScript.URL_Fetch.HttpMethod = 'get', body?: unknown): string {
    const response = HttpClient.request(this.buildUrl(pathname), this.buildRequestOptions(method, body));
    const responseBody = response.getContentText();
    if (response.getResponseCode() >= 400) {
      throw new Error(`HTTP ${response.getResponseCode()} for ${this.buildUrl(pathname)}: ${responseBody}`);
    }

    return responseBody;
  }

  private buildUrl(pathname: string): string {
    return `${this.config.baseUrl ?? 'https://api.cloudflare.com/client/v4'}${pathname}`;
  }

  private buildRequestOptions(
    method: GoogleAppsScript.URL_Fetch.HttpMethod,
    body?: unknown
  ): Parameters<typeof HttpClient.request>[1] {
    const payload = body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
    return {
      method,
      headers: {
        Authorization: `Bearer ${this.config.apiToken}`
      },
      payload,
      contentType: typeof body === 'string' ? 'text/plain' : 'application/json'
    };
  }
}
