import type {AiToolDefinition} from '@shared/ai/Types';
import {DocsService} from '@shared/workspace/DocsService';

/**
 * Tool definition for creating a Google Doc.
 */
export const createGoogleDocTool: AiToolDefinition = {
  name: 'docs_create_document',
  description: 'Create a Google Doc with optional starter text.',
  inputSchema: {
    type: 'object',
    properties: {
      title: {type: 'string', description: 'Title for the new Google Doc.'},
      body: {type: 'string', description: 'Optional initial body text appended as the first paragraph.'}
    },
    required: ['title']
  },
  execute: (args) => DocsService.createDocument(String(args.title), typeof args.body === 'string' ? args.body : undefined)
};
