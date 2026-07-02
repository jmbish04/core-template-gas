export type AiProvider = 'openai' | 'anthropic' | 'gemini' | 'workers-ai';

export interface AiToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (argumentsJson: Record<string, unknown>) => unknown;
}

export interface AiClientOptions {
  provider: AiProvider;
  apiKey: string;
  model: string;
  gatewayBaseUrl?: string;
  defaultSystemInstruction?: string;
}

export interface GenerateTextInput {
  systemInstruction?: string;
  prompt: string;
  tools?: AiToolDefinition[];
  temperature?: number;
}

export interface StructuredField {
  name: string;
  required?: boolean;
  description: string;
}
