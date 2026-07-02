export type AiGatewayProvider = 'openai' | 'anthropic' | 'google' | 'workers-ai';

export interface AiGatewayConfig {
  accountId: string;
  gatewayId: string;
  provider: AiGatewayProvider;
}

export function getAiGatewayBaseUrl(config: AiGatewayConfig): string {
  const providerPath = config.provider === 'google' ? 'google-ai-studio' : config.provider;
  return `https://gateway.ai.cloudflare.com/v1/${config.accountId}/${config.gatewayId}/${providerPath}`;
}
