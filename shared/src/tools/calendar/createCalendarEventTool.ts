import type {AiToolDefinition} from '@shared/ai/Types';
import {CalendarService} from '@shared/workspace/CalendarService';

/**
 * Tool definition for creating a Google Calendar event.
 */
export const createCalendarEventTool: AiToolDefinition = {
  name: 'calendar_create_event',
  description: 'Create a Google Calendar event using explicit start and end datetimes.',
  inputSchema: {
    type: 'object',
    properties: {
      startDatetime: {type: 'string', description: 'Event start in yyyy-MM-dd HH:mm:ss format.'},
      endDatetime: {type: 'string', description: 'Event end in yyyy-MM-dd HH:mm:ss format.'},
      title: {type: 'string', description: 'Calendar event title.'},
      description: {type: 'string', description: 'Calendar event description.'},
      location: {type: 'string', description: 'Optional event location.'},
      calendarId: {type: 'string', description: 'Optional target calendar ID; defaults to the primary calendar.'}
    },
    required: ['startDatetime', 'endDatetime', 'title', 'description']
  },
  execute: (args) =>
    CalendarService.createEvent({
      startDatetime: String(args.startDatetime),
      endDatetime: String(args.endDatetime),
      title: String(args.title),
      description: String(args.description),
      location: typeof args.location === 'string' ? args.location : undefined,
      calendarId: typeof args.calendarId === 'string' ? args.calendarId : undefined
    })
};
