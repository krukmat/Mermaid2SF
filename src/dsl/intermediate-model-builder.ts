import { MermaidGraph, MermaidEdge } from '../types/mermaid';
import {
  FlowDSL,
  FlowElement,
  FlowVariable,
  DEFAULT_API_VERSION,
  StartElement,
  EndElement,
  AssignmentElement,
  DecisionElement,
  DecisionOutcome,
  ScreenElement,
  RecordCreateElement,
  RecordUpdateElement,
  SubflowElement,
} from '../types/flow-dsl';
import { ExtractedMetadata } from '../types/metadata';

export class IntermediateModelBuilder {
  /**
   * Build Flow DSL from Mermaid graph and extracted metadata
   * @param graph - Parsed Mermaid graph
   * @param metadataMap - Map of node ID to extracted metadata
   * @param flowApiName - API name for the Flow
   * @param flowLabel - Display label for the Flow
   * @returns Flow DSL
   */
  build(
    graph: MermaidGraph,
    metadataMap: Map<string, ExtractedMetadata>,
    flowApiName: string,
    flowLabel: string,
  ): FlowDSL {
    const elements = this.buildElements(graph, metadataMap);
    const startElement = this.findStartElement(elements);
    const variables = this.inferVariables(elements);

    return {
      version: 1,
      flowApiName,
      label: flowLabel,
      processType: 'Autolaunched',
      apiVersion: DEFAULT_API_VERSION,
      startElement,
      variables: variables.length > 0 ? variables : undefined,
      elements,
    };
  }

  private buildElements(
    graph: MermaidGraph,
    metadataMap: Map<string, ExtractedMetadata>,
  ): FlowElement[] {
    const elements: FlowElement[] = [];
    const edgeMap = this.buildEdgeMap(graph.edges);

    for (const node of graph.nodes) {
      const metadata = metadataMap.get(node.id);
      if (!metadata) {
        throw new Error(`No metadata found for node: ${node.id}`);
      }

      const element = this.createElementFromMetadata(node.id, metadata, edgeMap);
      elements.push(element);
    }

    // Sort elements by ID for deterministic output
    return elements.sort((a, b) => a.id.localeCompare(b.id));
  }

  private buildEdgeMap(edges: MermaidEdge[]): Map<string, MermaidEdge[]> {
    const map = new Map<string, MermaidEdge[]>();
    for (const edge of edges) {
      if (!map.has(edge.from)) {
        map.set(edge.from, []);
      }
      map.get(edge.from)!.push(edge);
    }
    return map;
  }

  private createElementFromMetadata(
    nodeId: string,
    metadata: ExtractedMetadata,
    edgeMap: Map<string, MermaidEdge[]>,
  ): FlowElement {
    const base = {
      id: nodeId,
      type: metadata.type,
      apiName: metadata.apiName,
      label: metadata.label,
    };

    switch (metadata.type) {
      case 'Start':
        return this.createStartElement(base, edgeMap);
      case 'End':
        return this.createEndElement(base);
      case 'Assignment':
        return this.createAssignmentElement(base, metadata, edgeMap);
      case 'Decision':
        return this.createDecisionElement(base, metadata, edgeMap);
      case 'Screen':
        return this.createScreenElement(base, metadata, edgeMap);
      case 'RecordCreate':
        return this.createRecordCreateElement(base, metadata, edgeMap);
      case 'RecordUpdate':
        return this.createRecordUpdateElement(base, metadata, edgeMap);
      case 'Subflow':
        return this.createSubflowElement(base, metadata, edgeMap);
      case 'Loop':
        return this.createLoopElement(base, metadata, edgeMap);
      case 'Wait':
        return this.createWaitElement(base, metadata, edgeMap);
      case 'GetRecords':
        return this.createGetRecordsElement(base, metadata, edgeMap);
      case 'Fault':
        return this.createFaultElement(base, edgeMap);
      default:
        throw new Error(`Unsupported element type: ${metadata.type}`);
    }
  }

  private createStartElement(base: any, edgeMap: Map<string, MermaidEdge[]>): StartElement {
    const edges = edgeMap.get(base.id) || [];
    return {
      ...base,
      type: 'Start',
      next: edges[0]?.to,
    };
  }

  private createEndElement(base: any): EndElement {
    return {
      ...base,
      type: 'End',
    };
  }

  private createAssignmentElement(
    base: any,
    metadata: ExtractedMetadata,
    edgeMap: Map<string, MermaidEdge[]>,
  ): AssignmentElement {
    const edges = edgeMap.get(base.id) || [];
    return {
      ...base,
      type: 'Assignment',
      assignments: metadata.properties.assignments || [],
      next: edges[0]?.to,
    };
  }

  private createDecisionElement(
    base: any,
    metadata: ExtractedMetadata,
    edgeMap: Map<string, MermaidEdge[]>,
  ): DecisionElement {
    const edges = edgeMap.get(base.id) || [];
    const outcomes = this.buildOutcomes(edges);

    return {
      ...base,
      type: 'Decision',
      outcomes,
    };
  }

