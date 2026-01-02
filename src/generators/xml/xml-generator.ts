import { FlowDSL, FlowElement } from '../../types/flow-dsl';
import { ElementGenerator } from './components/element-generator';
import { HeaderGenerator } from './components/header-generator';
import { FooterGenerator } from './components/footer-generator';
import { ConnectorGenerator } from './components/connector-generator';
import { GeneratorFactory } from './factories/generator-factory';
import { XMLGeneratorContext } from './strategies/element-strategy';

export class XMLGenerator {
  constructor(
    private readonly headerGenerator: HeaderGenerator,
    private readonly elementGenerator: ElementGenerator,
    private readonly connectorGenerator: ConnectorGenerator,
    private readonly footerGenerator: FooterGenerator,
  ) {}

  generate(dsl: FlowDSL): string {
    const lines: string[] = [];
    const idToApiName = this.buildIdToApiName(dsl.elements);

    const context: XMLGeneratorContext = {
      idToApiName,
      escapeXml: (text) => this.escapeXml(text),
      resolveTargetReference: (targetId) => this.resolveTargetReference(targetId, idToApiName),
      generateConnectorLines: (targetId, indentLevel, tagName) =>
        this.connectorGenerator.generateConnectorLines(
          this.resolveTargetReference(targetId, idToApiName),
          indentLevel,
          tagName,
        ),
    };

    lines.push(...this.headerGenerator.generate(dsl, context.escapeXml));

    const sortedElements = [...dsl.elements].sort((a, b) => {
      const aName = a.apiName || a.id;
      const bName = b.apiName || b.id;
      return aName.localeCompare(bName);
    });

    for (const element of sortedElements) {
      if (element.type === 'Start' || element.type === 'End') {
        continue;
      }
      lines.push(...this.elementGenerator.generate(element, context));
    }

    lines.push(...this.generateStartBlock(dsl, context));
    lines.push(...this.footerGenerator.generate());

    return lines.join('\n');
  }

  private generateStartBlock(dsl: FlowDSL, context: XMLGeneratorContext): string[] {
    const lines: string[] = [];
    lines.push(`    <start>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);

    const startElement = dsl.elements.find((e) => e.id === dsl.startElement);
    if (startElement && 'next' in startElement && startElement.next) {
      lines.push(...context.generateConnectorLines(startElement.next, 8));
    }

    lines.push(`    </start>`);
    return lines;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private buildIdToApiName(elements: FlowElement[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const element of elements) {
      map.set(element.id, element.apiName || element.id);
    }
    return map;
  }

  private resolveTargetReference(
    targetId: string | undefined,
    idToApiName: Map<string, string>,
  ): string | undefined {
    if (!targetId) return targetId;
    return idToApiName.get(targetId) || targetId;
  }
}

export const createXMLGenerator = (): XMLGenerator => {
  const factory = new GeneratorFactory();
  return new XMLGenerator(
    factory.createHeaderGenerator(),
    factory.createElementGenerator(),
    factory.createConnectorGenerator(),
    factory.createFooterGenerator(),
  );
};
