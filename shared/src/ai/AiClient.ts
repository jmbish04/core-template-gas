import {HttpClient} from '@shared/core/HttpClient';
import {safeJsonParse} from '@shared/core/Json';
import {PromptCatalog} from './PromptCatalog';
import type {AiClientOptions, AiToolDefinition, GenerateTextInput, StructuredField} from './Types';

interface OpenAiToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
}

export class AiClient {
  constructor(private readonly options: AiClientOptions) {}

  generateText(input: GenerateTextInput): string {
    switch (this.options.provider) {
      case 'openai':
      case 'workers-ai':
        return this.invokeOpenAiCompatible(input);
      case 'anthropic':
        return this.invokeAnthropic(input);
      case 'gemini':
        return this.invokeGemini(input);
      default:
        throw new Error(`Unsupported provider: ${String(this.options.provider)}`);
    }
  }

  generateStructuredResponse(prompt: string, fields: StructuredField[], tools: AiToolDefinition[] = []): Record<string, unknown> {
    const schemaInstructions = fields
      .map((field) => `- ${field.name}${field.required ? ' (required)' : ''}: ${field.description}`)
      .join('\n');
    const response = this.generateText({
      prompt: `${prompt}\n\nReturn valid JSON with these fields:\n${schemaInstructions}`,
      tools,
      systemInstruction: PromptCatalog.workspaceOperator
    });

    const parsed = safeJsonParse<Record<string, unknown>>(response);
    for (const field of fields.filter((candidate) => candidate.required)) {
      if (!(field.name in parsed)) {
        throw new Error(`Structured response is missing required field "${field.name}".`);
      }
    }

    return parsed;
  }

  /**
   * Generates a compact execution plan using the repository's standard planner
   * framing so agentic callers do not have to rebuild the same prompt scaffold.
   *
   * @param goal Objective to decompose into observable work.
   * @param contextLines Supplemental context lines that constrain the plan.
   * @param tools Optional tool set the model can call while planning.
   * @returns Provider-generated plan text.
   */
  generatePlan(goal: string, contextLines: string[] = [], tools: AiToolDefinition[] = []): string {
    return this.generateText({
      systemInstruction: PromptCatalog.agenticPlanner,
      prompt: [
        `Goal: ${goal}`,
        'Context:',
        ...(contextLines.length ? contextLines.map((line) => `- ${line}`) : ['- No extra context supplied.']),
        'Return a concise plan with sections for Objective, Steps, Risks, and Completion Signal.'
      ].join('\n'),
      tools
    });
  }

  private invokeOpenAiCompatible(input: GenerateTextInput): string {
    const baseUrl = this.getOpenAiCompatibleBaseUrl();
    const messages: OpenAiMessage[] = [
      {
        role: 'system',
        content: input.systemInstruction ?? this.options.defaultSystemInstruction ?? PromptCatalog.workspaceOperator
      },
      {
        role: 'user',
        content: input.prompt
      }
    ];
    const payload: Record<string, unknown> = {
      model: this.options.model,
      temperature: input.temperature ?? 0.2,
      messages
    };

    if (input.tools?.length) {
      payload.tools = input.tools.map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema
        }
      }));
    }

    for (let iteration = 0; iteration < (this.options.maxToolIterations ?? 5); iteration += 1) {
      payload.messages = messages;
      const response = HttpClient.requestJson<{
        choices: Array<{
          message: {
            content?: string;
            tool_calls?: OpenAiToolCall[];
          };
        }>;
      }>(`${baseUrl}/chat/completions`, {
        method: 'post',
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`
        },
        payload: JSON.stringify(payload)
      });

      const message = response.choices[0]?.message;
      if (!message) {
        return '';
      }

      if (message.tool_calls?.length && input.tools?.length) {
        messages.push({
          role: 'assistant',
          content: message.content ?? '',
          tool_calls: message.tool_calls
        });

        for (const call of message.tool_calls) {
          const tool = input.tools.find((candidate) => candidate.name === call.function.name);
          if (!tool) {
            throw new Error(`Unknown tool requested by model: ${call.function.name}`);
          }

          const toolArgs = safeJsonParse<Record<string, unknown>>(call.function.arguments);
          const output = tool.execute(toolArgs);
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: typeof output === 'string' ? output : JSON.stringify(output)
          });
        }

        continue;
      }

      return message.content ?? '';
    }

    throw new Error('Tool-calling loop exceeded the maximum number of iterations.');
  }

  private invokeAnthropic(input: GenerateTextInput): string {
    const baseUrl = this.options.gatewayBaseUrl ?? 'https://api.anthropic.com/v1';
    const response = HttpClient.requestJson<{
      content: Array<{type: string; text?: string}>;
    }>(`${baseUrl}/messages`, {
      method: 'post',
      headers: {
        'x-api-key': this.options.apiKey,
        'anthropic-version': '2023-06-01'
      },
      payload: JSON.stringify({
        model: this.options.model,
        max_tokens: 2048,
        system: input.systemInstruction ?? this.options.defaultSystemInstruction ?? PromptCatalog.agenticPlanner,
        messages: [{role: 'user', content: input.prompt}]
      })
    });

    return response.content.find((part) => part.type === 'text')?.text ?? '';
  }

  private invokeGemini(input: GenerateTextInput): string {
    if (this.options.gatewayBaseUrl) {
      const response = HttpClient.requestJson<{
        choices: Array<{message: {content: string}}>;
      }>(`${this.options.gatewayBaseUrl}/chat/completions`, {
        method: 'post',
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`
        },
        payload: JSON.stringify({
          model: this.options.model,
          messages: [
            {
              role: 'system',
              content: input.systemInstruction ?? this.options.defaultSystemInstruction ?? PromptCatalog.workspaceOperator
            },
            {
              role: 'user',
              content: input.prompt
            }
          ]
        })
      });

      return response.choices[0]?.message.content ?? '';
    }

    const response = HttpClient.requestJson<{
      candidates: Array<{
        content?: {
          parts?: Array<{text?: string}>;
        };
      }>;
    }>(`https://generativelanguage.googleapis.com/v1beta/models/${this.options.model}:generateContent?key=${encodeURIComponent(this.options.apiKey)}`, {
      method: 'post',
      payload: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: input.systemInstruction ?? this.options.defaultSystemInstruction ?? PromptCatalog.workspaceOperator
            }
          ]
        },
        contents: [
          {
            parts: [
              {
                text: input.prompt
              }
            ]
          }
        ]
      })
    });

    return response.candidates[0]?.content?.parts?.map((part) => part.text ?? '').join('\n') ?? '';
  }

  private getOpenAiCompatibleBaseUrl(): string {
    if (this.options.gatewayBaseUrl) {
      return this.options.gatewayBaseUrl;
    }

    if (this.options.provider === 'workers-ai') {
      if (!this.options.accountId) {
        throw new Error('Workers AI requests require accountId when AI_GATEWAY_BASE_URL is not configured.');
      }

      return `https://api.cloudflare.com/client/v4/accounts/${this.options.accountId}/ai/v1`;
    }

    return 'https://api.openai.com/v1';
  }
}
