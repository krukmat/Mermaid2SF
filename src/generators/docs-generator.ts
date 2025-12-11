// TASK 2.4: Generate documentation from Flow DSL
import {
  AssignmentElement,
  DecisionElement,
  ElementType,
  FlowDSL,
  FlowElement,
  GetRecordsElement,
  LoopElement,
  RecordCreateElement,
  RecordUpdateElement,
  WaitElement,
} from '../types/flow-dsl';

export interface DocsOptions {
  /** Include Mermaid diagram */
  includeDiagram?: boolean;
  /** Include element details table */
  includeElementDetails?: boolean;
  /** Include variable table */
  includeVariables?: boolean;
  /** Include flow metadata */
  includeMetadata?: boolean;
}

export class DocsGenerator {
  /**
   * Generate Markdown documentation from Flow DSL
   * @param dsl - Flow DSL
   * @param options - Documentation options
   * @returns Markdown string
   */
  generateMarkdown(dsl: FlowDSL, options: DocsOptions = {}): string {
    const {
      includeDiagram = true,
      includeElementDetails = true,
      includeVariables = true,
      includeMetadata = true,
    } = options;

    const sections: string[] = [];

    // Title
    sections.push(`# ${dsl.label}`);
    sections.push('');

    // Metadata
    if (includeMetadata) {
      sections.push('## Flow Metadata');
      sections.push('');
      sections.push(`- **API Name**: \`${dsl.flowApiName}\``);
      sections.push(`- **Process Type**: ${dsl.processType}`);
      sections.push(`- **API Version**: ${dsl.apiVersion || 'Default'}`);
      sections.push(`- **DSL Version**: ${dsl.version}`);
      sections.push('');
    }

    // Mermaid diagram
    if (includeDiagram) {
      sections.push('## Flow Diagram');
      sections.push('');
      sections.push('```mermaid');
      sections.push(this.generateMermaidDiagram(dsl));
      sections.push('```');
      sections.push('');
    }

    // Variables
    if (includeVariables && dsl.variables && dsl.variables.length > 0) {
      sections.push('## Variables');
      sections.push('');
      sections.push('| Name | Data Type | Collection | Input | Output |');
      sections.push('|------|-----------|------------|-------|--------|');
      for (const variable of dsl.variables) {
        sections.push(
          `| \`${variable.name}\` | ${variable.dataType} | ${variable.isCollection ? 'Yes' : 'No'} | ${variable.isInput ? 'Yes' : 'No'} | ${variable.isOutput ? 'Yes' : 'No'} |`,
        );
      }
      sections.push('');
    }

    // Element details
    if (includeElementDetails) {
      sections.push('## Flow Elements');
      sections.push('');
      for (const element of dsl.elements) {
        sections.push(this.generateElementDetails(element));
      }
    }

    return sections.join('\n');
  }

