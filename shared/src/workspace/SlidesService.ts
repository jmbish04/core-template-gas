/**
 * Shared Google Slides helpers for creating editor-friendly presentations from
 * structured input. This does not attempt to mirror the full upstream Gemini
 * slide generator; instead it provides a stable typed substrate that projects
 * and agent tools can build on.
 */

/**
 * Slide spec used when constructing a deck from structured content.
 */
export interface SlideSpec {
  title: string;
  bullets?: string[];
  notes?: string;
}

/**
 * Summary returned after a presentation is created.
 */
export interface PresentationDescriptor {
  id: string;
  url: string;
  title: string;
  slideCount: number;
}

/**
 * Slides service.
 */
export class SlidesService {
  /**
   * Creates a new presentation deck from a list of slide specs.
   *
   * @param title Presentation title.
   * @param slides Structured slide content.
   * @returns Descriptor for the created deck.
   */
  static createPresentationFromOutline(title: string, slides: SlideSpec[]): PresentationDescriptor {
    const presentation = SlidesApp.create(title);
    const existingSlides = presentation.getSlides();
    if (existingSlides.length) {
      existingSlides[0].remove();
    }

    slides.forEach((slide) => this.appendSlide(presentation, slide));
    presentation.saveAndClose();

    return {
      id: presentation.getId(),
      url: presentation.getUrl(),
      title: presentation.getName(),
      slideCount: presentation.getSlides().length
    };
  }

  /**
   * Appends a single slide to an existing presentation.
   *
   * @param presentation Target presentation.
   * @param slide Structured slide spec.
   */
  static appendSlide(presentation: GoogleAppsScript.Slides.Presentation, slide: SlideSpec): void {
    const page = presentation.appendSlide(SlidesApp.PredefinedLayout.TITLE_AND_BODY);
    const shapes = page.getShapes();
    const titleShape = shapes[0];
    const bodyShape = shapes[1];
    titleShape.getText().setText(slide.title);
    bodyShape.getText().setText((slide.bullets ?? []).map((bullet) => `• ${bullet}`).join('\n'));

    if (slide.notes) {
      const notesSpeaker = page.getNotesPage().getSpeakerNotesShape();
      if (notesSpeaker) {
        notesSpeaker.getText().setText(slide.notes);
      }
    }
  }

  /**
   * Exports a presentation as a PDF file stored in Drive.
   *
   * @param presentationId Presentation identifier.
   * @param filename Optional destination filename.
   * @returns Created Drive file ID.
   */
  static exportPresentationAsPdf(presentationId: string, filename?: string): string {
    const response = UrlFetchApp.fetch(
      `https://docs.google.com/presentation/d/${encodeURIComponent(presentationId)}/export/pdf`,
      {
        headers: {authorization: `Bearer ${ScriptApp.getOAuthToken()}`}
      }
    );
    const blob = response.getBlob().setName(filename ?? `${presentationId}.pdf`);
    return DriveApp.createFile(blob).getId();
  }
}
