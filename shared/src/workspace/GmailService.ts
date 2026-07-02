export class GmailServiceHelper {
  static sendPlainTextEmail(to: string, subject: string, body: string): void {
    GmailApp.sendEmail(to, subject, body);
  }

  static search(query: string, limit = 10): Array<{id: string; firstMessageSubject: string}> {
    return GmailApp.search(query, 0, limit).map((thread) => ({
      id: thread.getId(),
      firstMessageSubject: thread.getFirstMessageSubject()
    }));
  }
}
