// TASK 2.4: Generate documentation from Flow DSL
import { FlowDSL, FlowElement } from '../types/flow-dsl';

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
    for (const element of dsl.elements) {
      const nodeId = element.id;
      const label = this.escapeLabel(element.label || element.apiName || element.id);

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
      }
    }

    // Generate edges
    for (const element of dsl.elements) {
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

    return lines.join('\n');
  }

  /**
   * Generate element details section
   * @param element - Flow element
   * @returns Markdown section
   */
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