  private buildOutcomes(edges: MermaidEdge[]): DecisionOutcome[] {
    const outcomes: DecisionOutcome[] = [];

    for (const edge of edges) {
      const isDefault = edge.label?.toLowerCase().includes('default') || false;

      outcomes.push({
        name: edge.label || 'Outcome',
        condition: isDefault ? undefined : edge.label,
        isDefault,
        next: edge.to,
      });
    }

    // Sort outcomes: non-default alphabetically, default last
    return outcomes.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return 1;
      if (!a.isDefault && b.isDefault) return -1;
      return a.name.localeCompare(b.name);
    });
  }

  private findStartElement(elements: FlowElement[]): string {
    const startElement = elements.find((el) => el.type === 'Start');
    return startElement ? startElement.id : '';
  }

  private inferVariables(elements: FlowElement[]): FlowVariable[] {
    const variableSet = new Set<string>();

    // Collect variables from Assignments
    for (const element of elements) {
      if (element.type === 'Assignment') {
        for (const assignment of element.assignments) {
          variableSet.add(assignment.variable);
        }
      }
    }

    // Convert to FlowVariable array
    const variables: FlowVariable[] = Array.from(variableSet).map((name) => ({
      name,
      dataType: this.inferDataType(name),
      isCollection: false,
      isInput: false,
      isOutput: false,
    }));

    // Sort variables alphabetically for determinism
    return variables.sort((a, b) => a.name.localeCompare(b.name));
  }

  private inferDataType(variableName: string): string {
    // Simple heuristic: v_Flag -> Boolean, v_Count -> Number, etc.
    if (variableName.toLowerCase().includes('flag')) return 'Boolean';
    if (variableName.toLowerCase().includes('count')) return 'Number';
    return 'String';
  }

  private createScreenElement(
    base: any,
    metadata: ExtractedMetadata,
    edgeMap: Map<string, MermaidEdge[]>,
  ): ScreenElement {
    const edges = edgeMap.get(base.id) || [];
    return {
      ...base,
      type: 'Screen',
      components: metadata.properties.components || [],
      next: edges[0]?.to,
    };
  }

  private createRecordCreateElement(
    base: any,
    metadata: ExtractedMetadata,
    edgeMap: Map<string, MermaidEdge[]>,
  ): RecordCreateElement {
    const edges = edgeMap.get(base.id) || [];
    return {
      ...base,
      type: 'RecordCreate',
      object: metadata.properties.object || '',
      fields: metadata.properties.fields || {},
      next: edges[0]?.to,
    };
  }

  private createRecordUpdateElement(
    base: any,
    metadata: ExtractedMetadata,
    edgeMap: Map<string, MermaidEdge[]>,
  ): RecordUpdateElement {
    const edges = edgeMap.get(base.id) || [];
    return {
      ...base,
      type: 'RecordUpdate',
      object: metadata.properties.object || '',
      fields: metadata.properties.fields || {},
      filters: metadata.properties.filters || [],
      next: edges[0]?.to,
    };
  }

  private createSubflowElement(
    base: any,
    metadata: ExtractedMetadata,
    edgeMap: Map<string, MermaidEdge[]>,
  ): SubflowElement {
    const edges = edgeMap.get(base.id) || [];
    return {
      ...base,
      type: 'Subflow',
      flowName: metadata.properties.flowName || '',
      inputAssignments: metadata.properties.inputAssignments || [],
      outputAssignments: metadata.properties.outputAssignments || [],
      next: edges[0]?.to,
    };
  }

  private createLoopElement(
    base: any,
    metadata: ExtractedMetadata,
    edgeMap: Map<string, MermaidEdge[]>,
  ) {
    const edges = edgeMap.get(base.id) || [];
    return {
      ...base,
      type: 'Loop',
      collection: metadata.properties.collection || '',
      next: edges[0]?.to,
    };
  }

  private createWaitElement(
    base: any,
    metadata: ExtractedMetadata,
    edgeMap: Map<string, MermaidEdge[]>,
  ) {
    const edges = edgeMap.get(base.id) || [];
    const waitType =
      (metadata.properties.waitType as any) ||
      (metadata.properties.eventName ? 'event' : undefined) ||
      (metadata.properties.durationValue ? 'duration' : undefined) ||
      (metadata.properties.condition ? 'condition' : undefined) ||
      'condition';
    return {
      ...base,
      type: 'Wait',
      waitType,
      condition: metadata.properties.condition,
      durationValue: metadata.properties.durationValue,
      durationUnit: metadata.properties.durationUnit,
      eventName: metadata.properties.eventName,
      next: edges[0]?.to,
    };
  }

  private createGetRecordsElement(
    base: any,
    metadata: ExtractedMetadata,
    edgeMap: Map<string, MermaidEdge[]>,
  ) {
    const edges = edgeMap.get(base.id) || [];
    return {
      ...base,
      type: 'GetRecords',
      object: metadata.properties.object || '',
      filters: metadata.properties.filters || [],
      fields: metadata.properties.fields || [],
      sortField: metadata.properties.sortField,
      sortDirection: metadata.properties.sortDirection,
      next: edges[0]?.to,
    };
  }

  private createFaultElement(base: any, edgeMap: Map<string, MermaidEdge[]>) {
    const edges = edgeMap.get(base.id) || [];
    return {
      ...base,
      type: 'Fault',
      next: edges[0]?.to,
    };
  }
}
