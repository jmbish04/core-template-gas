import type {AiToolDefinition} from '@shared/ai/Types';
import {DriveServiceHelper} from '@shared/workspace/DriveService';

/**
 * Tool definition for renaming Drive files in bulk.
 */
export const renameDriveFilesTool: AiToolDefinition = {
  name: 'drive_rename_files',
  description: 'Rename one or more Google Drive files by file ID.',
  inputSchema: {
    type: 'object',
    properties: {
      fileUpdates: {
        type: 'array',
        description: 'Array of rename operations.',
        items: {
          type: 'object',
          description: 'Single file rename operation.',
          properties: {
            fileId: {type: 'string', description: 'Drive file ID to rename.'},
            newName: {type: 'string', description: 'New filename.'}
          }
        }
      }
    },
    required: ['fileUpdates']
  },
  execute: (args) =>
    DriveServiceHelper.renameFiles(
      Array.isArray(args.fileUpdates)
        ? args.fileUpdates.map((entry) => ({
            fileId: String((entry as Record<string, unknown>).fileId),
            newName: String((entry as Record<string, unknown>).newName)
          }))
        : []
    )
};
