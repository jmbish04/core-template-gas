export interface HttpRequestOptions {
  method?: GoogleAppsScript.URL_Fetch.HttpMethod;
  headers?: Record<string, string>;
  payload?: string;
  contentType?: string;
  muteHttpExceptions?: boolean;
}

export class HttpClient {
  static request(url: string, options: HttpRequestOptions = {}): GoogleAppsScript.URL_Fetch.HTTPResponse {
    return UrlFetchApp.fetch(url, {
      method: options.method ?? 'get',
      headers: options.headers ?? {},
      payload: options.payload,
      contentType: options.contentType ?? 'application/json',
      muteHttpExceptions: options.muteHttpExceptions ?? false
    });
  }

  static requestJson<T>(url: string, options: HttpRequestOptions = {}): T {
    const response = HttpClient.request(url, options);
    const body = response.getContentText();
    if (response.getResponseCode() >= 400) {
      throw new Error(`HTTP ${response.getResponseCode()} for ${url}: ${body}`);
    }

    if (!body.trim()) {
      return {} as T;
    }

    return JSON.parse(body) as T;
  }
}
