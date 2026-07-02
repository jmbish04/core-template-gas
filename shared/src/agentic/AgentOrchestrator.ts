import {PromptCatalog} from '@shared/ai/PromptCatalog';
import type {AiClient} from '@shared/ai/AiClient';
import type {AiToolDefinition} from '@shared/ai/Types';

export interface AgentPlanStep {
  title: string;
  prompt: string;
}

export class AgentOrchestrator {
  constructor(private readonly aiClient: AiClient, private readonly tools: AiToolDefinition[] = []) {}

  runPlan(goal: string, steps: AgentPlanStep[]): Array<{title: string; response: string}> {
    return steps.map((step) => ({
      title: step.title,
      response: this.aiClient.generateText({
        systemInstruction: `${PromptCatalog.agenticPlanner} ${PromptCatalog.workspaceOperator}`,
        prompt: `Goal: ${goal}\nStep: ${step.title}\n${step.prompt}`,
        tools: this.tools
      })
    }));
  }
}
