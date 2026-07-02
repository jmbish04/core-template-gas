import type {AiToolDefinition} from '@shared/ai/Types';
import {GmailServiceHelper} from '@shared/workspace/GmailService';

/**
 * Tool definition for sending Gmail messages.
 */
export const sendGmailMessageTool: AiToolDefinition = {
  name: 'gmail_send_message',
  description: 'Send a plain-text Gmail message with optional Drive-file attachments.',
  inputSchema: {
    type: 'object',
    properties: {
      to: {type: 'string', description: 'Recipient email address.'},
      subject: {type: 'string', description: 'Email subject line.'},
      body: {type: 'string', description: 'Plain-text body.'},
      attachmentFileIds: {type: 'array', description: 'Optional Drive file IDs to attach.', items: {type: 'string', description: 'Drive file ID.'}}
    },
    required: ['to', 'subject', 'body']
  },
  execute: (args) =>
    GmailServiceHelper.sendMessage({
      to: String(args.to),
      subject: String(args.subject),
      body: String(args.body),
      attachmentFileIds: Array.isArray(args.attachmentFileIds) ? args.attachmentFileIds.map(String) : undefined
    })
};
