import { GetRecordsElement } from '../../../types/flow-dsl';
import { serializeFlowValueXml } from '../../../types/flow-value';
import { ElementStrategy, XMLGeneratorContext } from './element-strategy';

export class GetRecordsStrategy implements ElementStrategy<GetRecordsElement> {
  generate(element: GetRecordsElement, context: XMLGeneratorContext): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;
    lines.push('    <recordLookups>');
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${context.escapeXml(element.label || apiName)}</label>`);
    lines.push('        <locationX>0</locationX>');
    lines.push('        <locationY>0</locationY>');
    lines.push('        <assignNullValuesIfNoRecordsFound>false</assignNullValuesIfNoRecordsFound>');

    for (const filter of element.filters || []) {
      lines.push('        <filters>');
      lines.push(`            <field>${context.escapeXml(filter.field)}</field>`);
      lines.push(`            <operator>${filter.operator}</operator>`);
      lines.push('            <value>');
      lines.push(...serializeFlowValueXml(filter.value, context.escapeXml, 16));
      lines.push('            </value>');
      lines.push('        </filters>');
    }

    if (element.sortField) {
      lines.push(`        <sortField>${context.escapeXml(element.sortField)}</sortField>`);
      lines.push(`        <sortOrder>${element.sortDirection || 'Ascending'}</sortOrder>`);
    }
    for (const field of [...(element.fields || [])].sort()) {
      lines.push(`        <queriedFields>${context.escapeXml(field)}</queriedFields>`);
    }
    if (element.next) lines.push(...context.generateConnectorLines(element.next, 8));
    lines.push(`        <object>${context.escapeXml(element.object)}</object>`);
    lines.push('        <storeOutputAutomatically>true</storeOutputAutomatically>');
    lines.push('    </recordLookups>');
    return lines;
  }
}
