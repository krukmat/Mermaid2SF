import {
  FlowCondition,
  FlowDSL,
  FlowElement,
  FlowValueLike,
  normalizeFlowValue,
  resolveFlowKind,
} from '../types/flow-dsl';

/**
 * Canonical FlowIR -> Mermaid serializer.
 *
 * The emitted Mermaid is intentionally authoring-compatible with MermaidParser +
 * MetadataExtractor, so it can be compiled back into FlowIR. Wave 1 guarantees
 * this path for the supported Autolaunched subset.
 */
export class MermaidGenerator {
  generate(dsl: FlowDSL): string {
    const lines: string[] = ['flowchart TD'];

    for (const element of dsl.elements) {
      lines.push(this.renderNode(element, dsl));
    }

    lines.push('');
    for (const element of dsl.elements) {
      lines.push(...this.renderEdges(element));
    }

    return lines.filter(Boolean).join('\n');
  }

  private renderNode(element: FlowElement, dsl: FlowDSL): string {
    const shape = this.getShape(element.type);
    const content = this.renderContent(element, dsl).join('\\n');
    return `    ${element.id}${shape.open}${content}${shape.close}`;
  }

  private renderContent(element: FlowElement, dsl: FlowDSL): string[] {
    const lines: string[] = [this.getTypePrefix(element.type) + (element.label || element.id)];

    if (element.apiName && element.apiName !== element.id) {
      lines.push(`api: ${element.apiName}`);
    }

    switch (element.type) {
      case 'Start': {
        const kind = resolveFlowKind(dsl);
        const kindName = kind === 'RecordTriggered' ? 'record-triggered' : kind.toLowerCase();
        lines.push(`flow: ${kindName}`);
        if (dsl.apiVersion) lines.push(`api-version: ${dsl.apiVersion}`);
        if (dsl.status) lines.push(`status: ${dsl.status.toLowerCase()}`);
        for (const variable of dsl.variables || []) {
          const flags = [
            variable.isCollection ? 'collection' : '',
            variable.isInput ? 'input' : '',
            variable.isOutput ? 'output' : '',
            variable.objectType ? `object=${variable.objectType}` : '',
          ].filter(Boolean);
          lines.push(`variable: ${variable.name} ${variable.dataType}${flags.length ? ` ${flags.join(' ')}` : ''}`);
        }
        break;
      }
      case 'Assignment':
        for (const assignment of element.assignments) {
          lines.push(`set: ${assignment.variable} = ${this.renderValue(assignment.value)}`);
        }
        break;
      case 'Decision':
        break;
      case 'Screen':
        for (const component of element.components) {
          if (component.type === 'DisplayText') {
            lines.push(`display: ${component.text || ''}`);
          } else {
            lines.push(`field: ${component.name}${component.dataType ? ` (${component.dataType})` : ''}`);
            if (component.target) lines.push(`target: ${component.target}`);
            if (component.required !== undefined) lines.push(`required: ${component.required}`);
          }
        }
        break;
      case 'RecordCreate':
        if (element.assignRecordIdToReference || element.storeOutputAutomatically !== undefined) {
          throw new Error(
            `RecordCreate ${element.id} uses output metadata that is not round-trip safe in Mermaid Wave 1.`,
          );
        }
        lines.push(`object: ${element.object}`);
        for (const field of Object.keys(element.fields).sort()) {
          lines.push(`field: ${field} = ${this.renderValue(element.fields[field])}`);
        }
        break;
      case 'RecordUpdate':
        if (element.filterLogic) {
          throw new Error(
            `RecordUpdate ${element.id} uses filterLogic that is not round-trip safe in Mermaid Wave 1.`,
          );
        }
        lines.push(`object: ${element.object}`);
        for (const filter of element.filters || []) lines.push(this.renderFilter(filter.field, filter.operator, filter.value, element.id));
        for (const field of Object.keys(element.fields).sort()) {
          lines.push(`field: ${field} = ${this.renderValue(element.fields[field])}`);
        }
        break;
      case 'GetRecords':
        lines.push(`object: ${element.object}`);
        for (const filter of element.filters || []) lines.push(this.renderFilter(filter.field, filter.operator, filter.value, element.id));
        for (const field of [...(element.fields || [])].sort()) lines.push(`field: ${field}`);
        if (element.sortField) {
          lines.push(`sort: ${element.sortField} ${element.sortDirection === 'Descending' ? 'desc' : 'asc'}`);
        }
        break;
      case 'Subflow':
        lines.push(`flow: ${element.flowName}`);
        for (const input of element.inputAssignments || []) {
          lines.push(`input: ${input.name} = ${this.renderValue(input.value)}`);
        }
        for (const output of element.outputAssignments || []) {
          lines.push(`output: ${output.name} = ${this.renderValue(output.value)}`);
        }
        break;
      case 'Loop':
        lines.push(`collection: ${element.collection}`);
        break;
      case 'Wait':
        if (element.waitType) lines.push(`mode: ${element.waitType}`);
        if (element.condition) lines.push(`condition: ${element.condition}`);
        if (element.durationValue !== undefined) {
          const suffix: Record<string, string> = { Seconds: 's', Minutes: 'm', Hours: 'h', Days: 'd' };
          lines.push(`duration: ${element.durationValue}${suffix[element.durationUnit || 'Seconds'] || 's'}`);
        }
        if (element.eventName) lines.push(`event: ${element.eventName}`);
        break;
      case 'Fault':
      case 'End':
        break;
    }

    return lines;
  }

