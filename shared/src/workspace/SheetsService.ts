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
