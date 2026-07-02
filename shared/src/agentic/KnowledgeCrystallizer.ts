import {PromptCatalog} from '@shared/ai/PromptCatalog';
import type {AiClient} from '@shared/ai/AiClient';
import type {AgentExecutionResult} from './AgentOrchestrator';

/**
 * Input used when transforming raw execution notes into an operating memo.
 */
export interface KnowledgeCrystallizerContext {
  goal: string;
  notes: string[];
  decisions: string[];
  risks?: string[];
  nextActions?: string[];
}

/**
 * Shared summarizer for converting noisy agent traces into reusable operating
 * guidance.
 */
export class KnowledgeCrystallizer {
  constructor(private readonly aiClient: AiClient) {}

  /**
   * Produces an operating memo from arbitrary notes and decisions.
   *
   * @param context Raw execution context.
   * @returns Concise memo suitable for docs, logs, or handoff notes.
   */
  crystallize(context: KnowledgeCrystallizerContext): string {
    return this.aiClient.generateText({
      systemInstruction: PromptCatalog.knowledgeCrystallizer,
      prompt: [
        `Goal: ${context.goal}`,
        'Notes:',
        ...context.notes.map((note) => `- ${note}`),
        'Decisions:',
        ...context.decisions.map((decision) => `- ${decision}`),
        'Risks:',
        ...(context.risks?.length ? context.risks.map((risk) => `- ${risk}`) : ['- No explicit risks supplied.']),
        'Next Actions:',
        ...(context.nextActions?.length ? context.nextActions.map((action) => `- ${action}`) : ['- No explicit next actions supplied.']),
        'Return a concise operating memo with sections for Summary, Reusable Pattern, Risks, and Next Actions.'
      ].join('\n')
    });
  }

  /**
   * Summarizes a structured agent execution result.
   *
   * @param executionResult Result returned from the shared agent orchestrator.
   * @returns Distilled memo for the execution run.
   */
  crystallizeExecution(executionResult: AgentExecutionResult): string {
    return this.crystallize({
      goal: executionResult.goal,
      notes: [
        `Plan: ${executionResult.planText}`,
        ...executionResult.steps.map(
          (step) => `Step "${step.title}" with prompt "${step.prompt}" produced response: ${step.response}`
        )
      ],
      decisions: executionResult.steps.map((step) => `Keep step "${step.title}" result available for downstream operators.`),
      nextActions: ['Persist durable findings into project docs or memory if the user explicitly requests it.']
    });
  }
}
