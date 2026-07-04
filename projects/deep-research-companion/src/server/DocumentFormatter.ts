import type {DocumentProcessResult} from './types';

const PLAIN_TEXT_MIME = 'text/plain';

/**
 * Applies the imported Gemini Deep Research formatting rules to Google Docs.
 *
 * The formatter intentionally preserves the behavioral contract of the
 * original standalone Apps Script: standard page sizing, heading color rules,
 * callout styling, table normalization, pagination locks via the advanced Docs
 * API, and JSON processing logs written to Drive.
 */
export class DocumentFormatter {
  constructor(private readonly logFolderId: string) {}

  /**
   * Formats a Google Doc and writes a processing log to Drive.
   *
   * @param fileId Google Doc file ID to mutate.
   * @param fileName Human-readable document name used in logs.
   * @returns Status object containing success state and the Drive URL of the
   *   emitted processing log when available.
   */
  formatDocument(fileId: string, fileName: string): DocumentProcessResult {
    let documentHandle: GoogleAppsScript.Document.Document;

    try {
      documentHandle = DocumentApp.openById(fileId);
    } catch (error) {
      console.error(`[QC] Could not open document ${fileId}. ${String(error)}`);
      return {success: false, logUrl: 'N/A'};
    }

    const body = documentHandle.getBody();
    body.setPageWidth(612);
    body.setPageHeight(792);
    body.setMarginLeft(72);
    body.setMarginRight(72);
    body.setMarginTop(72);
    body.setMarginBottom(72);

    const availableWidth = body.getPageWidth() - body.getMarginLeft() - body.getMarginRight();
    const processingLog: Record<string, unknown> = {
      document_title: fileName,
      document_id: fileId,
      timestamp: new Date().toISOString(),
      elements: [] as unknown[],
      errors: [] as unknown[]
    };

    console.log(`[QC] Starting Hybrid Format for Doc ID: ${fileId}`);

    const paragraphs = body.getParagraphs();
    let isTopSection = true;
    let normalizedTopHeading = false;

    for (let index = 0; index < paragraphs.length; index += 1) {
      const paragraph = paragraphs[index];

      try {
        const heading = paragraph.getHeading();
        const originalText = paragraph.getText().trim();
        const text =
          !normalizedTopHeading && heading === DocumentApp.ParagraphHeading.HEADING1
            ? this.normalizeTopHeading(paragraph, originalText)
            : originalText;

        if (heading === DocumentApp.ParagraphHeading.HEADING1 && text !== '') {
          normalizedTopHeading = true;
        }

        if (text === '') {
          continue;
        }

        (processingLog.elements as unknown[]).push({
          index,
          type: 'Paragraph',
          snippet: `${text.substring(0, 50)}...`
        });

        paragraph.setSpacingBefore(14);
        paragraph.setSpacingAfter(14);

        if (isTopSection) {
          if (heading !== DocumentApp.ParagraphHeading.NORMAL) {
            paragraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
          } else if (text.startsWith('http://') || text.startsWith('https://')) {
            paragraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
          } else {
            isTopSection = false;
          }
        }

        const paragraphApi = paragraph as unknown as {
          setForegroundColor: (color: string) => void;
          setBackgroundColor: (color: string) => void;
          setBorder: (position: unknown, width: number, color: string, borderStyle: unknown) => void;
        };
        const attrs: Record<string, unknown> = {};
        let updateAttrs = false;

        if (heading === DocumentApp.ParagraphHeading.HEADING1) {
          paragraphApi.setForegroundColor('#1155cc');
          paragraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
          if (index > 0) {
            attrs.PAGE_BREAK_BEFORE = true;
            updateAttrs = true;
          }
        } else if (heading === DocumentApp.ParagraphHeading.HEADING2) {
          paragraphApi.setForegroundColor('#674ea7');
          paragraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
          if (index > 0) {
            attrs.PAGE_BREAK_BEFORE = true;
            updateAttrs = true;
          }
        } else if (heading === DocumentApp.ParagraphHeading.HEADING3) {
          paragraphApi.setForegroundColor('#38761d');
          paragraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        } else if (heading === DocumentApp.ParagraphHeading.HEADING4) {
          paragraphApi.setForegroundColor('#134f5c');
          paragraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        } else if (heading === DocumentApp.ParagraphHeading.NORMAL) {
          const lowerText = text.toLowerCase();
          if (
            lowerText.startsWith('note:') ||
            lowerText.startsWith('important:') ||
            lowerText.startsWith('pro tip:') ||
            lowerText.startsWith('key takeaway:') ||
            lowerText.startsWith('callout:')
          ) {
            paragraphApi.setBackgroundColor('#f3f3f3');
            paragraph.setIndentStart(36);
            paragraph.setIndentEnd(36);

            try {
              paragraphApi.setBorder('LEFT', 3, '#434343', 'SOLID');
            } catch (error) {
              console.warn(`[QC] Border positioning unsupported for element at index ${index}: ${String(error)}`);
            }
          }
        }

        if (updateAttrs) {
          paragraph.setAttributes(attrs as unknown as GoogleAppsScript.Document.Attribute);
        }
      } catch (error) {
        const snippet = paragraph.getText().substring(0, 40).replace(/\n/g, ' ');
        console.error(`[QC] Failed to format paragraph at index ${index}. ${String(error)}`);
        (processingLog.errors as unknown[]).push({
          element_type: 'Paragraph',
          index,
          error: String(error),
          snippet
        });
      }
    }

    const tables = body.getTables();
    for (let index = 0; index < tables.length; index += 1) {
      try {
        const table = tables[index];
        this.formatTableStyles(table, availableWidth);

        const parent = table.getParent();
        if (!parent) {
          continue;
        }

        (processingLog.elements as unknown[]).push({index, type: 'Table', rows: table.getNumRows()});

        let childIndex = parent.getChildIndex(table);
        if (childIndex > 0) {
          const previousSibling = parent.getChild(childIndex - 1);
          if (
            previousSibling.getType() !== DocumentApp.ElementType.PARAGRAPH ||
            previousSibling.asParagraph().getText().trim() !== ''
          ) {
            const before = (parent as unknown as {insertParagraph: (index: number, text: string) => GoogleAppsScript.Document.Paragraph}).insertParagraph(childIndex, '');
            before.setSpacingAfter(14);
          }
        }

        childIndex = parent.getChildIndex(table);
        if (childIndex < parent.getNumChildren() - 1) {
          const nextSibling = parent.getChild(childIndex + 1);
          if (nextSibling.getType() !== DocumentApp.ElementType.PARAGRAPH || nextSibling.asParagraph().getText().trim() !== '') {
            const after = (parent as unknown as {insertParagraph: (index: number, text: string) => GoogleAppsScript.Document.Paragraph}).insertParagraph(childIndex + 1, '');
            after.setSpacingBefore(14);
          }
        }
      } catch (error) {
        console.error(`[QC] Error formatting table at index ${index}. ${String(error)}`);
      }
    }

    try {
      documentHandle.saveAndClose();
    } catch (error) {
      console.error(`[QC] Fatal error saving document ${fileId}. ${String(error)}`);
      return {success: false, logUrl: 'N/A'};
    }

    this.applyPaginationLocksViaAdvancedApi(fileId, processingLog);

    let logUrl = 'N/A';
    try {
      const folder = DriveApp.getFolderById(this.logFolderId);
      const safeFileName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const file = folder.createFile(
        `${safeFileName}_processing_log.json`,
        JSON.stringify(processingLog, null, 2),
        PLAIN_TEXT_MIME
      );
      logUrl = file.getUrl();
    } catch (error) {
      console.error(`[QC] Failed to write processing log. ${String(error)}`);
    }

    return {success: true, logUrl};
  }

