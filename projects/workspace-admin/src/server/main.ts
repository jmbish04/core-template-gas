import {AiClient} from '@shared/ai/AiClient';
import {PromptCatalog} from '@shared/ai/PromptCatalog';
import {WorkspaceToolRegistry} from '@shared/ai/ToolRegistry';
import {getOptionalScriptProperty, getRequiredScriptProperty} from '@shared/core/Properties';

function showAppSidebar(): void {
  const html = HtmlService.createHtmlOutputFromFile('Index').setTitle('Workspace Admin');
  SpreadsheetApp.getUi().showSidebar(html);
}

function onOpen(): void {
  SpreadsheetApp.getUi()
    .createMenu('Workspace Admin')
    .addItem('Open Control Panel', 'showAppSidebar')
    .addToUi();
}

function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('Workspace Admin');
}

function getBootstrapState() {
  return {
    project: 'workspace-admin',
    docsPath: '/docs',
    sharedCapabilities: ['workspace', 'cloudflare', 'ai', 'agentic'],
    workspaceTools: new WorkspaceToolRegistry().all().map((tool) => tool.name)
  };
}

function runWorkspaceAgent(prompt: string): string {
  const provider = getOptionalScriptProperty('AI_PROVIDER', 'openai') as 'openai' | 'anthropic' | 'gemini' | 'workers-ai';
  const model = getOptionalScriptProperty('AI_MODEL', provider === 'gemini' ? 'gemini-2.5-pro' : 'gpt-4.1-mini');
  const apiKey = getRequiredScriptProperty('AI_API_KEY');
  const gatewayBaseUrl = getOptionalScriptProperty('AI_GATEWAY_BASE_URL', '');

  const client = new AiClient({
    provider,
    model,
    apiKey,
    gatewayBaseUrl: gatewayBaseUrl || undefined,
    defaultSystemInstruction: `${PromptCatalog.workspaceOperator} ${PromptCatalog.cloudflareOperator}`
  });

  return client.generateText({
    prompt,
    tools: new WorkspaceToolRegistry().all()
  });
}

Object.assign(globalThis, {
  doGet,
  onOpen,
  showAppSidebar,
  getBootstrapState,
  runWorkspaceAgent
});

export {};
