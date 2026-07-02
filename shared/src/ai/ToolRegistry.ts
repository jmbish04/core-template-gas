import {DocsService} from '@shared/workspace/DocsService';
import {DriveServiceHelper} from '@shared/workspace/DriveService';
import {GmailServiceHelper} from '@shared/workspace/GmailService';
import {SheetsServiceHelper} from '@shared/workspace/SheetsService';
import type {AiToolDefinition} from './Types';

export class WorkspaceToolRegistry {
  all(): AiToolDefinition[] {
    return [
      {
        name: 'docs_create_document',
        description: 'Create a Google Doc with optional starter text.',
        parameters: {
          title: 'string',
          body: 'string'
        },
        execute: (args) =>
          DocsService.createDocument(
            String(args.title),
            typeof args.body === 'string' ? args.body : args.body ? JSON.stringify(args.body) : undefined
          )
      },
      {
        name: 'drive_create_text_file',
        description: 'Create a text file in Drive.',
        parameters: {
          name: 'string',
          content: 'string'
        },
        execute: (args) => DriveServiceHelper.createTextFile(String(args.name), String(args.content))
      },
      {
        name: 'gmail_search',
        description: 'Search Gmail threads.',
        parameters: {
          query: 'string',
          limit: 'number'
        },
        execute: (args) => GmailServiceHelper.search(String(args.query), Number(args.limit ?? 10))
      },
      {
        name: 'sheets_get_values',
        description: 'Read a rectangular range from a sheet.',
        parameters: {
          spreadsheetId: 'string',
          sheetName: 'string',
          a1Notation: 'string'
        },
        execute: (args) =>
          SheetsServiceHelper.getValues(String(args.spreadsheetId), String(args.sheetName), String(args.a1Notation))
      }
    ];
  }
}
