import {AiClient} from '@shared/ai/AiClient';
import {PromptCatalog} from '@shared/ai/PromptCatalog';
import {WorkspaceToolRegistry} from '@shared/ai/ToolRegistry';
import type {AiProvider} from '@shared/ai/Types';
import {getOptionalScriptProperty, getRequiredScriptProperty} from '@shared/core/Properties';

const DEFAULT_MODEL_BY_PROVIDER: Record<AiProvider, string> = {
  openai: 'gpt-4.1-mini',
  anthropic: 'claude-3-5-sonnet-latest',
  gemini: 'gemini-2.5-pro',
  'workers-ai': '@cf/meta/llama-3.1-8b-instruct'
};

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

function parseBooleanFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function runWorkspaceAgent(prompt: string): string {
  const injectedAccountId = __PROJECT_RUNTIME_CONFIG__.cloudflare.accountId;
  const injectedGatewayId = __PROJECT_RUNTIME_CONFIG__.cloudflare.aiGatewayId;
  const provider = getOptionalScriptProperty('AI_PROVIDER', 'openai') as AiProvider;
  const model = getOptionalScriptProperty('AI_MODEL', DEFAULT_MODEL_BY_PROVIDER[provider]);
  const apiKey = getRequiredScriptProperty('AI_API_KEY');
  const accountId = getOptionalScriptProperty('CLOUDFLARE_ACCOUNT_ID', injectedAccountId);
  const gatewayBaseUrl = getOptionalScriptProperty('AI_GATEWAY_BASE_URL', '');
  const aiGatewayId = getOptionalScriptProperty('AI_GATEWAY_ID', injectedGatewayId);
  const useCloudflareGateway = parseBooleanFlag(
    getOptionalScriptProperty('AI_USE_CLOUDFLARE_GATEWAY', ''),
    Boolean(accountId && aiGatewayId)
  );

  const client = new AiClient({
    provider,
    model,
    apiKey,
    accountId: accountId || undefined,
    aiGatewayId: useCloudflareGateway ? aiGatewayId || undefined : undefined,
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
