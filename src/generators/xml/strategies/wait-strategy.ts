import { WaitElement } from '../../../types/flow-dsl';
import { ElementStrategy, XMLGeneratorContext } from './element-strategy';

export class WaitStrategy implements ElementStrategy<WaitElement> {
  generate(element: WaitElement, context: XMLGeneratorContext): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;
    const waitType =
      element.waitType ||
      (element.eventName ? 'event' : undefined) ||
      (element.durationValue ? 'duration' : undefined) ||
      (element.condition ? 'condition' : undefined) ||
      'condition';

    lines.push(`    <waits>`);
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${context.escapeXml(element.label || apiName)}</label>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);

    if (waitType === 'duration' && element.durationValue) {
      const unit = element.durationUnit || 'Seconds';
      lines.push(`        <waitEvents>`);
      lines.push(`            <eventType>TimeBased</eventType>`);
      lines.push(`            <offsetNumber>${element.durationValue}</offsetNumber>`);
      lines.push(`            <offsetUnit>${unit}</offsetUnit>`);
      lines.push(`        </waitEvents>`);
    } else if (waitType === 'event' && element.eventName) {
      lines.push(`        <waitEvents>`);
      lines.push(`            <eventType>PlatformEvent</eventType>`);
      lines.push(`            <platformEventName>${element.eventName}</platformEventName>`);
      if (element.condition) {
        lines.push(
          `            <conditionLogic>${context.escapeXml(element.condition)}</conditionLogic>`,
        );
      }
      lines.push(`        </waitEvents>`);
    } else if (element.condition) {
      lines.push(`        <waitEvents>`);
      lines.push(`            <eventType>PlatformEvent</eventType>`);
      lines.push(
        `            <conditionLogic>${context.escapeXml(element.condition)}</conditionLogic>`,
      );
      lines.push(`        </waitEvents>`);
    }

    if (element.next) {
      lines.push(...context.generateConnectorLines(element.next, 8));
    }

    lines.push(`    </waits>`);
    return lines;
  }
}
