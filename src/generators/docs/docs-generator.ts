import { FlowDSL } from '../../types/flow-dsl';
import { DocumentationFormatter } from './formatters/documentation-formatter';
import { DiagramRenderer } from './renderers/diagram-renderer';
import {
  DocsOptions,
  TechnicalDocumentationTemplate,
} from './templates/technical-documentation-template';

export class DocsGenerator {
  private readonly renderer: DiagramRenderer;
  private readonly formatter: DocumentationFormatter;

  constructor(
    renderer: DiagramRenderer = new DiagramRenderer(),
    formatter: DocumentationFormatter = new DocumentationFormatter(),
  ) {
    this.renderer = renderer;
    this.formatter = formatter;
  }

  generateMarkdown(dsl: FlowDSL, options: DocsOptions = {}): string {
    const template = new TechnicalDocumentationTemplate(
      this.renderer,
      this.formatter,
      options,
    );
    return template.generate(dsl);
  }

  generateMermaidDiagram(dsl: FlowDSL): string {
    return this.renderer.render(dsl);
  }
}
