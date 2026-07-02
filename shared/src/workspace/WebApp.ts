export class WebAppHelper {
  static jsonResponse(payload: unknown): GoogleAppsScript.Content.TextOutput {
    return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
  }

  static htmlResponse(fileName: string, title?: string): GoogleAppsScript.HTML.HtmlOutput {
    const output = HtmlService.createHtmlOutputFromFile(fileName);
    return title ? output.setTitle(title) : output;
  }
}
