/**
 * Shared sidebar and in-editor UI helpers. These mirror the "main side" Apps
 * Script examples the user referenced, but expose a cleaner typed surface for
 * projects that need sidebars inside Sheets, Docs, or Slides.
 */

/**
 * Template data passed into an HTML file before rendering.
 */
export interface SidebarTemplateContext {
  [key: string]: unknown;
}

/**
 * Service for constructing and showing host-editor sidebars.
 */
export class SidebarUiService {
  /**
   * Creates an HTML output from a file and optionally injects template data and
   * a window title before it is displayed.
   *
   * @param fileName HTML file in the Apps Script project.
   * @param title Sidebar title.
   * @param templateData Optional template variables.
   * @returns Configured HTML output ready to be shown.
   */
  static createSidebarOutput(
    fileName: string,
    title: string,
    templateData: SidebarTemplateContext = {}
  ): GoogleAppsScript.HTML.HtmlOutput {
    const template = HtmlService.createTemplateFromFile(fileName);
    Object.assign(template, templateData);
    return template.evaluate().setTitle(title);
  }

  /**
   * Shows a sidebar inside a spreadsheet-bound project.
   *
   * @param fileName HTML file in the Apps Script project.
   * @param title Sidebar title.
   * @param templateData Optional template variables.
   */
  static showSpreadsheetSidebar(fileName: string, title: string, templateData: SidebarTemplateContext = {}): void {
    SpreadsheetApp.getUi().showSidebar(this.createSidebarOutput(fileName, title, templateData));
  }

  /**
   * Shows a sidebar inside a document-bound project.
   *
   * @param fileName HTML file in the Apps Script project.
   * @param title Sidebar title.
   * @param templateData Optional template variables.
   */
  static showDocumentSidebar(fileName: string, title: string, templateData: SidebarTemplateContext = {}): void {
    DocumentApp.getUi().showSidebar(this.createSidebarOutput(fileName, title, templateData));
  }

  /**
   * Shows a sidebar inside a slides-bound project.
   *
   * @param fileName HTML file in the Apps Script project.
   * @param title Sidebar title.
   * @param templateData Optional template variables.
   */
  static showSlidesSidebar(fileName: string, title: string, templateData: SidebarTemplateContext = {}): void {
    SlidesApp.getUi().showSidebar(this.createSidebarOutput(fileName, title, templateData));
  }
}
