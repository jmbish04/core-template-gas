import type {AiToolDefinition} from '@shared/ai/Types';
import {GmailServiceHelper} from '@shared/workspace/GmailService';

/**
 * Tool definition for Gmail search.
 */
export const searchGmailMessagesTool: AiToolDefinition = {
  name: 'gmail_search_messages',
  description: 'Search Gmail and return structured message summaries.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {type: 'string', description: 'Standard Gmail search query.'},
      limit: {type: 'number', description: 'Maximum number of threads to inspect.'}
    },
    required: ['query']
  },
  execute: (args) => GmailServiceHelper.search(String(args.query), typeof args.limit === 'number' ? args.limit : 10)
};
