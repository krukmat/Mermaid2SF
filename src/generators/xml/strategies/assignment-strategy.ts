import { AssignmentElement } from '../../../types/flow-dsl';
import { serializeFlowValueXml } from '../../../types/flow-value';
import { ElementStrategy, XMLGeneratorContext } from './element-strategy';

export class AssignmentStrategy implements ElementStrategy<AssignmentElement> {
  generate(element: AssignmentElement, context: XMLGeneratorContext): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;
    lines.push('    <assignments>');
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${context.escapeXml(element.label || apiName)}</label>`);
    lines.push('        <locationX>0</locationX>');
    lines.push('        <locationY>0</locationY>');

    for (const assignment of [...element.assignments].sort((a, b) => a.variable.localeCompare(b.variable))) {
      lines.push('        <assignmentItems>');
      lines.push(`            <assignToReference>${context.escapeXml(assignment.variable)}</assignToReference>`);
      lines.push('            <operator>Assign</operator>');
      lines.push('            <value>');
      lines.push(...serializeFlowValueXml(assignment.value, context.escapeXml, 16));
      lines.push('            </value>');
      lines.push('        </assignmentItems>');
    }

    if (element.next) lines.push(...context.generateConnectorLines(element.next, 8));
    lines.push('    </assignments>');
    return lines;
  }
}
