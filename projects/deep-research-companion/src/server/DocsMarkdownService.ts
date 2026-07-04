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
    const document = Docs!.Documents.get(documentId) as GoogleAppsScript.Docs.Schema.Document;
    const content = document.body?.content ?? [];
    const blocks: string[] = [];

    for (const element of content) {
      if (element.paragraph) {
        const block = this.serializeParagraph(element.paragraph);
        if (block) {
          blocks.push(block);
        }
      } else if (element.table) {
        const block = this.serializeTable(element.table);
        if (block) {
          blocks.push(block);
        }
      }
    }

    return blocks.filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  /**
   * Serializes a paragraph node into markdown.
   *
   * @param paragraph Docs API paragraph node.
   * @returns Markdown representation, or an empty string for non-text nodes.
   */
  private serializeParagraph(paragraph: GoogleAppsScript.Docs.Schema.Paragraph): string {
    const text = this.getTextFromElements(paragraph.elements ?? []);
    if (!text) {
      return '';
    }

    const style = paragraph.paragraphStyle?.namedStyleType ?? 'NORMAL_TEXT';
    const bullet = paragraph.bullet;
    if (bullet) {
      return `- ${text}`;
    }

    switch (style) {
      case 'TITLE':
        return `# ${text}`;
      case 'SUBTITLE':
        return `> ${text}`;
      case 'HEADING_1':
        return `# ${text}`;
      case 'HEADING_2':
        return `## ${text}`;
      case 'HEADING_3':
        return `### ${text}`;
      case 'HEADING_4':
        return `#### ${text}`;
      case 'HEADING_5':
        return `##### ${text}`;
      case 'HEADING_6':
        return `###### ${text}`;
      default:
        return text;
    }
  }

  /**
   * Serializes a Docs API table into a markdown table.
   *
   * @param table Docs API table node.
   * @returns Markdown table text.
   */
  private serializeTable(table: GoogleAppsScript.Docs.Schema.Table): string {
    const rows = table.tableRows ?? [];
    if (rows.length === 0) {
      return '';
    }

    const serializedRows = rows.map((row) =>
      (row.tableCells ?? []).map((cell) => {
        const content = cell.content ?? [];
        const parts: string[] = [];
        for (const element of content) {
          if (element.paragraph) {
            const value = this.serializeParagraph(element.paragraph).replace(/^#+\s+/u, '');
            if (value) {
              parts.push(value);
            }
          }
        }
        return parts.join(' ').replace(/\|/g, '\\|').trim();
      })
    );

    const header = serializedRows[0];
    const divider = header.map(() => '---');
    const bodyRows = serializedRows.slice(1);

    return [
      `| ${header.join(' | ')} |`,
      `| ${divider.join(' | ')} |`,
      ...bodyRows.map((row) => `| ${row.join(' | ')} |`)
    ].join('\n');
  }

  /**
   * Flattens paragraph elements into markdown-aware inline text.
   *
   * @param elements Docs API paragraph elements.
   * @returns Concatenated inline markdown string.
   */
  private getTextFromElements(elements: GoogleAppsScript.Docs.Schema.ParagraphElement[]): string {
    const parts: string[] = [];

    for (const element of elements) {
      const textRun = element.textRun;
      if (!textRun?.content) {
        continue;
      }

      const text = textRun.content.replace(/\n/g, '');
      if (!text) {
        continue;
      }

      const linkUrl = textRun.textStyle?.link?.url;
      const bold = Boolean(textRun.textStyle?.bold);
      const italic = Boolean(textRun.textStyle?.italic);
      const code = textRun.textStyle?.weightedFontFamily?.fontFamily === 'Courier New';
      let output = text;

      if (linkUrl) {
        output = `[${output}](${linkUrl})`;
      }
      if (code) {
        output = `\`${output}\``;
      }
      if (bold) {
        output = `**${output}**`;
      }
      if (italic) {
        output = `*${output}*`;
      }

      parts.push(output);
    }

    return parts.join('').trim();
  }
}
