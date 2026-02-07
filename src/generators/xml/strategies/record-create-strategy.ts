import { RecordCreateElement } from '../../../types/flow-dsl';
import { ElementStrategy, XMLGeneratorContext } from './element-strategy';

export class RecordCreateStrategy implements ElementStrategy<RecordCreateElement> {
  generate(element: RecordCreateElement, context: XMLGeneratorContext): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;

    lines.push(`    <recordCreates>`);
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${context.escapeXml(element.label || apiName)}</label>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);
    lines.push(`        <object>${element.object}</object>`);

    const sortedFields = Object.keys(element.fields).sort();
    for (const fieldName of sortedFields) {
      lines.push(`        <inputAssignments>`);
      lines.push(`            <field>${fieldName}</field>`);
      lines.push(`            <value>`);
      lines.push(
        `                <stringValue>${context.escapeXml(element.fields[fieldName])}</stringValue>`,
      );
      lines.push(`            </value>`);
      lines.push(`        </inputAssignments>`);
    }

    if (element.assignRecordIdToReference) {
      lines.push(
        `        <assignRecordIdToReference>${element.assignRecordIdToReference}</assignRecordIdToReference>`,
      );
    }

    if (element.next) {
      lines.push(...context.generateConnectorLines(element.next, 8));
    }

    lines.push(`    </recordCreates>`);
    return lines;
  }
}
