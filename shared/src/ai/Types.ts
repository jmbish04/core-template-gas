/**
 * AI and tool type definitions used across providers, registries, and agentic
 * orchestration layers.
 */

/**
 * Supported model-provider identifiers.
 */
export type AiProvider = 'openai' | 'anthropic' | 'gemini' | 'workers-ai';

/**
 * JSON Schema property types supported by the shared tool definition surface.
 */
export type AiToolSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';

/**
 * Minimal JSON schema property descriptor that is expressive enough for the
 * repository's Apps Script tool definitions without becoming a full validator
 * implementation.
 */
export interface AiToolSchemaProperty {
  type: AiToolSchemaType;
  description: string;
  enum?: string[];
  items?: AiToolSchemaProperty;
  properties?: Record<string, AiToolSchemaProperty>;
}

/**
 * Input schema published to providers that support function or tool calling.
 */
export interface AiToolInputSchema {
  type: 'object';
  description?: string;
  properties: Record<string, AiToolSchemaProperty>;
  required?: string[];
  oneOf?: Array<{required: string[]}>;
  additionalProperties?: boolean;
}

/**
 * Executable tool definition used by the AI client and tool registry.
 */
export interface AiToolDefinition {
  name: string;
  description: string;
  inputSchema: AiToolInputSchema;
  execute: (argumentsJson: Record<string, unknown>) => unknown;
}

/**
 * Construction options for the provider-agnostic AI client.
 */
export interface AiClientOptions {
  provider: AiProvider;
  apiKey: string;
  model: string;
  accountId?: string;
  gatewayBaseUrl?: string;
  defaultSystemInstruction?: string;
  maxToolIterations?: number;
}

/**
 * Text-generation input shared across all supported model providers.
 */
export interface GenerateTextInput {
  systemInstruction?: string;
  prompt: string;
  tools?: AiToolDefinition[];
  temperature?: number;
}

/**
 * Declarative field definition used by structured-response generation.
 */
export interface StructuredField {
  name: string;
  required?: boolean;
  description: string;
}
