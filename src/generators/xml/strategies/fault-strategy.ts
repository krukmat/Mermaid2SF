import { FaultElement } from '../../../types/flow-dsl';
import { ElementStrategy, XMLGeneratorContext } from './element-strategy';

export class FaultStrategy implements ElementStrategy<FaultElement> {
  generate(element: FaultElement, context: XMLGeneratorContext): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;

    lines.push(`    <faults>`);
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${context.escapeXml(element.label || apiName)}</label>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);
    if (element.next) {
      lines.push(...context.generateConnectorLines(element.next, 8));
    }
    lines.push(`    </faults>`);
    return lines;
  }
}
