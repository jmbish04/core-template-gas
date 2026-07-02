import {PromptCatalog} from '@shared/ai/PromptCatalog';
import type {AiClient} from '@shared/ai/AiClient';

export class KnowledgeCrystallizer {
  constructor(private readonly aiClient: AiClient) {}

  crystallize(context: {goal: string; notes: string[]; decisions: string[]}): string {
    return this.aiClient.generateText({
      systemInstruction: PromptCatalog.knowledgeCrystallizer,
      prompt: [
        `Goal: ${context.goal}`,
        'Notes:',
        ...context.notes.map((note) => `- ${note}`),
        'Decisions:',
        ...context.decisions.map((decision) => `- ${decision}`),
        'Return a concise operating memo with sections for Summary, Reusable Pattern, Risks, and Next Actions.'
      ].join('\n')
    });
  }
}
