import { DecisionElement } from '../../../types/flow-dsl';
import { ElementStrategy, XMLGeneratorContext } from './element-strategy';

export class DecisionStrategy implements ElementStrategy<DecisionElement> {
  generate(element: DecisionElement, context: XMLGeneratorContext): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;

    lines.push(`    <decisions>`);
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${context.escapeXml(element.label || apiName)}</label>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);

    const sortedOutcomes = [...element.outcomes].sort((a, b) => {
      if (a.isDefault && !b.isDefault) return 1;
      if (!a.isDefault && b.isDefault) return -1;
      return a.name.localeCompare(b.name);
    });

    for (const outcome of sortedOutcomes) {
      if (outcome.isDefault) {
        lines.push(...context.generateConnectorLines(outcome.next, 8, 'defaultConnector'));
        lines.push(
          `        <defaultConnectorLabel>${context.escapeXml(outcome.name)}</defaultConnectorLabel>`,
        );
      } else {
        lines.push(`        <rules>`);
        lines.push(`            <name>${context.escapeXml(outcome.name)}</name>`);
        lines.push(`            <conditionLogic>and</conditionLogic>`);
        lines.push(`            <conditions>`);
        lines.push(
          `                <leftValueReference>${outcome.condition || 'true'}</leftValueReference>`,
        );
        lines.push(`                <operator>EqualTo</operator>`);
        lines.push(`                <rightValue>`);
        lines.push(`                    <booleanValue>true</booleanValue>`);
        lines.push(`                </rightValue>`);
        lines.push(`            </conditions>`);
        lines.push(...context.generateConnectorLines(outcome.next, 12));
        lines.push(`            <label>${context.escapeXml(outcome.name)}</label>`);
        lines.push(`        </rules>`);
      }
    }

    lines.push(`    </decisions>`);
    return lines;
  }
}