  /**
   * Normalizes all table styling in a document.
   *
   * @param table Table element to format.
   * @param availableWidth Maximum printable width after page margins.
   */
  private formatTableStyles(table: GoogleAppsScript.Document.Table, availableWidth: number): void {
    const rowCount = table.getNumRows();
    if (rowCount === 0) {
      return;
    }

    let maxColumns = 0;
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const row = table.getRow(rowIndex);
      maxColumns = Math.max(maxColumns, row.getNumCells());
      for (let cellIndex = 0; cellIndex < row.getNumCells(); cellIndex += 1) {
        row.getCell(cellIndex).setBackgroundColor('');
      }
    }

    const headerRow = table.getRow(0);
    for (let cellIndex = 0; cellIndex < headerRow.getNumCells(); cellIndex += 1) {
      const cell = headerRow.getCell(cellIndex);
      cell.setBackgroundColor('#0000ff');

      for (let childIndex = 0; childIndex < cell.getNumChildren(); childIndex += 1) {
        const child = cell.getChild(childIndex);
        if (child.getType() !== DocumentApp.ElementType.PARAGRAPH) {
          continue;
        }

        const paragraph = child.asParagraph();
        paragraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        const text = paragraph.editAsText();
        text.setForegroundColor('#ffffff');
        text.setBold(true);
      }
    }

