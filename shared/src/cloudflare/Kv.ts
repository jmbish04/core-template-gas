import {CloudflareClient} from '@shared/cloudflare/CloudflareClient';

export class KvClient {
  constructor(private readonly client: CloudflareClient, private readonly namespaceId: string) {}

  get(key: string): string {
    return this.client.requestRaw(
      `/accounts/${this.client.accountId}/storage/kv/namespaces/${this.namespaceId}/values/${encodeURIComponent(key)}`
    );
  }

  put(key: string, value: string): unknown {
    return this.client.request(
      `/accounts/${this.client.accountId}/storage/kv/namespaces/${this.namespaceId}/values/${encodeURIComponent(key)}`,
      'put',
      value
    );
  }
}
