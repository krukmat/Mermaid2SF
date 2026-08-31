import { DecisionElement, parseConditionExpression } from '../../../types/flow-dsl';
import { serializeFlowValueXml } from '../../../types/flow-value';
import { ElementStrategy, XMLGeneratorContext } from './element-strategy';

export class DecisionStrategy implements ElementStrategy<DecisionElement> {
  generate(element: DecisionElement, context: XMLGeneratorContext): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;
    lines.push('    <decisions>');
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${context.escapeXml(element.label || apiName)}</label>`);
    lines.push('        <locationX>0</locationX>');
    lines.push('        <locationY>0</locationY>');

    const sortedOutcomes = [...element.outcomes].sort((a, b) => {
      if (a.isDefault && !b.isDefault) return 1;
      if (!a.isDefault && b.isDefault) return -1;
      return a.name.localeCompare(b.name);
    });

    for (const outcome of sortedOutcomes) {
      if (outcome.isDefault) {
        lines.push(...context.generateConnectorLines(outcome.next, 8, 'defaultConnector'));
        lines.push(`        <defaultConnectorLabel>${context.escapeXml(outcome.name)}</defaultConnectorLabel>`);
        continue;
      }

      const legacyCondition = outcome.condition ? parseConditionExpression(outcome.condition) : undefined;
      const conditions = outcome.conditions || (legacyCondition ? [legacyCondition] : []);
      lines.push('        <rules>');
      lines.push(`            <name>${context.escapeXml(outcome.name)}</name>`);
      lines.push(`            <conditionLogic>${context.escapeXml(outcome.conditionLogic || element.conditionLogic || 'and')}</conditionLogic>`);
      for (const condition of conditions) {
        lines.push('            <conditions>');
        lines.push(`                <leftValueReference>${context.escapeXml(condition.left.name)}</leftValueReference>`);
        lines.push(`                <operator>${condition.operator}</operator>`);
        lines.push('                <rightValue>');
        lines.push(...serializeFlowValueXml(condition.right, context.escapeXml, 20));
        lines.push('                </rightValue>');
        lines.push('            </conditions>');
      }
      lines.push(...context.generateConnectorLines(outcome.next, 12));
      lines.push(`            <label>${context.escapeXml(outcome.name)}</label>`);
      lines.push('        </rules>');
    }

    lines.push('    </decisions>');
    return lines;
  }
}
