import { FlowDSL } from '../../types/flow-dsl';
import { MermaidGenerator } from '../mermaid-generator';
import { DocumentationFormatter } from './formatters/documentation-formatter';
import { DiagramRenderer } from './renderers/diagram-renderer';
import {
  DocsOptions,
  TechnicalDocumentationTemplate,
} from './templates/technical-documentation-template';

export class DocsGenerator {
  private readonly renderer: DiagramRenderer;
  private readonly formatter: DocumentationFormatter;
  private readonly mermaidGenerator: MermaidGenerator;

  constructor(
    renderer: DiagramRenderer = new DiagramRenderer(),
    formatter: DocumentationFormatter = new DocumentationFormatter(),
    mermaidGenerator: MermaidGenerator = new MermaidGenerator(),
  ) {
    this.renderer = renderer;
    this.formatter = formatter;
    this.mermaidGenerator = mermaidGenerator;
  }

  generateMarkdown(dsl: FlowDSL, options: DocsOptions = {}): string {
    const template = new TechnicalDocumentationTemplate(
      this.renderer,
      this.formatter,
      options,
    );
    return template.generate(dsl);
  }

  /** Generate recompilable Mermaid from canonical FlowIR. */
  generateMermaidDiagram(dsl: FlowDSL): string {
    return this.mermaidGenerator.generate(dsl);
  }
}
