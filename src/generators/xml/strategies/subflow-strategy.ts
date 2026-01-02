import { SubflowElement } from '../../../types/flow-dsl';
import { ElementStrategy, XMLGeneratorContext } from './element-strategy';

export class SubflowStrategy implements ElementStrategy<SubflowElement> {
  generate(element: SubflowElement, context: XMLGeneratorContext): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;

    lines.push(`    <subflows>`);
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${context.escapeXml(element.label || apiName)}</label>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);
    lines.push(`        <flowName>${element.flowName}</flowName>`);

    if (element.inputAssignments && element.inputAssignments.length > 0) {
      for (const assignment of element.inputAssignments) {
        lines.push(`        <inputAssignments>`);
        lines.push(`            <name>${assignment.name}</name>`);
        lines.push(`            <value>`);
        lines.push(
          `                <stringValue>${context.escapeXml(assignment.value)}</stringValue>`,
        );
        lines.push(`            </value>`);
        lines.push(`        </inputAssignments>`);
      }
    }

    if (element.outputAssignments && element.outputAssignments.length > 0) {
      for (const assignment of element.outputAssignments) {
        lines.push(`        <outputAssignments>`);
        lines.push(`            <assignToReference>${assignment.name}</assignToReference>`);
        lines.push(`            <name>${assignment.value}</name>`);
        lines.push(`        </outputAssignments>`);
      }
    }

    if (element.next) {
      lines.push(...context.generateConnectorLines(element.next, 8));
    }

    lines.push(`    </subflows>`);
    return lines;
  }
}
