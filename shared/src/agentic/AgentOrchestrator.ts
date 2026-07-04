import {PromptCatalog} from '@shared/ai/PromptCatalog';
import type {AiClient} from '@shared/ai/AiClient';
import type {AiToolDefinition} from '@shared/ai/Types';

/**
 * Single unit of planned work for a repository agent.
 */
export interface AgentPlanStep {
  title: string;
  prompt: string;
  successSignal?: string;
}

/**
 * Input used to draft a plan from an objective and optional context.
 */
export interface AgentPlanningRequest {
  goal: string;
  contextLines?: string[];
  maxSteps?: number;
}

/**
 * Result for a single executed step.
 */
export interface AgentStepExecution {
  title: string;
  prompt: string;
  response: string;
  successSignal?: string;
}

/**
 * Top-level result returned by orchestrated agent runs.
 */
export interface AgentExecutionResult {
  goal: string;
  planText: string;
  steps: AgentStepExecution[];
}

/**
 * Agent orchestrator that coordinates planning and execution prompts while
 * keeping tool wiring and prompt discipline in one reusable place.
 */
export class AgentOrchestrator {
  constructor(private readonly aiClient: AiClient, private readonly tools: AiToolDefinition[] = []) {}

  /**
   * Drafts a compact execution plan for a goal.
   *
   * @param request Planning request.
   * @returns Provider-generated plan text.
   */
  buildPlan(request: AgentPlanningRequest): string {
    const contextLines = [
      ...(request.contextLines ?? []),
      `Maximum suggested steps: ${request.maxSteps ?? 5}`
    ];
    return this.aiClient.generatePlan(request.goal, contextLines, this.tools);
  }

  /**
   * Executes a list of already-determined plan steps.
   *
   * @param goal Goal shared by every step.
   * @param steps Ordered step list.
   * @returns Per-step responses suitable for UI rendering or persistence.
   */
  runPlan(goal: string, steps: AgentPlanStep[]): AgentStepExecution[] {
    return steps.map((step) => ({
      title: step.title,
      prompt: step.prompt,
      successSignal: step.successSignal,
      response: this.aiClient.generateText({
        systemInstruction: `${PromptCatalog.agenticPlanner} ${PromptCatalog.workspaceOperator}`,
        prompt: [
          `Goal: ${goal}`,
          `Step: ${step.title}`,
          `Step Prompt: ${step.prompt}`,
          step.successSignal ? `Success Signal: ${step.successSignal}` : 'Success Signal: Complete the step and state observable outcomes.',
          'Use tools only when they materially reduce uncertainty or perform a concrete action.'
        ].join('\n'),
        tools: this.tools
      })
    }));
  }

  /**
   * Performs a lightweight end-to-end agent run by first drafting a plan and
   * then executing the provided explicit steps.
   *
   * @param request Planning request for the goal.
   * @param steps Concrete steps to execute after planning.
   * @returns Combined plan and execution result.
   */
  runGoal(request: AgentPlanningRequest, steps: AgentPlanStep[]): AgentExecutionResult {
    return {
      goal: request.goal,
      planText: this.buildPlan(request),
      steps: this.runPlan(request.goal, steps)
    };
  }
}
