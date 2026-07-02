import type {AiToolDefinition} from '@shared/ai/Types';
import {GmailServiceHelper} from '@shared/workspace/GmailService';

/**
 * Tool definition for creating a Gmail reply draft.
 */
export const createGmailReplyDraftTool: AiToolDefinition = {
  name: 'gmail_create_reply_draft',
  description: 'Create a Gmail draft reply on an existing message.',
  inputSchema: {
    type: 'object',
    properties: {
      messageId: {type: 'string', description: 'Gmail message ID to reply to.'},
      replyMessage: {type: 'string', description: 'Plain-text reply body.'},
      attachmentFileIds: {type: 'array', description: 'Optional Drive file IDs to attach.', items: {type: 'string', description: 'Drive file ID.'}}
    },
    required: ['messageId', 'replyMessage']
  },
  execute: (args) =>
    GmailServiceHelper.createReplyDraft({
      messageId: String(args.messageId),
      replyMessage: String(args.replyMessage),
      attachmentFileIds: Array.isArray(args.attachmentFileIds) ? args.attachmentFileIds.map(String) : undefined
    })
};
