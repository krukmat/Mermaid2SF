import { RecordUpdateElement } from '../../../types/flow-dsl';
import { ElementStrategy, XMLGeneratorContext } from './element-strategy';

export class RecordUpdateStrategy implements ElementStrategy<RecordUpdateElement> {
  generate(element: RecordUpdateElement, context: XMLGeneratorContext): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;

    lines.push(`    <recordUpdates>`);
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${context.escapeXml(element.label || apiName)}</label>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);
    lines.push(`        <object>${element.object}</object>`);

    if (element.filters && element.filters.length > 0) {
      for (const filter of element.filters) {
        lines.push(`        <filters>`);
        lines.push(`            <field>${filter.field}</field>`);
        lines.push(`            <operator>${filter.operator}</operator>`);
        lines.push(`            <value>`);
        lines.push(`                <stringValue>${context.escapeXml(filter.value)}</stringValue>`);
        lines.push(`            </value>`);
        lines.push(`        </filters>`);
      }
    }

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

    if (element.next) {
      lines.push(...context.generateConnectorLines(element.next, 8));
    }

    lines.push(`    </recordUpdates>`);
    return lines;
  }
}
