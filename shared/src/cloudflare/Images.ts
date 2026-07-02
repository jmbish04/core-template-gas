import {CloudflareClient} from '@shared/cloudflare/CloudflareClient';

export class ImagesClient {
  constructor(private readonly client: CloudflareClient) {}

  list(): unknown {
    return this.client.request(`/accounts/${this.client.accountId}/images/v1`);
  }
}
