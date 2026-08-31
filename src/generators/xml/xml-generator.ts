import { FlowDSL, FlowElement, resolveFlowKind } from '../../types/flow-dsl';
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
    const terminalIds = new Set(dsl.elements.filter((element) => element.type === 'End').map((element) => element.id));

    const context: XMLGeneratorContext = {
      idToApiName,
      escapeXml: (text) => this.escapeXml(text),
      resolveTargetReference: (targetId) => this.resolveTargetReference(targetId, idToApiName, terminalIds),
      generateConnectorLines: (targetId, indentLevel, tagName) =>
        this.connectorGenerator.generateConnectorLines(
          this.resolveTargetReference(targetId, idToApiName, terminalIds),
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
      if (element.type === 'Start' || element.type === 'End') continue;
      lines.push(...this.elementGenerator.generate(element, context));
    }

    lines.push(...this.generateStartBlock(dsl, context));
    lines.push(...this.footerGenerator.generate(dsl));
    return lines.join('\n');
  }

  private generateStartBlock(dsl: FlowDSL, context: XMLGeneratorContext): string[] {
    const lines = ['    <start>', '        <locationX>0</locationX>', '        <locationY>0</locationY>'];
    const startElement = dsl.elements.find((element) => element.id === dsl.startElement);
    if (startElement && 'next' in startElement && startElement.next) {
      lines.push(...context.generateConnectorLines(startElement.next, 8));
    }

    if (resolveFlowKind(dsl) === 'RecordTriggered' && dsl.trigger) {
      const trigger = dsl.trigger;
      if (trigger.doesRequireRecordChangedToMeetCriteria !== undefined) {
        lines.push(`        <doesRequireRecordChangedToMeetCriteria>${trigger.doesRequireRecordChangedToMeetCriteria}</doesRequireRecordChangedToMeetCriteria>`);
      }
      if (trigger.filterLogic) lines.push(`        <filterLogic>${context.escapeXml(trigger.filterLogic)}</filterLogic>`);
      for (const filter of trigger.filters || []) {
        lines.push('        <filters>');
        lines.push(`            <field>${context.escapeXml(filter.field)}</field>`);
        lines.push(`            <operator>${filter.operator}</operator>`);
        lines.push('            <value>');
        lines.push(`                <stringValue>${context.escapeXml(filter.value)}</stringValue>`);
        lines.push('            </value>');
        lines.push('        </filters>');
      }
      lines.push(`        <object>${context.escapeXml(trigger.object)}</object>`);
      lines.push(`        <recordTriggerType>${trigger.recordTriggerType}</recordTriggerType>`);
      lines.push(`        <triggerType>${trigger.triggerType}</triggerType>`);
    }

    lines.push('    </start>');
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
    for (const element of elements) map.set(element.id, element.apiName || element.id);
    return map;
  }

  private resolveTargetReference(
    targetId: string | undefined,
    idToApiName: Map<string, string>,
    terminalIds: Set<string>,
  ): string | undefined {
    if (!targetId || terminalIds.has(targetId)) return undefined;
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
