/**
 * Structured Gmail helpers used by both direct project code and shared tools.
 */

/**
 * Lightweight attachment metadata returned from Gmail reads.
 */
export interface GmailAttachmentDescriptor {
  filename: string;
  mimeType: string;
  size: number;
}

/**
 * Structured Gmail message representation designed for tool responses.
 */
export interface GmailMessageSummary {
  messageId: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  attachments: GmailAttachmentDescriptor[];
}

/**
 * Input used when drafting or sending a Gmail message with optional attachments.
 */
export interface GmailOutgoingMessage {
  to: string;
  subject: string;
  body: string;
  attachmentFileIds?: string[];
}

/**
 * Input used when drafting a reply to an existing Gmail message.
 */
export interface GmailReplyDraftRequest {
  messageId: string;
  replyMessage: string;
  attachmentFileIds?: string[];
}

/**
 * Input used when applying labels to an existing thread.
 */
export interface GmailLabelRequest {
  threadId: string;
  labels: string[];
}

/**
 * Rich Gmail service translated from the referenced JS examples into typed,
 * reusable repository infrastructure.
 */
export class GmailServiceHelper {
  /**
   * Sends a plain-text Gmail message immediately.
   *
   * @param to Recipient email address.
   * @param subject Message subject line.
   * @param body Plain-text message body.
   */
  static sendPlainTextEmail(to: string, subject: string, body: string): void {
    GmailApp.sendEmail(to, subject, body);
  }

  /**
   * Sends a plain-text Gmail message with Drive-file attachments.
   *
   * @param message Outgoing message payload.
   * @returns Human-readable confirmation message.
   */
  static sendMessage(message: GmailOutgoingMessage): string {
    const attachments = (message.attachmentFileIds ?? []).map((fileId) => DriveApp.getFileById(fileId).getBlob());
    if (attachments.length) {
      GmailApp.sendEmail(message.to, message.subject, message.body, {attachments});
    } else {
      GmailApp.sendEmail(message.to, message.subject, message.body);
    }
    return `Sent Gmail message to "${message.to}" with subject "${message.subject}".`;
  }

  /**
   * Searches Gmail threads and returns flattened message summaries.
   *
   * @param query Standard Gmail search query.
   * @param limit Maximum number of threads to scan.
   * @returns Flattened list of structured message summaries.
   */
  static search(query: string, limit = 10): GmailMessageSummary[] {
    const threads = GmailApp.search(query, 0, limit);
    return threads.flatMap((thread) => this.summarizeThread(thread));
  }

  /**
   * Returns recent messages using an `after:` Gmail query filter.
   *
   * @param afterDate Optional cutoff date. Defaults to 30 minutes ago.
   * @param excludedMessageIds Message IDs to omit when polling repeatedly.
   * @param limit Maximum number of threads to read.
   * @returns Recent Gmail messages that survived the filter.
   */
  static getMessagesByTime(afterDate?: Date, excludedMessageIds: string[] = [], limit = 25): GmailMessageSummary[] {
    const afterUnix = Math.floor((afterDate?.getTime() ?? Date.now() - 30 * 60 * 1000) / 1000);
    return this.search(`after:${afterUnix}`, limit).filter(
      (message) => !excludedMessageIds.includes(message.messageId)
    );
  }

  /**
   * Exports message attachments into Drive and returns metadata for the newly
   * created Drive files.
   *
   * @param messageId Gmail message identifier.
   * @returns Descriptors for Drive files created from the attachments.
   */
  static exportAttachmentsToDrive(messageId: string): Array<{fileId: string; filename: string; mimeType: string}> {
    const attachments = GmailApp.getMessageById(messageId).getAttachments();
    return attachments.map((attachment) => {
      const file = DriveApp.createFile(
        Utilities.newBlob(attachment.getBytes(), attachment.getContentType(), attachment.getName())
      );
      return {
        fileId: file.getId(),
        filename: file.getName(),
        mimeType: file.getMimeType()
      };
    });
  }

  /**
   * Adds one or more user labels to an existing Gmail thread.
   *
   * @param request Thread identifier and label names to apply.
   * @returns Summary of the labels that were attached.
   */
  static addLabels(request: GmailLabelRequest): string {
    const thread = GmailApp.getThreadById(request.threadId);
    const labelsByName = GmailApp.getUserLabels().reduce<Record<string, GoogleAppsScript.Gmail.GmailLabel>>(
      (accumulator, label) => {
        accumulator[label.getName()] = label;
        return accumulator;
      },
      {}
    );

    const applied = request.labels.filter((labelName) => {
      const label = labelsByName[labelName];
      if (!label) {
        return false;
      }

      thread.addLabel(label);
      return true;
    });

    return applied.length
      ? `Applied labels "${applied.join(', ')}" to thread ${request.threadId}.`
      : `No matching labels were found for thread ${request.threadId}.`;
  }

  /**
   * Creates a draft reply on an existing Gmail message.
   *
   * @param request Reply draft request.
   * @returns Draft identifier and search URL for the thread.
   */
  static createReplyDraft(request: GmailReplyDraftRequest): {draftId: string; searchUrl: string} {
    const message = GmailApp.getMessageById(request.messageId);
    const attachments = (request.attachmentFileIds ?? []).map((fileId) => DriveApp.getFileById(fileId).getBlob());
    const draft = attachments.length
      ? message.createDraftReply(request.replyMessage, {attachments})
      : message.createDraftReply(request.replyMessage);

    return {
      draftId: draft.getId(),
      searchUrl: `https://mail.google.com/mail/#search/rfc822msgid:${encodeURIComponent(message.getHeader('Message-ID'))}`
    };
  }

  /**
   * Creates a brand-new Gmail draft.
   *
   * @param message Draft payload.
   * @returns Newly created draft ID.
   */
  static createDraft(message: GmailOutgoingMessage): string {
    const attachments = (message.attachmentFileIds ?? []).map((fileId) => DriveApp.getFileById(fileId).getBlob());
    const draft = attachments.length
      ? GmailApp.createDraft(message.to, message.subject, message.body, {attachments})
      : GmailApp.createDraft(message.to, message.subject, message.body);
    return draft.getId();
  }

  /**
   * Moves threads to trash.
   *
   * @param threadIds Thread identifiers to trash.
   * @returns Count of trashed threads.
   */
  static trashThreads(threadIds: string[]): number {
    threadIds.forEach((threadId) => GmailApp.getThreadById(threadId).moveToTrash());
    return threadIds.length;
  }

  /**
   * Summarizes a Gmail thread into per-message DTOs.
   *
   * @param thread Raw Gmail thread object.
   * @returns Structured message summaries.
   */
  private static summarizeThread(thread: GoogleAppsScript.Gmail.GmailThread): GmailMessageSummary[] {
    return thread.getMessages().map((message) => ({
      messageId: message.getId(),
      threadId: thread.getId(),
      subject: message.getSubject(),
      from: message.getFrom(),
      to: message.getTo(),
      date: message.getDate().toISOString(),
      body: message.getPlainBody().trim(),
      attachments: message.getAttachments().map((attachment) => ({
        filename: attachment.getName(),
        mimeType: attachment.getContentType(),
        size: attachment.getBytes().length
      }))
    }));
  }
}
