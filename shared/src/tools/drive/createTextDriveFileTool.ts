import type {AiToolDefinition} from '@shared/ai/Types';
import {DriveServiceHelper} from '@shared/workspace/DriveService';

/**
 * Tool definition for creating a text file in Drive.
 */
export const createTextDriveFileTool: AiToolDefinition = {
  name: 'drive_create_text_file',
  description: 'Create a plain-text file in Google Drive.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {type: 'string', description: 'Filename to create in Drive.'},
      content: {type: 'string', description: 'Plain-text file contents.'}
    },
    required: ['name', 'content']
  },
  execute: (args) => DriveServiceHelper.createTextFile(String(args.name), String(args.content))
};
