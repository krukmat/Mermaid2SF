import { RecordCreateElement } from '../../../types/flow-dsl';
import { serializeFlowValueXml } from '../../../types/flow-value';
import { ElementStrategy, XMLGeneratorContext } from './element-strategy';

export class RecordCreateStrategy implements ElementStrategy<RecordCreateElement> {
  generate(element: RecordCreateElement, context: XMLGeneratorContext): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;
    lines.push('    <recordCreates>');
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${context.escapeXml(element.label || apiName)}</label>`);
    lines.push('        <locationX>0</locationX>');
    lines.push('        <locationY>0</locationY>');

    for (const fieldName of Object.keys(element.fields).sort()) {
      lines.push('        <inputAssignments>');
      lines.push(`            <field>${context.escapeXml(fieldName)}</field>`);
      lines.push('            <value>');
      lines.push(...serializeFlowValueXml(element.fields[fieldName], context.escapeXml, 16));
      lines.push('            </value>');
      lines.push('        </inputAssignments>');
    }

    if (element.assignRecordIdToReference) lines.push(`        <assignRecordIdToReference>${context.escapeXml(element.assignRecordIdToReference)}</assignRecordIdToReference>`);
    if (element.next) lines.push(...context.generateConnectorLines(element.next, 8));
    lines.push(`        <object>${context.escapeXml(element.object)}</object>`);
    lines.push('    </recordCreates>');
    return lines;
  }
}