    if (maxColumns > 0 && availableWidth > 0) {
      const columnWidth = availableWidth / maxColumns;
      for (let columnIndex = 0; columnIndex < maxColumns; columnIndex += 1) {
        try {
          table.setColumnWidth(columnIndex, columnWidth);
        } catch (error) {
          console.warn(`[QC] Could not set table width for column ${columnIndex}. ${String(error)}`);
        }
      }
    }
  }

  /**
   * Simplifies the first top-level H1 generated by Gemini.
   *
   * Gemini often prefixes the real title with an overly verbose framing clause.
   * When the first H1 contains a colon or semicolon, this method keeps the
   * right-hand segment and trims any leading one-letter word such as `A`.
   *
   * @param paragraph Heading paragraph being normalized in place.
   * @param text Existing heading text.
   * @returns The normalized heading text.
   */
  private normalizeTopHeading(paragraph: GoogleAppsScript.Document.Paragraph, text: string): string {
    const parts = text.split(/\s*[:;]\s*/u).map((part) => part.trim()).filter(Boolean);
    const selected = parts.length > 1 ? parts[parts.length - 1] : text;
    const normalized = selected.replace(/^[A-Za-z]\s+/u, '').trim();

    if (normalized && normalized !== text) {
      paragraph.editAsText().setText(normalized);
      return normalized;
    }

    return text;
  }

  /**
   * Uses the advanced Docs API to set keep-with-next and keep-lines-together
   * paragraph properties that are not exposed consistently via DocumentApp.
   *
   * @param documentId Document identifier to mutate.
   * @param processingLog Mutable processing log enriched with API outcomes.
   */
  private applyPaginationLocksViaAdvancedApi(documentId: string, processingLog: Record<string, unknown>): void {
    try {
      const documentStructure = Docs!.Documents.get(documentId) as GoogleAppsScript.Docs.Schema.Document;
      const content = documentStructure.body?.content ?? [];
      const requests: GoogleAppsScript.Docs.Schema.Request[] = [];

      for (let index = 0; index < content.length; index += 1) {
        const element = content[index];

        if (element.paragraph) {
          const styleType = element.paragraph.paragraphStyle?.namedStyleType;
          const shouldKeepWithNext =
            (styleType?.startsWith('HEADING_') && styleType !== 'HEADING_5' && styleType !== 'HEADING_6') ||
            Boolean(content[index + 1]?.table);

          if (shouldKeepWithNext) {
            requests.push({
              updateParagraphStyle: {
                paragraphStyle: {keepWithNext: true},
                fields: 'keepWithNext',
                range: {startIndex: element.startIndex, endIndex: element.endIndex}
              }
            });
          }
        }

        if (!element.table?.tableRows) {
          continue;
        }

        const rows = element.table.tableRows;
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
          const isLastRow = rowIndex === rows.length - 1;
          const cells = rows[rowIndex].tableCells ?? [];

          for (const cell of cells) {
            const cellContent = cell.content ?? [];
            for (const cellElement of cellContent) {
              if (!cellElement.paragraph) {
                continue;
              }

              const paragraphStyle: Record<string, boolean> = {keepLinesTogether: true};
              const fields = ['keepLinesTogether'];

              if (!isLastRow) {
                paragraphStyle.keepWithNext = true;
                fields.push('keepWithNext');
              }

              requests.push({
                updateParagraphStyle: {
                  paragraphStyle,
                  fields: fields.join(','),
                  range: {startIndex: cellElement.startIndex, endIndex: cellElement.endIndex}
                }
              });
            }
          }
        }
      }

      if (requests.length > 0) {
        Docs!.Documents.batchUpdate({requests}, documentId);
        (processingLog.elements as unknown[]).push({type: 'AdvancedAPI', status: 'Success', updates: requests.length});
      }
    } catch (error) {
      console.error(`[QC] Advanced API error. ${String(error)}`);
      (processingLog.errors as unknown[]).push({element_type: 'AdvancedAPI', error: String(error)});
    }
  }
}
