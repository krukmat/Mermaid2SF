import { GetRecordsElement } from '../../../types/flow-dsl';
import { ElementStrategy, XMLGeneratorContext } from './element-strategy';

export class GetRecordsStrategy implements ElementStrategy<GetRecordsElement> {
  generate(element: GetRecordsElement, context: XMLGeneratorContext): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;

    lines.push(`    <recordLookups>`);
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

    if (element.sortField) {
      lines.push(`        <sortField>${element.sortField}</sortField>`);
      lines.push(`        <sortOrder>${element.sortDirection || 'Ascending'}</sortOrder>`);
    }

    if (element.fields && element.fields.length > 0) {
      for (const field of element.fields.sort()) {
        lines.push(`        <outputAssignments>`);
        lines.push(`            <assignToReference>${field}</assignToReference>`);
        lines.push(`            <operator>Assign</operator>`);
        lines.push(`            <value><stringValue>${field}</stringValue></value>`);
        lines.push(`        </outputAssignments>`);
      }
    }

    if (element.next) {
      lines.push(...context.generateConnectorLines(element.next, 8));
    }

    lines.push(`    </recordLookups>`);
    return lines;
  }
}
