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
 * MetadataExtractor, so it can be compiled back into FlowIR. Fidelity is
 * feature-scoped by the documented Wave contracts.
 */
export class MermaidGenerator {
  generate(dsl: FlowDSL): string {
    const lines: string[] = ['flowchart TD'];
    const elements = this.orderElements(dsl);

    for (const element of elements) {
      lines.push(this.renderNode(element, dsl));
    }

    lines.push('');
    for (const element of elements) {
      lines.push(...this.renderEdges(element));
    }

    const styles = this.generateStyleDefinitions(elements);
    if (styles.length > 0) {
      lines.push('');
      lines.push(...styles);
    }

    return lines.filter(Boolean).join('\n');
  }

  private orderElements(dsl: FlowDSL): FlowElement[] {
    const map = new Map(dsl.elements.map((element) => [element.id, element]));
    const ordered: FlowElement[] = [];
    const visited = new Set<string>();
    const queue: string[] = dsl.startElement ? [dsl.startElement] : [];

    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      const element = map.get(id);
      if (!element) continue;
      visited.add(id);
      ordered.push(element);
      for (const next of this.collectAdjacencies(element)) {
        if (!visited.has(next) && !queue.includes(next)) queue.push(next);
      }
    }

    dsl.elements
      .filter((element) => !visited.has(element.id))
      .sort((a, b) => a.id.localeCompare(b.id))
      .forEach((element) => ordered.push(element));

    return ordered;
  }

  private collectAdjacencies(element: FlowElement): string[] {
    const result: string[] = [];
    if ('next' in element && element.next) result.push(element.next);
    if (element.type === 'Decision') {
      for (const outcome of element.outcomes) result.push(outcome.next);
    }
    return result;
  }

  private renderNode(element: FlowElement, dsl: FlowDSL): string {
    const shape = this.getShape(element.type);
    const content = this.renderContent(element, dsl)
      .map((line) => this.escapeLabel(line))
      .join('\\n');
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
        if (kind === 'RecordTriggered' && dsl.trigger) {
          const trigger = dsl.trigger;
          lines.push(`object: ${trigger.object}`);
          lines.push(`trigger: ${trigger.triggerType === 'RecordBeforeSave' ? 'before-save' : 'after-save'}`);
          const recordTriggerNames: Record<string, string> = {
            Create: 'create',
            Update: 'update',
            CreateAndUpdate: 'create-and-update',
          };
          lines.push(`record-trigger: ${recordTriggerNames[trigger.recordTriggerType] || trigger.recordTriggerType}`);
          if (trigger.filterLogic) lines.push(`filter-logic: ${trigger.filterLogic}`);
          for (const filter of trigger.filters || []) {
            lines.push(this.renderFilter(filter.field, filter.operator, filter.value, element.id));
          }
          if (trigger.doesRequireRecordChangedToMeetCriteria !== undefined) {
            lines.push(`require-changed-to-meet-criteria: ${trigger.doesRequireRecordChangedToMeetCriteria}`);
          }
        }
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
        if (element.conditionLogic) lines.push(`conditionLogic: ${element.conditionLogic}`);
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
            `RecordCreate ${element.id} uses output metadata that is not round-trip safe in the canonical Mermaid contract.`,
          );
        }
        lines.push(`object: ${element.object}`);
        for (const field of Object.keys(element.fields).sort()) {
          lines.push(`field: ${field} = ${this.renderValue(element.fields[field])}`);
        }
        break;
      case 'RecordUpdate':
        lines.push(`object: ${element.object}`);
        if (element.filterLogic) lines.push(`filterLogic: ${element.filterLogic}`);
        for (const filter of element.filters || []) {
          lines.push(this.renderFilter(filter.field, filter.operator, filter.value, element.id));
        }
        for (const field of Object.keys(element.fields).sort()) {
          lines.push(`field: ${field} = ${this.renderValue(element.fields[field])}`);
        }
        break;
      case 'GetRecords':
        lines.push(`object: ${element.object}`);
        for (const filter of element.filters || []) {
          lines.push(this.renderFilter(filter.field, filter.operator, filter.value, element.id));
        }
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

    if (element.layout) lines.push(`layout: pos: ${element.layout.x},${element.layout.y}`);
    return lines;
  }

  private renderEdges(element: FlowElement): string[] {
    if (element.type === 'Decision') {
      return element.outcomes.map((outcome) => {
        if (outcome.isDefault) return `    ${element.id} -->|${this.escapeEdgeLabel(`${outcome.name} default`)}| ${outcome.next}`;

        const conditions = outcome.conditions || [];
        if (conditions.length > 1) {
          throw new Error(
            `Decision ${element.id} outcome ${outcome.name} has multiple conditions; the current canonical Mermaid contract supports one condition per outcome.`,
          );
        }

        const expression = conditions.length === 1
          ? this.renderCondition(conditions[0])
          : outcome.condition;
        const label = expression ? `${outcome.name} if ${expression}` : outcome.name;
        return `    ${element.id} -->|${this.escapeEdgeLabel(label)}| ${outcome.next}`;
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
        `${elementId} uses filter operator ${operator}; the current canonical Mermaid record-filter contract supports EqualTo only.`,
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

  private generateStyleDefinitions(elements: FlowElement[]): string[] {
    const classMap: Record<string, string> = {
      Start: 'start', End: 'end', Assignment: 'assignment', Decision: 'decision', Screen: 'screen',
      RecordCreate: 'recordCreate', RecordUpdate: 'recordUpdate', GetRecords: 'getRecords', Subflow: 'subflow',
      Loop: 'loop', Wait: 'wait', Fault: 'fault',
    };
    const lines = [
      'classDef start fill:#e8f5ff,stroke:#66e0ff,stroke-width:2;',
      'classDef end fill:#ffe6e6,stroke:#ff758c,stroke-width:2;',
      'classDef decision fill:#fff5e0,stroke:#f5a524,stroke-width:2;',
      'classDef assignment fill:#f1ffed,stroke:#14d88e,stroke-width:2;',
      'classDef screen fill:#eef4ff,stroke:#2b7fff,stroke-width:2;',
      'classDef recordCreate fill:#e6f4ff,stroke:#1e88e5,stroke-width:2;',
      'classDef recordUpdate fill:#fff4e5,stroke:#f57c00,stroke-width:2;',
      'classDef getRecords fill:#f5f5ff,stroke:#3949ab,stroke-width:2;',
      'classDef subflow fill:#f0f0f0,stroke:#8e57ff,stroke-width:2;',
      'classDef loop fill:#f6f6ff,stroke:#4b0082,stroke-width:2;',
      'classDef wait fill:#eaf7ff,stroke:#00acc1,stroke-width:2;',
      'classDef fault fill:#ffe0e0,stroke:#d50000,stroke-width:2;',
    ];
    for (const element of elements) {
      const className = classMap[element.type];
      if (className) lines.push(`    class ${element.id} ${className};`);
    }
    return lines;
  }

  private escapeLabel(text: string): string {
    return text
      .replace(/"/g, '#quot;')
      .replace(/\[/g, '#91;')
      .replace(/]/g, '#93;')
      .replace(/\{/g, '#123;')
      .replace(/\}/g, '#125;')
      .replace(/\(/g, '#40;')
      .replace(/\)/g, '#41;');
  }

  private escapeEdgeLabel(text: string): string {
    return text.replace(/\|/g, '&#124;');
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
