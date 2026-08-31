import { RecordUpdateElement } from '../../../types/flow-dsl';
import { serializeFlowValueXml } from '../../../types/flow-value';
import { ElementStrategy, XMLGeneratorContext } from './element-strategy';

export class RecordUpdateStrategy implements ElementStrategy<RecordUpdateElement> {
  generate(element: RecordUpdateElement, context: XMLGeneratorContext): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;
    lines.push('    <recordUpdates>');
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${context.escapeXml(element.label || apiName)}</label>`);
    lines.push('        <locationX>0</locationX>');
    lines.push('        <locationY>0</locationY>');

    if (element.filterLogic) lines.push(`        <filterLogic>${context.escapeXml(element.filterLogic)}</filterLogic>`);
    for (const filter of element.filters || []) {
      lines.push('        <filters>');
      lines.push(`            <field>${context.escapeXml(filter.field)}</field>`);
      lines.push(`            <operator>${filter.operator}</operator>`);
      lines.push('            <value>');
      lines.push(...serializeFlowValueXml(filter.value, context.escapeXml, 16));
      lines.push('            </value>');
      lines.push('        </filters>');
    }

    for (const fieldName of Object.keys(element.fields).sort()) {
      lines.push('        <inputAssignments>');
      lines.push(`            <field>${context.escapeXml(fieldName)}</field>`);
      lines.push('            <value>');
      lines.push(...serializeFlowValueXml(element.fields[fieldName], context.escapeXml, 16));
      lines.push('            </value>');
      lines.push('        </inputAssignments>');
    }

    if (element.next) lines.push(...context.generateConnectorLines(element.next, 8));
    lines.push(`        <object>${context.escapeXml(element.object)}</object>`);
    lines.push('    </recordUpdates>');
    return lines;
  }
}
