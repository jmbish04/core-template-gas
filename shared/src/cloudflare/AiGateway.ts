export type AiGatewayProvider = 'openai' | 'anthropic' | 'google' | 'workers-ai';

export interface AiGatewayConfig {
  accountId: string;
  gatewayId: string;
  provider: AiGatewayProvider;
}

export function getAiGatewayBaseUrl(config: AiGatewayConfig): string {
  void config.provider;
  return `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/ai/v1`;
}

export function getAiGatewayHeaders(config: Pick<AiGatewayConfig, 'gatewayId'>): Record<string, string> {
  return {
    'cf-aig-gateway-id': config.gatewayId
  };
}
