/**
 * Rich Google Sheets helpers used throughout the shared Apps Script library.
 */

/**
 * Reference used to resolve a spreadsheet and optional target sheet.
 */
export interface SheetReference {
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  sheetName?: string;
  sheetId?: number;
  sheetIndex?: number;
}

/**
 * Input used when writing values into a Google Sheet.
 */
export interface SheetWriteRequest extends SheetReference {
  values: unknown[][];
  range?: string;
}

/**
 * Utility service for Google Sheets with stronger ergonomics than the initial
 * starter scaffold.
 */
export class SheetsServiceHelper {
  /**
   * Returns the first sheet in a spreadsheet, creating one when the
   * spreadsheet has somehow been left without worksheets.
   *
   * Callers that previously assumed sheet ID `0` should use this helper
   * instead, because Google Sheets does not guarantee that the first visible
   * worksheet retains a stable numeric ID.
   *
   * @param spreadsheet Open spreadsheet instance.
   * @returns The primary worksheet used by the caller.
   */
  static getPrimarySheet(
    spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
  ): GoogleAppsScript.Spreadsheet.Sheet {
    return spreadsheet.getSheets()[0] ?? spreadsheet.insertSheet('Sheet1');
  }

  /**
   * Creates a spreadsheet and moves its Drive file into a target folder.
   *
   * This is the shared pattern used by multi-project Apps Script automations
   * that create operational tracking spreadsheets alongside the data they
   * monitor.
   *
   * @param title Spreadsheet title shown in Drive and the Sheets editor.
   * @param folderId Drive folder that should own the spreadsheet file.
   * @returns The created spreadsheet after it has been moved.
   */
  static createSpreadsheetInFolder(
    title: string,
    folderId: string
  ): GoogleAppsScript.Spreadsheet.Spreadsheet {
    const spreadsheet = SpreadsheetApp.create(title);
    DriveApp.getFileById(spreadsheet.getId()).moveTo(DriveApp.getFolderById(folderId));
    return spreadsheet;
  }

  /**
   * Resolves a concrete `Sheet` from spreadsheet and sheet selectors.
   *
   * @param reference Spreadsheet and optional sheet locator.
   * @returns The resolved sheet object.
   */
  static resolveSheet(reference: SheetReference): GoogleAppsScript.Spreadsheet.Sheet {
    const spreadsheet = reference.spreadsheetId
      ? SpreadsheetApp.openById(reference.spreadsheetId)
      : reference.spreadsheetUrl
        ? SpreadsheetApp.openByUrl(reference.spreadsheetUrl)
        : null;

    if (!spreadsheet) {
      throw new Error('A spreadsheetId or spreadsheetUrl is required.');
    }

    if (reference.sheetName) {
      const namedSheet = spreadsheet.getSheetByName(reference.sheetName);
      if (!namedSheet) {
        throw new Error(`Sheet "${reference.sheetName}" was not found.`);
      }

      return namedSheet;
    }

    if (reference.sheetId !== undefined) {
      const sheet = spreadsheet.getSheetById(reference.sheetId);
      if (!sheet) {
        throw new Error(`Sheet ID "${reference.sheetId}" was not found.`);
      }

      return sheet;
    }

    const index = reference.sheetIndex ?? 0;
    const sheet = spreadsheet.getSheets()[index];
    if (!sheet) {
      throw new Error(`Sheet index ${index} was not found.`);
    }

    return sheet;
  }

  /**
   * Ensures a sheet's first row contains the supplied headers.
   *
   * Existing sheets are updated in place only when the first row differs from
   * the desired header set. This keeps operational spreadsheets forward
   * compatible without forcing callers to duplicate header-repair logic.
   *
   * @param reference Spreadsheet and sheet locator.
   * @param headers Ordered header labels that should occupy row 1.
   * @returns `true` when the header row was rewritten, otherwise `false`.
   */
  static ensureHeaderRow(reference: SheetReference, headers: string[]): boolean {
    const sheet = this.resolveSheet(reference);
    const existing = sheet
      .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length))
      .getDisplayValues()[0]
      .slice(0, headers.length);

    const needsUpdate =
      existing.length !== headers.length ||
      headers.some((header, index) => existing[index] !== header);

    if (!needsUpdate) {
      return false;
    }

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return true;
  }

  /**
   * Applies one or more column widths to a resolved sheet.
   *
   * @param reference Spreadsheet and sheet locator.
   * @param widths Mapping of 1-based column index to desired width in pixels.
   */
  static setColumnWidths(reference: SheetReference, widths: Record<number, number>): void {
    const sheet = this.resolveSheet(reference);
    for (const [columnIndex, width] of Object.entries(widths)) {
      sheet.setColumnWidth(Number(columnIndex), width);
    }
  }

  /**
   * Returns the raw data rows from a sheet after skipping a configurable
   * number of header rows.
   *
   * @param reference Spreadsheet and sheet locator.
   * @param headerRows Number of leading rows to exclude from the response.
   * @returns Remaining sheet rows as a two-dimensional array.
   */
  static getDataRows(reference: SheetReference, headerRows = 1): unknown[][] {
    const values = this.resolveSheet(reference).getDataRange().getValues();
    return values.slice(Math.max(headerRows, 0));
  }

  /**
   * Appends a single row to the end of a sheet.
   *
   * @param spreadsheetId Spreadsheet identifier.
   * @param sheetName Sheet name.
   * @param values Values appended as a new row.
   */
  static appendRow(spreadsheetId: string, sheetName: string, values: unknown[]): void {
    const sheet = this.resolveSheet({spreadsheetId, sheetName});
    sheet.appendRow(values);
  }

  /**
   * Reads raw sheet values from an A1 range.
   *
   * @param spreadsheetId Spreadsheet identifier.
   * @param sheetName Sheet name.
   * @param a1Notation Range to read.
   * @returns Raw values as a two-dimensional array.
   */
  static getValues(spreadsheetId: string, sheetName: string, a1Notation: string): unknown[][] {
    return this.resolveSheet({spreadsheetId, sheetName}).getRange(a1Notation).getValues();
  }

  /**
   * Reads display-formatted sheet values from either a specific range or the
   * entire data range when no A1 notation is provided.
   *
   * @param reference Spreadsheet and sheet locator.
   * @param range Optional A1 range.
   * @returns Display values for tool-friendly serialization.
   */
  static getDisplayValues(reference: SheetReference, range?: string): string[][] {
    const sheet = this.resolveSheet(reference);
    return range ? sheet.getRange(range).getDisplayValues() : sheet.getDataRange().getDisplayValues();
  }

  /**
   * Writes a two-dimensional matrix into a sheet.
   *
   * @param request Write request including range and values.
   * @returns A1 notation of the range that received the values.
   */
  static putValues(request: SheetWriteRequest): string {
    if (!request.values.length || !Array.isArray(request.values[0])) {
      throw new Error('Values must be a non-empty two-dimensional array.');
    }

    const sheet = this.resolveSheet(request);
    const range = request.range
      ? sheet.getRange(request.range).offset(0, 0, request.values.length, request.values[0].length)
      : sheet.getRange(sheet.getLastRow() + 1, 1, request.values.length, request.values[0].length);
    range.setValues(request.values);
    return range.getA1Notation();
  }

  /**
   * Clears a target range in a sheet.
   *
   * @param reference Spreadsheet and sheet locator.
   * @param range A1 range to clear.
   */
  static clearRange(reference: SheetReference, range: string): void {
    this.resolveSheet(reference).getRange(range).clearContent();
  }
}
