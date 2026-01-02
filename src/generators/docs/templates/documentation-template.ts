import { FlowDSL } from '../../../types/flow-dsl';

export abstract class DocumentationTemplate {
  generate(dsl: FlowDSL): string {
    return [
      this.generateHeader(dsl),
      this.generateContent(dsl),
      this.generateFooter(dsl),
    ]
      .filter((section) => section.trim().length > 0)
      .join('\n\n');
  }

  protected abstract generateHeader(dsl: FlowDSL): string;
  protected abstract generateContent(dsl: FlowDSL): string;
  protected abstract generateFooter(dsl: FlowDSL): string;
}
