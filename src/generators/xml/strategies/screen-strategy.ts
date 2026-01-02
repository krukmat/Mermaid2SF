import { ScreenElement } from '../../../types/flow-dsl';
import { ElementStrategy, XMLGeneratorContext } from './element-strategy';

export class ScreenStrategy implements ElementStrategy<ScreenElement> {
  generate(element: ScreenElement, context: XMLGeneratorContext): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;

    lines.push(`    <screens>`);
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${context.escapeXml(element.label || apiName)}</label>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);

    for (const component of element.components) {
      lines.push(`        <fields>`);
      lines.push(`            <name>${component.name}</name>`);
      lines.push(`            <fieldType>${component.type}</fieldType>`);

      if (component.dataType) {
        lines.push(`            <dataType>${component.dataType}</dataType>`);
      }

      if (component.target) {
        lines.push(
          `            <fieldReference>${context.escapeXml(component.target)}</fieldReference>`,
        );
      }

      if (component.text) {
        lines.push(`            <fieldText>${context.escapeXml(component.text)}</fieldText>`);
      }

      if (component.required !== undefined) {
        lines.push(`            <isRequired>${component.required}</isRequired>`);
      }

      lines.push(`        </fields>`);
    }

    if (element.next) {
      lines.push(...context.generateConnectorLines(element.next, 8));
    }

    lines.push(`    </screens>`);
    return lines;
  }
}
