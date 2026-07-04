import {CloudflareClient} from '@shared/cloudflare/CloudflareClient';

export class D1Client {
  constructor(private readonly client: CloudflareClient, private readonly databaseId: string) {}

  query<T>(sql: string, params: unknown[] = []): T {
    return this.client.request<T>(`/accounts/${this.client.accountId}/d1/database/${this.databaseId}/query`, 'post', {
      sql,
      params
    });
  }
}
