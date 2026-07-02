import type {AiToolDefinition} from '@shared/ai/Types';
import {GmailServiceHelper} from '@shared/workspace/GmailService';

/**
 * Tool definition for exporting Gmail attachments into Drive.
 */
export const downloadGmailAttachmentsTool: AiToolDefinition = {
  name: 'gmail_export_attachments_to_drive',
  description: 'Export all attachments from a Gmail message into Google Drive.',
  inputSchema: {
    type: 'object',
    properties: {
      messageId: {type: 'string', description: 'Gmail message ID containing attachments.'}
    },
    required: ['messageId']
  },
  execute: (args) => GmailServiceHelper.exportAttachmentsToDrive(String(args.messageId))
};
