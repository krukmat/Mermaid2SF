import {
  FlowDSL,
  FlowElement,
  isDecisionElement,
  isRecordUpdateElement,
  isRecordCreateElement,
  isScreenElement,
  isAssignmentElement,
  isSubflowElement,
} from '../types/flow-dsl';

/**
 * TASK F5.4: Generate Mermaid flowchart diagrams from Flow DSL
 * Converts DSL representation back to visual Mermaid format with all metadata
 */
export class MermaidGenerator {
  generate(dsl: FlowDSL): string {
    const lines: string[] = ['flowchart TD'];

    // Render all nodes
    for (const element of dsl.elements) {
      lines.push(this.renderNode(element));
    }

    // Add blank line between nodes and edges for readability
    lines.push('');

    // Render all edges
    for (const element of dsl.elements) {
      const edges = this.renderEdges(element);
      lines.push(...edges);
    }

    return lines.filter(Boolean).join('\n');
  }

  private renderNode(element: FlowElement): string {
    const shape = this.getShape(element.type);
    const content = this.renderContent(element);
    return `    ${element.id}${shape.open}${content}${shape.close}`;
  }

  private renderContent(element: FlowElement): string {
    const lines: string[] = [];

    // Type prefix (START:, DECISION:, etc.)
    lines.push(this.getTypePrefix(element.type) + (element.label || element.id));

    // API name if present
    if (element.apiName && element.apiName !== element.id) {
      lines.push(`api: ${element.apiName}`);
    }

    // Element-specific metadata
    if (isDecisionElement(element)) {
      if (element.conditionLogic) {
        lines.push(`conditionLogic: ${element.conditionLogic}`);
      }
    }

    if (isRecordUpdateElement(element)) {
      if (element.filterLogic) {
        lines.push(`filterLogic: ${element.filterLogic}`);
      }
    }

    // Layout coordinates (all elements can have layout)
    if (element.layout) {
      lines.push(`layout: pos: ${element.layout.x},${element.layout.y}`);
    }

    return lines.join('\n');
  }

  private renderEdges(element: FlowElement): string[] {
    const edges: string[] = [];

    // Decision: outcomes become labeled edges
    if (isDecisionElement(element)) {
      for (const outcome of element.outcomes) {
        const label = outcome.isDefault ? `${outcome.name} default` : outcome.name;
        edges.push(`    ${element.id} -->|${label}| ${outcome.next}`);
      }
    }
    // Other elements: single next edge
    else if (element.next) {
      edges.push(`    ${element.id} --> ${element.next}`);
    }

    return edges;
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
      RecordLookup: 'LOOKUP: ',
      GetRecords: 'GETRECORDS: ',
      Subflow: 'SUBFLOW: ',
      Loop: 'LOOP: ',
      Wait: 'WAIT: ',
      Fault: 'FAULT: ',
    };
    return prefixes[type] || '';
  }
}
