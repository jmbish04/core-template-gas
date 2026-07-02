/**
 * Helper utilities for Web App and HTML-service responses.
 */
export class WebAppHelper {
  /**
   * Creates a JSON HTTP response.
   *
   * @param payload Serializable response payload.
   * @returns ContentService JSON output.
   */
  static jsonResponse(payload: unknown): GoogleAppsScript.Content.TextOutput {
    return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
  }

  /**
   * Creates an HTML response directly from a file.
   *
   * @param fileName HTML file in the Apps Script project.
   * @param title Optional browser window title.
   * @returns HTML output object.
   */
  static htmlResponse(fileName: string, title?: string): GoogleAppsScript.HTML.HtmlOutput {
    const output = HtmlService.createHtmlOutputFromFile(fileName);
    return title ? output.setTitle(title) : output;
  }

  /**
   * Renders an evaluated HTML template with injected data.
   *
   * @param fileName HTML template filename.
   * @param templateData Values assigned onto the template before evaluation.
   * @param title Optional browser window title.
   * @returns Evaluated HTML output.
   */
  static templateResponse(
    fileName: string,
    templateData: Record<string, unknown> = {},
    title?: string
  ): GoogleAppsScript.HTML.HtmlOutput {
    const template = HtmlService.createTemplateFromFile(fileName);
    Object.assign(template, templateData);
    const output = template.evaluate();
    return title ? output.setTitle(title) : output;
  }
}
