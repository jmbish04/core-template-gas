export class DocsService {
  static createDocument(title: string, body?: string): {id: string; url: string} {
    const doc = DocumentApp.create(title);
    if (body) {
      doc.getBody().appendParagraph(body);
      doc.saveAndClose();
    }

    return {id: doc.getId(), url: doc.getUrl()};
  }

  static appendParagraph(documentId: string, text: string): void {
    const doc = DocumentApp.openById(documentId);
    doc.getBody().appendParagraph(text);
    doc.saveAndClose();
  }
}
