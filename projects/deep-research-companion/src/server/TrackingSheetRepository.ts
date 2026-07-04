import {SheetsServiceHelper} from '@shared/workspace/SheetsService';
import type {ProcessedAssetRecord, ResearchAssetType} from './types';

/**
 * Repository wrapper around the tracking spreadsheet used by the monitoring
 * trigger.
 *
 * The imported standalone Apps Script stored all process state in the first
 * sheet of a generated spreadsheet. This class preserves that behavior while
 * centralizing schema upgrades, column normalization, and row writes so the
 * rest of the project can reason in typed records instead of raw grid arrays.
 */
export class TrackingSheetRepository {
  constructor(
    private readonly targetFolderId: string,
    private readonly trackingSheetPropertyName: string
  ) {}

  /**
   * Returns the tracking spreadsheet, creating it and moving it into the
   * target Drive folder on first use.
   *
   * The method also performs opportunistic schema repair when an older version
   * of the sheet exists without the `Type` or `Log File URL` columns.
   *
   * @returns The tracking spreadsheet that stores processed asset metadata.
   */
  getOrCreateSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
    const props = PropertiesService.getScriptProperties();
    const existingId = props.getProperty(this.trackingSheetPropertyName);

    let spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet | null = null;
    let shouldCreate = false;

    if (existingId) {
      try {
        spreadsheet = SpreadsheetApp.openById(existingId);
      } catch (error) {
        console.warn(`Tracking sheet ${existingId} could not be opened. Recreating. ${String(error)}`);
        shouldCreate = true;
      }
    } else {
      shouldCreate = true;
    }

    if (shouldCreate || !spreadsheet) {
      spreadsheet = SheetsServiceHelper.createSpreadsheetInFolder(
        'Gemini Deep Research - Format Logs',
        this.targetFolderId
      );

      const sheet = SheetsServiceHelper.getPrimarySheet(spreadsheet);
      sheet.appendRow(['Document ID', 'Title', 'URL', 'Type', 'Date Created', 'Date Processed', 'Log File URL']);
      sheet.getRange('A1:G1').setFontWeight('bold').setBackground('#f3f3f3');
      sheet.setFrozenRows(1);
      SheetsServiceHelper.setColumnWidths({spreadsheetId: spreadsheet.getId(), sheetIndex: 0}, {
        2: 250,
        3: 300,
        7: 300
      });
      props.setProperty(this.trackingSheetPropertyName, spreadsheet.getId());
      return spreadsheet;
    }

    this.ensureColumns(SheetsServiceHelper.getPrimarySheet(spreadsheet));
    return spreadsheet;
  }

  /**
   * Returns the primary sheet used for tracking.
   *
   * @returns The first worksheet in the tracking spreadsheet.
   */
  getSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    return SheetsServiceHelper.getPrimarySheet(this.getOrCreateSpreadsheet());
  }

  /**
   * Builds a set of file IDs already written to the tracking spreadsheet.
   *
   * @returns A set keyed by Drive file ID for duplicate detection.
   */
  getProcessedIds(): Set<string> {
    const values = SheetsServiceHelper.getDataRows({spreadsheetId: this.getOrCreateSpreadsheet().getId()}, 1);
    const processedIds = new Set<string>();

    for (let index = 1; index < values.length; index += 1) {
      const id = values[index]?.[0];
      if (id) {
        processedIds.add(String(id));
      }
    }

    return processedIds;
  }

  /**
   * Appends a successfully processed asset to the tracking sheet.
   *
   * @param record Structured record describing the asset lifecycle event.
   */
  appendRecord(record: ProcessedAssetRecord): void {
    this.getSheet().appendRow([
      record.fileId,
      record.name,
      record.url,
      record.type,
      record.dateCreated,
      record.dateProcessed,
      record.logFileUrl
    ]);
  }

  /**
   * Returns report rows created near the supplied timestamp. These rows are
   * used as candidate matches when uploading a PWA HTML export to the paired
   * Cloudflare worker.
   *
   * @param createdAt Anchor timestamp of the PWA file.
   * @param maxAgeMs Maximum absolute delta, in milliseconds, for a document to
   *   be considered a plausible sibling.
   * @returns Candidate report records sorted by proximity.
   */
  findNearbyReports(createdAt: Date, maxAgeMs = 1000 * 60 * 60 * 24 * 3): ProcessedAssetRecord[] {
    const values = SheetsServiceHelper.getDataRows({spreadsheetId: this.getOrCreateSpreadsheet().getId()}, 1);
    const matches: ProcessedAssetRecord[] = [];

    for (let index = 1; index < values.length; index += 1) {
      const row = values[index];
      if (!row || row[3] !== 'REPORT') {
        continue;
      }

      const candidateCreatedAt = this.parseSheetDate(row[4]);
      const processedAt = this.parseSheetDate(row[5]);
      if (!candidateCreatedAt || !processedAt) {
        console.warn(`Skipping invalid tracking row ${index + 1} while finding nearby reports.`);
        continue;
      }

      if (Math.abs(candidateCreatedAt.getTime() - createdAt.getTime()) > maxAgeMs) {
        continue;
      }

      matches.push({
        fileId: String(row[0]),
        name: String(row[1]),
        url: String(row[2]),
        type: row[3] as ResearchAssetType,
        dateCreated: candidateCreatedAt,
        dateProcessed: processedAt,
        logFileUrl: String(row[6] ?? '')
      });
    }

    return matches.sort(
      (left, right) =>
        Math.abs(left.dateCreated.getTime() - createdAt.getTime()) -
        Math.abs(right.dateCreated.getTime() - createdAt.getTime())
    );
  }

  /**
   * Ensures the primary worksheet contains the expected columns. This keeps
   * older spreadsheets forward-compatible with the modularized implementation.
   *
   * @param sheet Sheet to validate and patch in place.
   */
  private ensureColumns(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
    const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];

    if (headers.length >= 4 && headers[3] !== 'Type') {
      sheet.insertColumnBefore(4);
      sheet.getRange('D1').setValue('Type').setFontWeight('bold').setBackground('#f3f3f3');
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 4, lastRow - 1, 1).setValues(new Array(lastRow - 1).fill(['REPORT']));
      }
    }

    const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
    if (currentHeaders.length < 7 || currentHeaders[6] !== 'Log File URL') {
      const lastColumn = sheet.getLastColumn();
      if (lastColumn < 7) {
        sheet.insertColumnAfter(lastColumn || 1);
      }
      sheet.getRange('G1').setValue('Log File URL').setFontWeight('bold').setBackground('#f3f3f3');
      sheet.setColumnWidth(7, 300);
    }
  }

  /**
   * Converts a sheet cell value into a valid JavaScript date.
   *
   * @param value Cell value read from the tracking sheet.
   * @returns Parsed date, or `null` when the value is empty or invalid.
   */
  private parseSheetDate(value: unknown): Date | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
