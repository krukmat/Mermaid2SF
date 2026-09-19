import { ScreenElement } from '../../../types/flow-dsl';
import { serializeFlowValueXml } from '../../../types/flow-value';
import { ElementStrategy, XMLGeneratorContext } from './element-strategy';

export class ScreenStrategy implements ElementStrategy<ScreenElement> {
  generate(element: ScreenElement, context: XMLGeneratorContext): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;

    lines.push('    <screens>');
    lines.push(`        <name>${context.escapeXml(apiName)}</name>`);
    lines.push(`        <label>${context.escapeXml(element.label || apiName)}</label>`);
    lines.push('        <locationX>0</locationX>');
    lines.push('        <locationY>0</locationY>');
    if (element.allowBack !== undefined) lines.push(`        <allowBack>${element.allowBack}</allowBack>`);
    if (element.allowFinish !== undefined) lines.push(`        <allowFinish>${element.allowFinish}</allowFinish>`);
    if (element.allowPause !== undefined) lines.push(`        <allowPause>${element.allowPause}</allowPause>`);
    if (element.next) lines.push(...context.generateConnectorLines(element.next, 8));

    for (const component of element.components) {
      const fieldType = component.type === 'Field' ? 'InputField' : component.type;
      lines.push('        <fields>');
      lines.push(`            <name>${context.escapeXml(component.name)}</name>`);
      for (const choice of component.choiceReferences || []) {
        lines.push(`            <choiceReferences>${context.escapeXml(choice)}</choiceReferences>`);
      }
      if (component.dataType) lines.push(`            <dataType>${context.escapeXml(component.dataType)}</dataType>`);
      if (component.defaultValue !== undefined) {
        lines.push('            <defaultValue>');
        lines.push(...serializeFlowValueXml(component.defaultValue, context.escapeXml, 16));
        lines.push('            </defaultValue>');
      }
      const fieldText = component.type === 'DisplayText' ? component.text : (component.label || component.text);
      if (fieldText !== undefined) lines.push(`            <fieldText>${context.escapeXml(fieldText)}</fieldText>`);
      lines.push(`            <fieldType>${fieldType}</fieldType>`);
      if (component.target) lines.push(`            <fieldReference>${context.escapeXml(component.target)}</fieldReference>`);
      if (component.required !== undefined) lines.push(`            <isRequired>${component.required}</isRequired>`);
      if (component.visibility && component.visibility.conditions.length > 0) {
        lines.push('            <visibilityRule>');
        if (component.visibility.conditionLogic) {
          lines.push(`                <conditionLogic>${context.escapeXml(component.visibility.conditionLogic)}</conditionLogic>`);
        }
        for (const condition of component.visibility.conditions) {
          lines.push('                <conditions>');
          const left = condition.left as any;
          if (left?.kind === 'reference') {
            lines.push(`                    <leftValueReference>${context.escapeXml(left.name)}</leftValueReference>`);
          }
          lines.push(`                    <operator>${condition.operator}</operator>`);
          lines.push('                    <rightValue>');
          lines.push(...serializeFlowValueXml(condition.right, context.escapeXml, 24));
          lines.push('                    </rightValue>');
          lines.push('                </conditions>');
        }
        lines.push('            </visibilityRule>');
      }
      lines.push('        </fields>');
    }

    if (element.showFooter !== undefined) lines.push(`        <showFooter>${element.showFooter}</showFooter>`);
    if (element.showHeader !== undefined) lines.push(`        <showHeader>${element.showHeader}</showHeader>`);
    lines.push('    </screens>');
    return lines;
  }
}
