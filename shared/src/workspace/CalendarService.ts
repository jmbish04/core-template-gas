/**
 * Shared Calendar service translated into typed repository primitives.
 */

/**
 * Structured event data returned by search and creation operations.
 */
export interface CalendarEventSummary {
  eventId: string;
  title: string;
  description: string;
  location: string;
  startTime: string;
  endTime: string;
}

/**
 * Input used when searching a calendar window.
 */
export interface CalendarSearchRequest {
  start: string;
  end: string;
  search?: string;
  calendarId?: string;
}

/**
 * Input used when creating a new event.
 */
export interface CalendarCreateRequest {
  startDatetime: string;
  endDatetime: string;
  title: string;
  description: string;
  location?: string;
  calendarId?: string;
}

/**
 * Central Calendar service.
 */
export class CalendarService {
  /**
   * Searches a Google Calendar window and returns normalized event summaries.
   *
   * @param request Search request.
   * @returns Matching events in a stable DTO shape.
   */
  static searchEvents(request: CalendarSearchRequest): CalendarEventSummary[] {
    const calendar = request.calendarId
      ? CalendarApp.getCalendarById(request.calendarId)
      : CalendarApp.getDefaultCalendar();
    const {startDate, endDate} = this.normalizeWindow(request.start, request.end);
    const events = calendar.getEvents(startDate, endDate, request.search ? {search: request.search} : {});
    const timeZone = calendar.getTimeZone();

    return events.map((event) => ({
      eventId: event.getId(),
      title: event.getTitle(),
      description: event.getDescription() || '',
      location: event.getLocation() || '',
      startTime: Utilities.formatDate(event.getStartTime(), timeZone, 'yyyy-MM-dd HH:mm:ss'),
      endTime: Utilities.formatDate(event.getEndTime(), timeZone, 'yyyy-MM-dd HH:mm:ss')
    }));
  }

  /**
   * Creates a new calendar event.
   *
   * @param request Event creation request.
   * @returns Summary of the created event.
   */
  static createEvent(request: CalendarCreateRequest): CalendarEventSummary {
    const calendar = request.calendarId
      ? CalendarApp.getCalendarById(request.calendarId)
      : CalendarApp.getDefaultCalendar();
    const timeZone = Session.getScriptTimeZone();
    const event = calendar.createEvent(
      request.title,
      Utilities.parseDate(request.startDatetime, timeZone, 'yyyy-MM-dd HH:mm:ss'),
      Utilities.parseDate(request.endDatetime, timeZone, 'yyyy-MM-dd HH:mm:ss'),
      {
        description: request.description,
        location: request.location ?? ''
      }
    );

    return {
      eventId: event.getId(),
      title: event.getTitle(),
      description: event.getDescription() || '',
      location: event.getLocation() || '',
      startTime: Utilities.formatDate(event.getStartTime(), calendar.getTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
      endTime: Utilities.formatDate(event.getEndTime(), calendar.getTimeZone(), 'yyyy-MM-dd HH:mm:ss')
    };
  }

  /**
   * Normalizes a start/end window so same-day inputs still produce a full-day
   * search and reversed inputs are corrected automatically.
   *
   * @param start Raw start value.
   * @param end Raw end value.
   * @returns Normalized date window.
   */
  private static normalizeWindow(start: string, end: string): {startDate: Date; endDate: Date} {
    let startDate = new Date(start);
    let endDate = new Date(end);

    if (startDate.getTime() === endDate.getTime()) {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() + 1);
    } else if (startDate.getTime() > endDate.getTime()) {
      [startDate, endDate] = [endDate, startDate];
    }

    return {startDate, endDate};
  }
}
