import {CloudflareClient} from '@shared/cloudflare/CloudflareClient';

export class VectorizeClient {
  constructor(private readonly client: CloudflareClient, private readonly indexName: string) {}

  query(payload: unknown): unknown {
    return this.client.request(`/accounts/${this.client.accountId}/vectorize/v2/indexes/${this.indexName}/query`, 'post', payload);
  }

  upsert(payload: unknown): unknown {
    return this.client.request(`/accounts/${this.client.accountId}/vectorize/v2/indexes/${this.indexName}/insert`, 'post', payload);
  }
}
