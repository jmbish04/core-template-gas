export class SheetsServiceHelper {
  static appendRow(spreadsheetId: string, sheetName: string, values: unknown[]): void {
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" was not found.`);
    }

    sheet.appendRow(values);
  }

  static getValues(spreadsheetId: string, sheetName: string, a1Notation: string): unknown[][] {
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" was not found.`);
    }

    return sheet.getRange(a1Notation).getValues();
  }
}
