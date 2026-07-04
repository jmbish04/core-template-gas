import {CloudflareClient} from '@shared/cloudflare/CloudflareClient';

export class WorkersAiClient {
  constructor(private readonly client: CloudflareClient) {}

  run(model: string, input: unknown): unknown {
    return this.client.request(`/accounts/${this.client.accountId}/ai/run/${model}`, 'post', input);
  }
}
