export interface DocumentationPayload {
  metadata?: string;
  diagram?: string;
  variables?: string;
  elements?: string;
}

export class DocumentationFormatter {
  format(payload: DocumentationPayload): string {
    const sections: string[] = [];
    if (payload.metadata) {
      sections.push(payload.metadata);
    }
    if (payload.diagram) {
      sections.push(payload.diagram);
    }
    if (payload.variables) {
      sections.push(payload.variables);
    }
    if (payload.elements) {
      sections.push(payload.elements);
    }
    return sections.join('\n\n');
  }
}
