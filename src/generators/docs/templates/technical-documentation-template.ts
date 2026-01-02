import { FlowDSL, FlowElement } from '../../../types/flow-dsl';
import { DocumentationTemplate } from './documentation-template';
import { DiagramRenderer } from '../renderers/diagram-renderer';
import { DocumentationFormatter } from '../formatters/documentation-formatter';

export interface DocsOptions {
  includeDiagram?: boolean;
  includeElementDetails?: boolean;
  includeVariables?: boolean;
  includeMetadata?: boolean;
}

export class TechnicalDocumentationTemplate extends DocumentationTemplate {
  constructor(
    private readonly renderer: DiagramRenderer,
    private readonly formatter: DocumentationFormatter,
    private readonly options: DocsOptions = {},
  ) {
    super();
  }

  protected generateHeader(dsl: FlowDSL): string {
    return `# ${dsl.label}`;
  }

  protected generateContent(dsl: FlowDSL): string {
    const {
      includeDiagram = true,
      includeElementDetails = true,
      includeVariables = true,
      includeMetadata = true,
    } = this.options;

    const payload = {
      metadata: includeMetadata ? this.renderMetadata(dsl) : undefined,
      diagram: includeDiagram ? this.renderDiagram(dsl) : undefined,
      variables:
        includeVariables && dsl.variables && dsl.variables.length > 0
          ? this.renderVariables(dsl)
          : undefined,
      elements: includeElementDetails ? this.renderElements(dsl) : undefined,
    };

    return this.formatter.format(payload);
  }

  protected generateFooter(): string {
    return '';
  }

  private renderMetadata(dsl: FlowDSL): string {
    return [
      '## Flow Metadata',
      '',
      `- **API Name**: \`${dsl.flowApiName}\``,
      `- **Process Type**: ${dsl.processType}`,
      `- **API Version**: ${dsl.apiVersion || 'Default'}`,
      `- **DSL Version**: ${dsl.version}`,
    ].join('\n');
  }

  private renderDiagram(dsl: FlowDSL): string {
    return ['## Flow Diagram', '', '```mermaid', this.renderer.render(dsl), '```'].join(
      '\n',
    );
  }

  private renderVariables(dsl: FlowDSL): string {
    const lines: string[] = [];
    lines.push('## Variables');
    lines.push('');
    lines.push('| Name | Data Type | Collection | Input | Output |');
    lines.push('|------|-----------|------------|-------|--------|');
    for (const variable of dsl.variables || []) {
      lines.push(
        `| \`${variable.name}\` | ${variable.dataType} | ${variable.isCollection ? 'Yes' : 'No'} | ${variable.isInput ? 'Yes' : 'No'} | ${variable.isOutput ? 'Yes' : 'No'} |`,
      );
    }
    return lines.join('\n');
  }

  private renderElements(dsl: FlowDSL): string {
    const sections: string[] = [];
    sections.push('## Flow Elements');
    sections.push('');
    for (const element of dsl.elements) {
      sections.push(this.renderElementDetails(element));
    }
    return sections.join('\n');
  }

  private renderElementDetails(element: FlowElement): string {
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
}