  /**
   * Generate normalized Mermaid diagram from Flow DSL
   * @param dsl - Flow DSL
   * @returns Mermaid diagram string
   */
  generateMermaidDiagram(dsl: FlowDSL): string {
    const lines: string[] = [];
    lines.push('flowchart TD');

    // Generate nodes
    const orderedElements = this.orderElements(dsl);
    for (const element of orderedElements) {
      const nodeId = element.id;
      const label = this.buildMermaidLabel(element);

      switch (element.type) {
        case 'Start':
          lines.push(`    ${nodeId}([${label}])`);
          break;
        case 'End':
          lines.push(`    ${nodeId}([${label}])`);
          break;
        case 'Decision':
          lines.push(`    ${nodeId}{${label}}`);
          break;
        case 'Assignment':
          lines.push(`    ${nodeId}[${label}]`);
          break;
        case 'Screen':
          lines.push(`    ${nodeId}[${label}]`);
          break;
        case 'RecordCreate':
          lines.push(`    ${nodeId}[${label}]`);
          break;
        case 'RecordUpdate':
          lines.push(`    ${nodeId}[${label}]`);
          break;
        case 'Subflow':
          lines.push(`    ${nodeId}[[${label}]]`);
          break;
        case 'Loop':
          lines.push(`    ${nodeId}[${label}]`);
          break;
        case 'Wait':
          lines.push(`    ${nodeId}[${label}]`);
          break;
        case 'GetRecords':
          lines.push(`    ${nodeId}[${label}]`);
          break;
        case 'Fault':
          lines.push(`    ${nodeId}[${label}]`);
          break;
      }
    }

    // Generate edges
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

  /**
   * Generate element details section
   * @param element - Flow element
   * @returns Markdown section
   */
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

    // Append any remaining elements deterministically
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
      case 'Assignment':
        if ((element as AssignmentElement).assignments.length > 0) {
          const assignments = (element as AssignmentElement).assignments
            .map((assignment) => `${assignment.variable}=${assignment.value}`)
            .join(', ');
          details.push(`assignments: ${assignments}`);
        }
        break;
      case 'Decision':
        details.push(`outcomes: ${(element as DecisionElement).outcomes.length}`);
        break;
      case 'RecordCreate':
        {
          const rc = element as RecordCreateElement;
          details.push(`object: ${rc.object || 'RecordCreate'}`);
          const fields = Object.entries(rc.fields || {})
            .map(([field, value]) => `${field}=${value}`)
            .join('; ');
          if (fields) {
            details.push(`fields: ${fields}`);
          }
        }
        break;
      case 'RecordUpdate':
        {
          const ru = element as RecordUpdateElement;
          details.push(`object: ${ru.object || 'RecordUpdate'}`);
          const fields = Object.entries(ru.fields || {})
            .map(([field, value]) => `${field}=${value}`)
            .join('; ');
          if (fields) {
            details.push(`updates: ${fields}`);
          }
          if (ru.filters && ru.filters.length > 0) {
            const filters = ru.filters
              .map((filter) => `${filter.field}${filter.operator}${filter.value}`)
              .join('; ');
            details.push(`filters: ${filters}`);
          }
        }
        break;
      case 'Subflow':
        details.push(`flow: ${(element as any).flowName || 'Subflow'}`);
        break;
      case 'Loop':
        details.push(`collection: ${(element as LoopElement).collection || 'Loop'}`);
        break;
      case 'Wait':
        {
          const wait = element as WaitElement;
          if (wait.waitType) {
            details.push(`wait: ${wait.waitType}`);
          }
          if (wait.condition) {
            details.push(`condition: ${wait.condition}`);
          }
          if (wait.durationValue) {
            details.push(`duration: ${wait.durationValue}${wait.durationUnit || ''}`);
          }
          if (wait.eventName) {
            details.push(`event: ${wait.eventName}`);
          }
        }
        break;
      case 'GetRecords':
        {
          const lookup = element as GetRecordsElement;
          details.push(`object: ${lookup.object || 'Lookup'}`);
          if (lookup.filters && lookup.filters.length > 0) {
            const filters = lookup.filters
              .map((filter) => `${filter.field}${filter.operator}${filter.value}`)
              .join('; ');
            details.push(`filters: ${filters}`);
          }
        }
        break;
      case 'Fault':
        details.push('fault handler');
        break;
    }
    return details;
  }

  private generateStyleDefinitions(elements: FlowElement[]): string[] {
    const lines: string[] = [];
    const classMap: Record<ElementType, string> = {
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
    };

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

  private generateElementDetails(element: FlowElement): string {
    const sections: string[] = [];
    const apiName = element.apiName || element.id;
    const label = element.label || apiName;

    sections.push(`### ${label}`);
    sections.push('');
    sections.push(`- **Type**: ${element.type}`);
    sections.push(`- **API Name**: \`${apiName}\``);
    sections.push(`- **ID**: \`${element.id}\``);

    switch (element.type) {
      case 'Assignment':
        if (element.assignments.length > 0) {
          sections.push('- **Assignments**:');
          for (const assignment of element.assignments) {
            sections.push(`  - \`${assignment.variable}\` = \`${assignment.value}\``);
          }
        }
        break;

      case 'Decision':
        if (element.outcomes.length > 0) {
          sections.push('- **Outcomes**:');
          for (const outcome of element.outcomes) {
            const defaultTag = outcome.isDefault ? ' (default)' : '';
            sections.push(`  - **${outcome.name}**${defaultTag}: → \`${outcome.next}\``);
            if (outcome.condition) {
              sections.push(`    - Condition: \`${outcome.condition}\``);
            }
          }
        }
        break;

      case 'Screen':
        if (element.components.length > 0) {
          sections.push('- **Components**:');
          for (const component of element.components) {
            sections.push(`  - ${component.type}: \`${component.name}\``);
            if (component.dataType) {
              sections.push(`    - Data Type: ${component.dataType}`);
            }
            if (component.target) {
              sections.push(`    - Target: \`${component.target}\``);
            }
            if (component.text) {
              sections.push(`    - Text: "${component.text}"`);
            }
            if (component.required !== undefined) {
              sections.push(`    - Required: ${component.required ? 'Yes' : 'No'}`);
            }
          }
        }
        break;

      case 'RecordCreate':
        sections.push(`- **Object**: \`${element.object}\``);
        if (Object.keys(element.fields).length > 0) {
          sections.push('- **Fields**:');
          for (const [fieldName, value] of Object.entries(element.fields)) {
            sections.push(`  - \`${fieldName}\` = \`${value}\``);
          }
        }
        if (element.assignRecordIdToReference) {
          sections.push(`- **Assign Record ID To**: \`${element.assignRecordIdToReference}\``);
        }
        break;

      case 'RecordUpdate':
        sections.push(`- **Object**: \`${element.object}\``);
        if (element.filters && element.filters.length > 0) {
          sections.push('- **Filters**:');
          for (const filter of element.filters) {
            sections.push(`  - \`${filter.field}\` ${filter.operator} \`${filter.value}\``);
          }
        }
        if (Object.keys(element.fields).length > 0) {
          sections.push('- **Field Updates**:');
          for (const [fieldName, value] of Object.entries(element.fields)) {
            sections.push(`  - \`${fieldName}\` = \`${value}\``);
          }
        }
        break;

      case 'Subflow':
        sections.push(`- **Flow Name**: \`${element.flowName}\``);
        if (element.inputAssignments && element.inputAssignments.length > 0) {
          sections.push('- **Input Assignments**:');
          for (const assignment of element.inputAssignments) {
            sections.push(`  - \`${assignment.name}\` ← \`${assignment.value}\``);
          }
        }
        if (element.outputAssignments && element.outputAssignments.length > 0) {
          sections.push('- **Output Assignments**:');
          for (const assignment of element.outputAssignments) {
            sections.push(`  - \`${assignment.name}\` → \`${assignment.value}\``);
          }
        }
        break;
    }

    if ('next' in element && element.next) {
      sections.push(`- **Next**: → \`${element.next}\``);
    }

    sections.push('');
    return sections.join('\n');
  }

  /**
   * Escape special characters in Mermaid labels
   * @param text - Text to escape
   * @returns Escaped text
   */
  private escapeLabel(text: string): string {
    return text
      .replace(/"/g, '#quot;')
      .replace(/\[/g, '#91;')
      .replace(/]/g, '#93;')
      .replace(/\{/g, '#123;')
      .replace(/}/g, '#125;')
      .replace(/\(/g, '#40;')
      .replace(/\)/g, '#41;');
  }
}
