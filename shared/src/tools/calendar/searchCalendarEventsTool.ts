import type {AiToolDefinition} from '@shared/ai/Types';
import {CalendarService} from '@shared/workspace/CalendarService';

/**
 * Tool definition for searching Google Calendar events in a date window.
 */
export const searchCalendarEventsTool: AiToolDefinition = {
  name: 'calendar_search_events',
  description: 'Search Google Calendar events within a date range and optional text query.',
  inputSchema: {
    type: 'object',
    properties: {
      start: {type: 'string', description: 'Start date in yyyy-MM-dd or ISO datetime format.'},
      end: {type: 'string', description: 'End date in yyyy-MM-dd or ISO datetime format.'},
      search: {type: 'string', description: 'Optional free-text event search term.'},
      calendarId: {type: 'string', description: 'Optional target calendar ID; defaults to the primary calendar.'}
    },
    required: ['start', 'end']
  },
  execute: (args) =>
    CalendarService.searchEvents({
      start: String(args.start),
      end: String(args.end),
      search: typeof args.search === 'string' ? args.search : undefined,
      calendarId: typeof args.calendarId === 'string' ? args.calendarId : undefined
    })
};
