import type {AiToolDefinition} from '@shared/ai/Types';
import {DocsService} from '@shared/workspace/DocsService';

/**
 * Tool definition for reading a Google Doc as plain text or markdown.
 */
export const getGoogleDocContentTool: AiToolDefinition = {
  name: 'docs_read_document',
  description: 'Read a Google Doc as plain text or exported markdown.',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {type: 'string', description: 'Target Google Doc ID.'},
      documentUrl: {type: 'string', description: 'Target Google Doc URL when ID is not available.'},
      format: {type: 'string', description: 'Export format. Supported values: txt or markdown.', enum: ['txt', 'markdown']}
    },
    oneOf: [{required: ['documentId']}, {required: ['documentUrl']}]
  },
  execute: (args) =>
    DocsService.readDocument({
      documentId: typeof args.documentId === 'string' ? args.documentId : undefined,
      documentUrl: typeof args.documentUrl === 'string' ? args.documentUrl : undefined,
      format: args.format === 'markdown' ? 'markdown' : 'txt'
    })
};
