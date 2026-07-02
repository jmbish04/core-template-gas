import type {AiToolDefinition} from '@shared/ai/Types';
import {SheetsServiceHelper} from '@shared/workspace/SheetsService';

/**
 * Tool definition for appending a row to Google Sheets.
 */
export const appendSheetRowTool: AiToolDefinition = {
  name: 'sheets_append_row',
  description: 'Append a single row to a Google Sheet.',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {type: 'string', description: 'Spreadsheet ID.'},
      sheetName: {type: 'string', description: 'Target sheet name.'},
      values: {type: 'array', description: 'Row values to append.', items: {type: 'string', description: 'Cell value.'}}
    },
    required: ['spreadsheetId', 'sheetName', 'values']
  },
  execute: (args) => {
    SheetsServiceHelper.appendRow(
      String(args.spreadsheetId),
      String(args.sheetName),
      Array.isArray(args.values) ? args.values : []
    );
    return 'Row appended successfully.';
  }
};
