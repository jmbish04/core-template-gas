/**
 * Rich, documented helpers for Google Docs operations used by shared tools and
 * individual Apps Script projects in this monorepo.
 */

/**
 * Identifies a Google Doc either by stable file ID or by canonical URL.
 */
export interface DocumentReference {
  documentId?: string;
  documentUrl?: string;
}

/**
 * Result returned when a document is created or resolved for callers that need
 * a portable identifier and a human-friendly URL.
 */
export interface DocumentDescriptor {
  id: string;
  url: string;
  title: string;
}

/**
 * Export format supported by the helper when reading a document through the
 * authenticated download endpoint.
 */
export type DocumentExportFormat = 'txt' | 'markdown';

/**
 * Reads the contents of a document either as plain text or exported markdown.
 */
export interface DocumentReadOptions extends DocumentReference {
  format?: DocumentExportFormat;
}

/**
 * Writes text into a document body. When `paragraphIndex` is omitted the text
 * is appended as a new paragraph; otherwise it is inserted into the target
 * paragraph.
 */
export interface DocumentWriteOptions extends DocumentReference {
  text: string;
  paragraphIndex?: number;
}

/**
 * Replace-text operation used for deterministic document edits.
 */
export interface DocumentReplaceTextOptions extends DocumentReference {
  searchPattern: string;
  replacement: string;
}

/**
 * Centralized Google Docs service.
 *
 * Best practices intentionally baked into this class:
 * - Callers can pass either `documentId` or `documentUrl`.
 * - Read and write methods validate required input before mutating a document.
 * - Responses return stable IDs and URLs so agentic workflows can chain safely.
 * - Markdown export uses the authenticated Docs export endpoint instead of
 *   trying to reconstruct markdown from rich document elements manually.
 */
export class DocsService {
  /**
   * Creates a new Google Doc and optionally seeds it with starter body text.
   *
   * @param title Human-readable title shown in Drive and the Docs editor.
   * @param body Optional initial body text appended as a paragraph.
   * @returns Portable descriptor for downstream workflows.
   */
  static createDocument(title: string, body?: string): DocumentDescriptor {
    const doc = DocumentApp.create(title);
    if (body) {
      doc.getBody().appendParagraph(body);
      doc.saveAndClose();
    }

    return {
      id: doc.getId(),
      url: doc.getUrl(),
      title: doc.getName()
    };
  }

  /**
   * Resolves an Apps Script `Document` object from either ID or URL.
   *
   * @param reference Document locator used by all service methods.
   * @returns Open document instance ready for additional operations.
   */
  static openDocument(reference: DocumentReference): GoogleAppsScript.Document.Document {
    if (reference.documentId) {
      return DocumentApp.openById(reference.documentId);
    }

    if (reference.documentUrl) {
      return DocumentApp.openByUrl(reference.documentUrl);
    }

    throw new Error('A documentId or documentUrl is required.');
  }

  /**
   * Reads a Google Doc as plain text or markdown.
   *
   * The markdown mode mirrors the export pattern used in the upstream
   * Apps Script examples the user referenced, but hides the raw URL details
   * behind a typed helper.
   *
   * @param options Read options including the document locator and format.
   * @returns Exported document content.
   */
  static readDocument(options: DocumentReadOptions): string {
    const document = this.openDocument(options);
    const format = options.format ?? 'txt';
    const response = UrlFetchApp.fetch(
      `https://docs.google.com/feeds/download/documents/export/Export?exportFormat=${format}&id=${encodeURIComponent(document.getId())}`,
      {
        headers: {authorization: `Bearer ${ScriptApp.getOAuthToken()}`},
        muteHttpExceptions: true
      }
    );

    const text = response.getContentText();
    if (response.getResponseCode() >= 400) {
      throw new Error(`Failed to export Google Doc ${document.getId()} as ${format}: ${text}`);
    }

    return text;
  }

  /**
   * Appends a new paragraph to the end of the document body.
   *
   * @param reference Document locator.
   * @param text Text content to append as its own paragraph.
   */
  static appendParagraph(reference: DocumentReference, text: string): void {
    const document = this.openDocument(reference);
    document.getBody().appendParagraph(text);
    document.saveAndClose();
  }

  /**
   * Inserts text into a specific paragraph or appends when no index is given.
   *
   * @param options Mutation options describing the target document and text.
   * @returns Human-readable summary describing the mutation.
   */
  static writeText(options: DocumentWriteOptions): string {
    const document = this.openDocument(options);
    const body = document.getBody();

    if (options.paragraphIndex === undefined || options.paragraphIndex < 0) {
      body.appendParagraph(options.text);
      document.saveAndClose();
      return 'Text was appended as a new paragraph.';
    }

    const target = body.getChild(options.paragraphIndex);
    if (target.getType() !== DocumentApp.ElementType.PARAGRAPH) {
      throw new Error(`Body child ${options.paragraphIndex} is not a paragraph and cannot accept inserted text.`);
    }

    target.asParagraph().insertText(0, options.text);
    document.saveAndClose();
    return `Text was inserted into paragraph ${options.paragraphIndex}.`;
  }

  /**
   * Replaces every occurrence of a search pattern in the document body.
   *
   * @param options Replacement options.
   * @returns Number of matching elements replaced.
   */
  static replaceText(options: DocumentReplaceTextOptions): number {
    const document = this.openDocument(options);
    const body = document.getBody();
    let replacedCount = 0;
    let found = body.findText(options.searchPattern);

    while (found) {
      const element = found.getElement().asText();
      element.replaceText(options.searchPattern, options.replacement);
      replacedCount += 1;
      found = body.findText(options.searchPattern, found);
    }

    document.saveAndClose();
    return replacedCount;
  }

  /**
   * Returns a stable descriptor for a document reference without mutating it.
   *
   * @param reference Document locator.
   * @returns Descriptor with ID, title, and URL for UI or tool responses.
   */
  static describeDocument(reference: DocumentReference): DocumentDescriptor {
    const document = this.openDocument(reference);
    return {
      id: document.getId(),
      title: document.getName(),
      url: document.getUrl()
    };
  }
}
