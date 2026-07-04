import type {AiToolDefinition} from '@shared/ai/Types';
import {DocsService} from '@shared/workspace/DocsService';

/**
 * Tool definition for appending or inserting text into a Google Doc.
 */
export const appendGoogleDocTextTool: AiToolDefinition = {
  name: 'docs_write_text',
  description: 'Append a new paragraph to a Google Doc or insert text into an existing paragraph.',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {type: 'string', description: 'Target Google Doc ID.'},
      documentUrl: {type: 'string', description: 'Target Google Doc URL when ID is not available.'},
      text: {type: 'string', description: 'Text content to append or insert.'},
      paragraphIndex: {type: 'number', description: 'Optional paragraph index to insert into. Omit to append.'}
    },
    required: ['text'],
    oneOf: [{required: ['documentId', 'text']}, {required: ['documentUrl', 'text']}]
  },
  execute: (args) =>
    DocsService.writeText({
      documentId: typeof args.documentId === 'string' ? args.documentId : undefined,
      documentUrl: typeof args.documentUrl === 'string' ? args.documentUrl : undefined,
      text: String(args.text),
      paragraphIndex: typeof args.paragraphIndex === 'number' ? args.paragraphIndex : undefined
    })
};
