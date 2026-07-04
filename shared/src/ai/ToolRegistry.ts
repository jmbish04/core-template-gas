import type {AiToolDefinition} from './Types';
import {
  appendGoogleDocTextTool,
  appendSheetRowTool,
  createCalendarEventTool,
  createGmailReplyDraftTool,
  createGoogleDocTool,
  createQuizFormTool,
  createSlidesPresentationTool,
  createSurveyFormTool,
  createTextDriveFileTool,
  downloadGmailAttachmentsTool,
  getGoogleDocContentTool,
  getSheetValuesTool,
  putSheetValuesTool,
  renameDriveFilesTool,
  searchCalendarEventsTool,
  searchDriveFilesTool,
  searchGmailMessagesTool,
  sendGmailMessageTool
} from '@shared/tools/index';

/**
 * Category names exposed by the workspace tool registry.
 */
export type WorkspaceToolCategory =
  | 'calendar'
  | 'docs'
  | 'drive'
  | 'forms'
  | 'gmail'
  | 'sheets'
  | 'slides'
  | 'all';

/**
 * Registry that exposes both category-specific and aggregate tool sets.
 */
export class WorkspaceToolRegistry {
  /**
   * Returns every shared tool currently registered.
   *
   * @returns Flat array of all shared tool definitions.
   */
  all(): AiToolDefinition[] {
    return [
      ...this.calendar(),
      ...this.docs(),
      ...this.drive(),
      ...this.forms(),
      ...this.gmail(),
      ...this.sheets(),
      ...this.slides()
    ];
  }

  /**
   * Returns tools for a specific category.
   *
   * @param category Logical tool category.
   * @returns Tools associated with the category.
   */
  forCategory(category: WorkspaceToolCategory): AiToolDefinition[] {
    switch (category) {
      case 'calendar':
        return this.calendar();
      case 'docs':
        return this.docs();
      case 'drive':
        return this.drive();
      case 'forms':
        return this.forms();
      case 'gmail':
        return this.gmail();
      case 'sheets':
        return this.sheets();
      case 'slides':
        return this.slides();
      case 'all':
      default:
        return this.all();
    }
  }

  /**
   * Calendar tools.
   */
  calendar(): AiToolDefinition[] {
    return [searchCalendarEventsTool, createCalendarEventTool];
  }

  /**
   * Google Docs tools.
   */
  docs(): AiToolDefinition[] {
    return [createGoogleDocTool, getGoogleDocContentTool, appendGoogleDocTextTool];
  }

  /**
   * Google Drive tools.
   */
  drive(): AiToolDefinition[] {
    return [createTextDriveFileTool, searchDriveFilesTool, renameDriveFilesTool];
  }

  /**
   * Google Forms tools.
   */
  forms(): AiToolDefinition[] {
    return [createSurveyFormTool, createQuizFormTool];
  }

  /**
   * Gmail tools.
   */
  gmail(): AiToolDefinition[] {
    return [searchGmailMessagesTool, downloadGmailAttachmentsTool, createGmailReplyDraftTool, sendGmailMessageTool];
  }

  /**
   * Google Sheets tools.
   */
  sheets(): AiToolDefinition[] {
    return [getSheetValuesTool, putSheetValuesTool, appendSheetRowTool];
  }

  /**
   * Google Slides tools.
   */
  slides(): AiToolDefinition[] {
    return [createSlidesPresentationTool];
  }
}
