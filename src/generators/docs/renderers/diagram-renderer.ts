import { FlowDSL, FlowElement } from '../../../types/flow-dsl';

export class DiagramRenderer {
  render(dsl: FlowDSL): string {
    const lines: string[] = [];
    lines.push('flowchart TD');

    const orderedElements = this.orderElements(dsl);
    for (const element of orderedElements) {
      const nodeId = element.id;
      const label = this.buildMermaidLabel(element);

      switch (element.type) {
        case 'Start':
        case 'End':
          lines.push(`    ${nodeId}([${label}])`);
          break;
        case 'Decision':
          lines.push(`    ${nodeId}{${label}}`);
          break;
        case 'Subflow':
          lines.push(`    ${nodeId}[[${label}]]`);
          break;
        default:
          lines.push(`    ${nodeId}[${label}]`);
      }
    }

    for (const element of orderedElements) {
      if ('next' in element && element.next) {
        lines.push(`    ${element.id} --> ${element.next}`);
      }

      if (element.type === 'Decision') {
        for (const outcome of element.outcomes) {
          const edgeLabel = this.escapeLabel(outcome.name);
          lines.push(`    ${element.id} -->|${edgeLabel}| ${outcome.next}`);
        }
      }
    }

    const styleDefs = this.generateStyleDefinitions(orderedElements);
    if (styleDefs.length > 0) {
      lines.push('');
      lines.push(...styleDefs);
    }

    return lines.join('\n');
  }

  private orderElements(dsl: FlowDSL): FlowElement[] {
    const map = new Map<string, FlowElement>(dsl.elements.map((el) => [el.id, el]));
    const ordered: FlowElement[] = [];
    const visited = new Set<string>();
    const queue: string[] = [];

    if (dsl.startElement) {
      queue.push(dsl.startElement);
    }

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId || visited.has(currentId)) {
        continue;
      }

      const element = map.get(currentId);
      if (!element) {
        continue;
      }

      ordered.push(element);
      visited.add(currentId);

      for (const next of this.collectAdjacencies(element)) {
        if (!visited.has(next) && !queue.includes(next)) {
          queue.push(next);
        }
      }
    }

    dsl.elements
      .filter((element) => !visited.has(element.id))
      .sort((a, b) => a.id.localeCompare(b.id))
      .forEach((element) => ordered.push(element));

    return ordered;
  }

  private collectAdjacencies(element: FlowElement): string[] {
    const neighbors = new Set<string>();
    if ('next' in element && element.next) {
      neighbors.add(element.next);
    }
    if (element.type === 'Decision') {
      for (const outcome of element.outcomes) {
        neighbors.add(outcome.next);
      }
    }
    return Array.from(neighbors);
  }

  private buildMermaidLabel(element: FlowElement): string {
    const base = element.label || element.apiName || element.id;
    const meta = this.buildMermaidMetadata(element);
    if (meta.length === 0) {
      return this.escapeLabel(base);
    }
    return this.escapeLabel(`${base}\n${meta.join('\n')}`);
  }

  private buildMermaidMetadata(element: FlowElement): string[] {
    const details: string[] = [];
    switch (element.type) {
      case 'Assignment': {
        if (element.assignments.length > 0) {
          const assignments = element.assignments
            .map((assignment) => `${assignment.variable}=${assignment.value}`)
            .join(', ');
          details.push(`assignments: ${assignments}`);
        }
        break;
      }
      case 'Decision':
        details.push(`outcomes: ${element.outcomes.length}`);
        break;
      case 'RecordCreate': {
        details.push(`object: ${element.object || 'RecordCreate'}`);
        const fields = Object.entries(element.fields || {})
          .map(([field, value]) => `${field}=${value}`)
          .join('; ');
        if (fields) {
          details.push(`fields: ${fields}`);
        }
        break;
      }
      case 'RecordUpdate': {
        details.push(`object: ${element.object || 'RecordUpdate'}`);
        const fields = Object.entries(element.fields || {})
          .map(([field, value]) => `${field}=${value}`)
          .join('; ');
        if (fields) {
          details.push(`updates: ${fields}`);
        }
        if (element.filters && element.filters.length > 0) {
          const filters = element.filters
            .map((filter) => `${filter.field}${filter.operator}${filter.value}`)
            .join('; ');
          details.push(`filters: ${filters}`);
        }
        break;
      }
      case 'Subflow':
        details.push(`flow: ${element.flowName || 'Subflow'}`);
        break;
      case 'Loop':
        details.push(`collection: ${element.collection || 'Loop'}`);
        break;
      case 'Wait':
        if (element.waitType) {
          details.push(`wait: ${element.waitType}`);
        }
        if (element.condition) {
          details.push(`condition: ${element.condition}`);
        }
        if (element.durationValue) {
          details.push(`duration: ${element.durationValue}${element.durationUnit || ''}`);
        }
        if (element.eventName) {
          details.push(`event: ${element.eventName}`);
        }
        break;
      case 'GetRecords': {
        details.push(`object: ${element.object || 'Lookup'}`);
        if (element.filters && element.filters.length > 0) {
          const filters = element.filters
            .map((filter) => `${filter.field}${filter.operator}${filter.value}`)
            .join('; ');
          details.push(`filters: ${filters}`);
        }
        break;
      }
      case 'Fault':
        details.push('fault handler');
        break;
    }
    return details;
  }

  private generateStyleDefinitions(elements: FlowElement[]): string[] {
    const lines: string[] = [];
    const classMap = {
      Start: 'start',
      End: 'end',
      Assignment: 'assignment',
      Decision: 'decision',
      Screen: 'screen',
      RecordCreate: 'recordCreate',
      RecordUpdate: 'recordUpdate',
      Subflow: 'subflow',
      Loop: 'loop',
      Wait: 'wait',
      GetRecords: 'getRecords',
      Fault: 'fault',
    } as const;

    const classDefs = [
      'classDef start fill:#e8f5ff,stroke:#66e0ff,stroke-width:2;',
      'classDef end fill:#ffe6e6,stroke:#ff758c,stroke-width:2;',
      'classDef decision fill:#fff5e0,stroke:#f5a524,stroke-width:2;',
      'classDef assignment fill:#f1ffed,stroke:#14d88e,stroke-width:2;',
      'classDef screen fill:#eef4ff,stroke:#2b7fff,stroke-width:2;',
      'classDef recordCreate fill:#e6f4ff,stroke:#1e88e5,stroke-width:2;',
      'classDef recordUpdate fill:#fff4e5,stroke:#f57c00,stroke-width:2;',
      'classDef subflow fill:#f0f0f0,stroke:#8e57ff,stroke-width:2;',
      'classDef loop fill:#f6f6ff,stroke:#4b0082,stroke-width:2;',
      'classDef wait fill:#eaf7ff,stroke:#00acc1,stroke-width:2;',
      'classDef getRecords fill:#f5f5ff,stroke:#3949ab,stroke-width:2;',
      'classDef fault fill:#ffe0e0,stroke:#d50000,stroke-width:2;',
    ];

    lines.push(...classDefs);

    elements.forEach((element) => {
      const className = classMap[element.type];
      if (!className) {
        return;
      }
      lines.push(`    class ${element.id} ${className};`);
    });

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
}