  private renderEdges(element: FlowElement): string[] {
    if (element.type === 'Decision') {
      return element.outcomes.map((outcome) => {
        if (outcome.isDefault) return `    ${element.id} -->|${outcome.name} default| ${outcome.next}`;

        const conditions = outcome.conditions || [];
        if (conditions.length > 1) {
          throw new Error(
            `Decision ${element.id} outcome ${outcome.name} has multiple conditions; Mermaid Wave 1 supports one condition per outcome.`,
          );
        }

        const expression = conditions.length === 1
          ? this.renderCondition(conditions[0])
          : outcome.condition;
        const label = expression ? `${outcome.name} if ${expression}` : outcome.name;
        return `    ${element.id} -->|${label}| ${outcome.next}`;
      });
    }

    return 'next' in element && element.next ? [`    ${element.id} --> ${element.next}`] : [];
  }

  private renderCondition(condition: FlowCondition): string {
    const left = `ref:${condition.left.name}`;
    if (condition.operator === 'IsNull') {
      const right = normalizeFlowValue(condition.right);
      const isNull = right.kind === 'boolean' ? right.value : true;
      return `${left} is ${isNull ? '' : 'not '}null`;
    }

    const operators: Record<string, string> = {
      EqualTo: '=',
      NotEqualTo: '!=',
      GreaterThan: '>',
      GreaterThanOrEqualTo: '>=',
      LessThan: '<',
      LessThanOrEqualTo: '<=',
    };
    return `${left} ${operators[condition.operator] || '='} ${this.renderValue(condition.right)}`;
  }

  private renderFilter(field: string, operator: string, value: FlowValueLike, elementId: string): string {
    if (operator !== 'EqualTo') {
      throw new Error(
        `${elementId} uses filter operator ${operator}; Mermaid Wave 1 record filters support EqualTo only.`,
      );
    }
    return `filter: ${field} = ${this.renderValue(value)}`;
  }

  private renderValue(value: FlowValueLike): string {
    const normalized = normalizeFlowValue(value);
    switch (normalized.kind) {
      case 'reference': return `ref:${normalized.name}`;
      case 'null': return 'null';
      case 'boolean': return String(normalized.value);
      case 'number': return String(normalized.value);
      case 'date': return normalized.value;
      case 'datetime': return normalized.value;
      case 'string': {
        const ambiguous = /^(?:true|false|null|-?(?:\d+\.?\d*|\.\d+)|\d{4}-\d{2}-\d{2}(?:T.*)?|ref\s*:|\$)/i.test(normalized.value);
        return ambiguous ? JSON.stringify(normalized.value) : normalized.value;
      }
    }
  }

  private getShape(type: string): { open: string; close: string } {
    switch (type) {
      case 'Start':
      case 'End':
        return { open: '([', close: '])' };
      case 'Decision':
        return { open: '{', close: '}' };
      case 'Subflow':
        return { open: '[[', close: ']]' };
      default:
        return { open: '[', close: ']' };
    }
  }

  private getTypePrefix(type: string): string {
    const prefixes: Record<string, string> = {
      Start: 'START: ',
      End: 'END: ',
      Assignment: 'ASSIGNMENT: ',
      Decision: 'DECISION: ',
      Screen: 'SCREEN: ',
      RecordCreate: 'CREATE: ',
      RecordUpdate: 'UPDATE: ',
      GetRecords: 'GET: ',
      Subflow: 'SUBFLOW: ',
      Loop: 'LOOP: ',
      Wait: 'WAIT: ',
      Fault: 'FAULT: ',
    };
    return prefixes[type] || '';
  }
}
