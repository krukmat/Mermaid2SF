import { SubflowElement } from '../../../types/flow-dsl';
import { serializeFlowValueXml } from '../../../types/flow-value';
import { ElementStrategy, XMLGeneratorContext } from './element-strategy';

export class SubflowStrategy implements ElementStrategy<SubflowElement> {
  generate(element: SubflowElement, context: XMLGeneratorContext): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;
    lines.push('    <subflows>');
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${context.escapeXml(element.label || apiName)}</label>`);
    lines.push('        <locationX>0</locationX>');
    lines.push('        <locationY>0</locationY>');
    lines.push(`        <flowName>${context.escapeXml(element.flowName)}</flowName>`);

    for (const assignment of element.inputAssignments || []) {
      lines.push('        <inputAssignments>');
      lines.push(`            <name>${context.escapeXml(assignment.name)}</name>`);
      lines.push('            <value>');
      lines.push(...serializeFlowValueXml(assignment.value, context.escapeXml, 16));
      lines.push('            </value>');
      lines.push('        </inputAssignments>');
    }

    for (const assignment of element.outputAssignments || []) {
      lines.push('        <outputAssignments>');
      lines.push(`            <assignToReference>${context.escapeXml(assignment.name)}</assignToReference>`);
      const source = typeof assignment.value === 'string'
        ? assignment.value
        : assignment.value && typeof assignment.value === 'object' && 'kind' in assignment.value && assignment.value.kind === 'reference'
          ? assignment.value.name
          : assignment.name;
      lines.push(`            <name>${context.escapeXml(source)}</name>`);
      lines.push('        </outputAssignments>');
    }

    if (element.next) lines.push(...context.generateConnectorLines(element.next, 8));
    lines.push('    </subflows>');
    return lines;
  }
}
