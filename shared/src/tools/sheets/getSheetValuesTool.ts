import type {AiToolDefinition} from '@shared/ai/Types';
import {SheetsServiceHelper} from '@shared/workspace/SheetsService';

/**
 * Tool definition for reading values from Google Sheets.
 */
export const getSheetValuesTool: AiToolDefinition = {
  name: 'sheets_get_values',
  description: 'Read values from a Google Sheet using either a specific A1 range or the full data range.',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {type: 'string', description: 'Spreadsheet ID.'},
      spreadsheetUrl: {type: 'string', description: 'Spreadsheet URL when ID is not available.'},
      sheetName: {type: 'string', description: 'Target sheet name.'},
      sheetId: {type: 'number', description: 'Target sheet ID.'},
      sheetIndex: {type: 'number', description: 'Target sheet index starting at 0.'},
      range: {type: 'string', description: 'Optional A1 range to read.'}
    },
    oneOf: [{required: ['spreadsheetId']}, {required: ['spreadsheetUrl']}]
  },
  execute: (args) =>
    SheetsServiceHelper.getDisplayValues(
      {
        spreadsheetId: typeof args.spreadsheetId === 'string' ? args.spreadsheetId : undefined,
        spreadsheetUrl: typeof args.spreadsheetUrl === 'string' ? args.spreadsheetUrl : undefined,
        sheetName: typeof args.sheetName === 'string' ? args.sheetName : undefined,
        sheetId: typeof args.sheetId === 'number' ? args.sheetId : undefined,
        sheetIndex: typeof args.sheetIndex === 'number' ? args.sheetIndex : undefined
      },
      typeof args.range === 'string' ? args.range : undefined
    )
};
