/**
 * Sends completion emails to the active Apps Script user.
 *
 * The original standalone script dispatched one styled email for each
 * processed export. Keeping this isolated makes it easy to replace with Gmail
 * drafts, Chat webhooks, or other notification sinks later.
 */
export class NotificationService {
  /**
   * Sends a completion email for a processed report or HTML export.
   *
   * @param file Drive file that completed processing.
   * @param typeLabel Asset kind used to tailor labels and iconography.
   */
  sendProcessedEmail(file: GoogleAppsScript.Drive.File, typeLabel: 'REPORT' | 'WEB_APP'): void {
    const userEmail = Session.getActiveUser().getEmail();
    const title = file.getName();
    const url = file.getUrl();
    const isWebApp = typeLabel === 'WEB_APP';
    const typeText = isWebApp ? 'Web App Export' : 'Deep Research Export';
    const iconUrl = isWebApp
      ? 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/HTML5_logo_and_wordmark.svg/120px-HTML5_logo_and_wordmark.svg.png'
      : 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Google_Docs_logo_%282014-2020%29.svg/120px-Google_Docs_logo_%282014-2020%29.svg.png';

    MailApp.sendEmail({
      to: userEmail,
      subject: `[Processed DR] ${title}`,
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #4285f4; padding: 20px; text-align: center; color: white;">
            <h2 style="margin: 0; font-weight: normal;">Processing Complete</h2>
          </div>
          <div style="padding: 20px; background-color: #f8f9fa;">
            <p style="margin-top: 0; color: #3c4043;">A new Gemini ${typeText} has been detected and successfully processed.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #dadce0; display: flex; align-items: center; margin: 25px 0; box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3);">
              <img src="${iconUrl}" width="35" height="${isWebApp ? '35' : '48'}" style="margin-right: 20px; flex-shrink: 0;" alt="File Icon" />
              <div style="overflow: hidden;">
                <h3 style="margin: 0 0 8px 0; color: #202124; font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</h3>
                <a href="${url}" style="color: #1a73e8; text-decoration: none; font-weight: bold; font-size: 14px;">Open File &rarr;</a>
              </div>
            </div>
            <p style="font-size: 12px; color: #5f6368; margin-bottom: 0; text-align: center;">Processed automatically by your Standalone Apps Script trigger.</p>
          </div>
        </div>
      `
    });
  }
}
