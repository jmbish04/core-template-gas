import type {AiToolDefinition} from '@shared/ai/Types';
import {DriveServiceHelper} from '@shared/workspace/DriveService';

/**
 * Tool definition for Drive file search.
 */
export const searchDriveFilesTool: AiToolDefinition = {
  name: 'drive_search_files',
  description: 'Search Google Drive using a DriveApp query string.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {type: 'string', description: 'DriveApp query string such as `title contains "invoice" and trashed = false`.'},
      limit: {type: 'number', description: 'Maximum number of files to return.'}
    },
    required: ['query']
  },
  execute: (args) => DriveServiceHelper.searchFiles(String(args.query), typeof args.limit === 'number' ? args.limit : 100)
};
