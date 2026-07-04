import {DocsService} from '@shared/workspace/DocsService';

/**
 * Converts Google Docs API document payloads into markdown suitable for
 * archival, summarization, and vector indexing.
 *
 * The serializer intentionally favors deterministic, conservative markdown
 * over perfect visual fidelity. The paired Cloudflare worker needs a stable
 * textual representation for embeddings and summarization, not a pixel-perfect
 * reconstruction of Google Docs formatting.
 */
export class DocsMarkdownService {
  /**
   * Reads a Google Doc through the advanced Docs API and serializes it to
   * markdown.
   *
   * @param documentId Google Doc file ID.
   * @returns Markdown text derived from the document body.
   */
  getMarkdown(documentId: string): string {
    return DocsService.readStructuredMarkdown({documentId});
  }
}
