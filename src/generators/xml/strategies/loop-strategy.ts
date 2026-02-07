import { LoopElement } from '../../../types/flow-dsl';
import { ElementStrategy, XMLGeneratorContext } from './element-strategy';

export class LoopStrategy implements ElementStrategy<LoopElement> {
  generate(element: LoopElement, context: XMLGeneratorContext): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;

    lines.push(`    <loops>`);
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${context.escapeXml(element.label || apiName)}</label>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);
    if (element.collection) {
      lines.push(`        <collectionReference>${element.collection}</collectionReference>`);
    }
    if (element.next) {
      lines.push(...context.generateConnectorLines(element.next, 8, 'nextValueConnector'));
    }
    lines.push(`    </loops>`);
    return lines;
  }
}
