/**
 * Typed Google Forms service inspired by the referenced Apps Script examples,
 * but normalized for reuse across this repository.
 */

/**
 * Supported question kinds for form generation.
 */
export type FormQuestionKind =
  | 'text'
  | 'paragraph'
  | 'multipleChoice'
  | 'checkbox'
  | 'list'
  | 'scale';

/**
 * Declarative question specification used when generating forms or quizzes.
 */
export interface FormQuestionSpec {
  title: string;
  helpText?: string;
  required?: boolean;
  kind: FormQuestionKind;
  choices?: string[];
  lowerBound?: number;
  upperBound?: number;
  lowerLabel?: string;
  upperLabel?: string;
  correctChoiceIndex?: number;
}

/**
 * Lightweight descriptor for a newly created Google Form.
 */
export interface FormDescriptor {
  id: string;
  editUrl: string;
  publishedUrl: string;
  title: string;
}

/**
 * Shared Google Forms service.
 */
export class FormsService {
  /**
   * Creates a standard survey form.
   *
   * @param title Form title.
   * @param questions Declarative question list.
   * @returns Descriptor for the created form.
   */
  static createSurvey(title: string, questions: FormQuestionSpec[]): FormDescriptor {
    const form = FormApp.create(title);
    questions.forEach((question) => this.addQuestion(form, question, false));
    return this.describeForm(form);
  }

  /**
   * Creates a quiz form with question scoring metadata where applicable.
   *
   * @param title Quiz title.
   * @param questions Declarative question list.
   * @returns Descriptor for the created form.
   */
  static createQuiz(title: string, questions: FormQuestionSpec[]): FormDescriptor {
    const form = FormApp.create(title).setIsQuiz(true);
    questions.forEach((question) => this.addQuestion(form, question, true));
    return this.describeForm(form);
  }

  /**
   * Returns summarized responses for a Google Form.
   *
   * @param formId Google Form identifier.
   * @returns List of response records keyed by item title.
   */
  static getResponses(formId: string): Array<{responseId: string; submittedAt: string; answers: Record<string, string[]>}> {
    const form = FormApp.openById(formId);
    return form.getResponses().map((response) => ({
      responseId: response.getId(),
      submittedAt: response.getTimestamp().toISOString(),
      answers: response.getItemResponses().reduce<Record<string, string[]>>((accumulator, itemResponse) => {
        const rawResponse = itemResponse.getResponse();
        accumulator[itemResponse.getItem().getTitle()] = Array.isArray(rawResponse)
          ? rawResponse.flatMap((entry) => (Array.isArray(entry) ? entry.map(String) : [String(entry)]))
          : [String(rawResponse)];
        return accumulator;
      }, {})
    }));
  }

  /**
   * Adds a single question to a form according to the supplied specification.
   *
   * @param form Target form.
   * @param question Declarative question specification.
   * @param quizMode Whether quiz-specific scoring behavior should be enabled.
   */
  private static addQuestion(
    form: GoogleAppsScript.Forms.Form,
    question: FormQuestionSpec,
    quizMode: boolean
  ): void {
    switch (question.kind) {
      case 'text': {
        form.addTextItem().setTitle(question.title).setHelpText(question.helpText ?? '').setRequired(Boolean(question.required));
        return;
      }
      case 'paragraph': {
        form.addParagraphTextItem().setTitle(question.title).setHelpText(question.helpText ?? '').setRequired(Boolean(question.required));
        return;
      }
      case 'multipleChoice': {
        const item = form.addMultipleChoiceItem().setTitle(question.title).setHelpText(question.helpText ?? '').setRequired(Boolean(question.required));
        const choices = (question.choices ?? []).map((choice, index) =>
          quizMode ? item.createChoice(choice, index === question.correctChoiceIndex) : item.createChoice(choice)
        );
        item.setChoices(choices);
        return;
      }
      case 'checkbox': {
        const item = form.addCheckboxItem().setTitle(question.title).setHelpText(question.helpText ?? '').setRequired(Boolean(question.required));
        item.setChoiceValues(question.choices ?? []);
        return;
      }
      case 'list': {
        const item = form.addListItem().setTitle(question.title).setHelpText(question.helpText ?? '').setRequired(Boolean(question.required));
        item.setChoiceValues(question.choices ?? []);
        return;
      }
      case 'scale': {
        form
          .addScaleItem()
          .setTitle(question.title)
          .setHelpText(question.helpText ?? '')
          .setRequired(Boolean(question.required))
          .setBounds(question.lowerBound ?? 1, question.upperBound ?? 5)
          .setLabels(question.lowerLabel ?? 'Low', question.upperLabel ?? 'High');
        return;
      }
      default:
        throw new Error(`Unsupported form question kind: ${String(question.kind)}`);
    }
  }

  /**
   * Converts a form object into a serializable descriptor.
   *
   * @param form Apps Script form object.
   * @returns Descriptor used by tool responses and project code.
   */
  private static describeForm(form: GoogleAppsScript.Forms.Form): FormDescriptor {
    return {
      id: form.getId(),
      editUrl: form.getEditUrl(),
      publishedUrl: form.getPublishedUrl(),
      title: form.getTitle()
    };
  }
}
