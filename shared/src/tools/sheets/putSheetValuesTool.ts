import type {AiToolDefinition} from '@shared/ai/Types';
import {SheetsServiceHelper} from '@shared/workspace/SheetsService';

/**
 * Tool definition for writing values into Google Sheets.
 */
export const putSheetValuesTool: AiToolDefinition = {
  name: 'sheets_put_values',
  description: 'Write a two-dimensional matrix into a Google Sheet at a specific range or append location.',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {type: 'string', description: 'Spreadsheet ID.'},
      spreadsheetUrl: {type: 'string', description: 'Spreadsheet URL when ID is not available.'},
      sheetName: {type: 'string', description: 'Target sheet name.'},
      sheetId: {type: 'number', description: 'Target sheet ID.'},
      sheetIndex: {type: 'number', description: 'Target sheet index starting at 0.'},
      range: {type: 'string', description: 'Optional A1 range for the write.'},
      values: {type: 'array', description: 'Two-dimensional array of cell values.', items: {type: 'array', description: 'Row values.', items: {type: 'string', description: 'Cell value.'}}}
    },
    required: ['values'],
    oneOf: [{required: ['spreadsheetId', 'values']}, {required: ['spreadsheetUrl', 'values']}]
  },
  execute: (args) =>
    SheetsServiceHelper.putValues({
      spreadsheetId: typeof args.spreadsheetId === 'string' ? args.spreadsheetId : undefined,
      spreadsheetUrl: typeof args.spreadsheetUrl === 'string' ? args.spreadsheetUrl : undefined,
      sheetName: typeof args.sheetName === 'string' ? args.sheetName : undefined,
      sheetId: typeof args.sheetId === 'number' ? args.sheetId : undefined,
      sheetIndex: typeof args.sheetIndex === 'number' ? args.sheetIndex : undefined,
      range: typeof args.range === 'string' ? args.range : undefined,
      values: Array.isArray(args.values) ? (args.values as unknown[][]) : []
    })
};
