import { MermaidGraph, MermaidEdge } from '../types/mermaid';
import {
  FlowDSL,
  FlowElement,
  FlowVariable,
  DEFAULT_API_VERSION,
  DEFAULT_FLOW_STATUS,
  FlowBuildOptions,
  FlowKind,
  StartElement,
  EndElement,
  AssignmentElement,
  DecisionElement,
  DecisionOutcome,
  ScreenElement,
  RecordCreateElement,
  RecordUpdateElement,
  SubflowElement,
  normalizeFlowValue,
  parseConditionExpression,
} from '../types/flow-dsl';
import { ExtractedMetadata } from '../types/metadata';

export class IntermediateModelBuilder {
  build(
    graph: MermaidGraph,
    metadataMap: Map<string, ExtractedMetadata>,
    flowApiName: string,
    flowLabel: string,
    options: FlowBuildOptions = {},
  ): FlowDSL {
    const elements = this.buildElements(graph, metadataMap);
    const startElement = this.findStartElement(elements);
    const startMetadata = metadataMap.get(startElement)?.properties || {};
    const flowKind = options.flowKind || startMetadata.flowKind || this.inferFlowKind(elements);
    const declaredVariables = options.variables || startMetadata.variables || [];
    const variables = this.mergeVariables(declaredVariables, this.inferLegacyVariables(elements));

    return {
      version: 2,
      flowApiName,
      label: flowLabel,
      flowKind,
      processType: flowKind,
      apiVersion: options.apiVersion || startMetadata.apiVersion || DEFAULT_API_VERSION,
      status: options.status || startMetadata.status || DEFAULT_FLOW_STATUS,
      trigger: options.trigger || startMetadata.trigger,
      startElement,
      variables: variables.length > 0 ? variables : undefined,
      elements,
    };
  }

  private inferFlowKind(elements: FlowElement[]): FlowKind {
    return elements.some((element) => element.type === 'Screen') ? 'Screen' : 'Autolaunched';
  }

  private mergeVariables(declared: FlowVariable[], legacy: FlowVariable[]): FlowVariable[] {
    const byName = new Map<string, FlowVariable>();
    for (const variable of legacy) byName.set(variable.name, variable);
    for (const variable of declared) byName.set(variable.name, variable);
    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private buildElements(graph: MermaidGraph, metadataMap: Map<string, ExtractedMetadata>): FlowElement[] {
    const edgeMap = this.buildEdgeMap(graph.edges);
    return graph.nodes
      .map((node) => {
        const metadata = metadataMap.get(node.id);
        if (!metadata) throw new Error(`No metadata found for node: ${node.id}`);
        return this.createElementFromMetadata(node.id, metadata, edgeMap);
      })
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  private buildEdgeMap(edges: MermaidEdge[]): Map<string, MermaidEdge[]> {
    const map = new Map<string, MermaidEdge[]>();
    for (const edge of edges) {
      const list = map.get(edge.from) || [];
      list.push(edge);
      map.set(edge.from, list);
    }
    return map;
  }

  private createElementFromMetadata(nodeId: string, metadata: ExtractedMetadata, edgeMap: Map<string, MermaidEdge[]>): FlowElement {
    const base = { id: nodeId, type: metadata.type, apiName: metadata.apiName, label: metadata.label };
    switch (metadata.type) {
      case 'Start': return this.createStartElement(base, edgeMap);
      case 'End': return this.createEndElement(base);
      case 'Assignment': return this.createAssignmentElement(base, metadata, edgeMap);
      case 'Decision': return this.createDecisionElement(base, edgeMap);
      case 'Screen': return this.createScreenElement(base, metadata, edgeMap);
      case 'RecordCreate': return this.createRecordCreateElement(base, metadata, edgeMap);
      case 'RecordUpdate': return this.createRecordUpdateElement(base, metadata, edgeMap);
      case 'Subflow': return this.createSubflowElement(base, metadata, edgeMap);
      case 'Loop': return this.createLoopElement(base, metadata, edgeMap);
      case 'Wait': return this.createWaitElement(base, metadata, edgeMap);
      case 'GetRecords': return this.createGetRecordsElement(base, metadata, edgeMap);
      case 'Fault': return this.createFaultElement(base, edgeMap);
    }
  }

  private createStartElement(base: any, edgeMap: Map<string, MermaidEdge[]>): StartElement {
    return { ...base, type: 'Start', next: (edgeMap.get(base.id) || [])[0]?.to };
  }

  private createEndElement(base: any): EndElement { return { ...base, type: 'End' }; }

  private createAssignmentElement(base: any, metadata: ExtractedMetadata, edgeMap: Map<string, MermaidEdge[]>): AssignmentElement {
    const assignments = (metadata.properties.assignments || []).map((item: any) => ({
      variable: item.variable,
      value: normalizeFlowValue(item.value),
    }));
    return { ...base, type: 'Assignment', assignments, next: (edgeMap.get(base.id) || [])[0]?.to };
  }

  private createDecisionElement(base: any, edgeMap: Map<string, MermaidEdge[]>): DecisionElement {
    return { ...base, type: 'Decision', outcomes: this.buildOutcomes(edgeMap.get(base.id) || []) };
  }

  private buildOutcomes(edges: MermaidEdge[]): DecisionOutcome[] {
    const outcomes = edges.map((edge) => this.buildOutcome(edge));
    return outcomes.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return 1;
      if (!a.isDefault && b.isDefault) return -1;
      return a.name.localeCompare(b.name);
    });
  }

  private buildOutcome(edge: MermaidEdge): DecisionOutcome {
    const raw = edge.label?.trim() || 'Outcome';
    const isDefault = /\bdefault\b/i.test(raw);
    if (isDefault) {
      const name = raw.replace(/[\s(]*default[\s)]*/i, ' ').trim() || 'Default';
      return { name, isDefault: true, next: edge.to };
    }

    const explicit = raw.match(/^(.*?)\s*(?:::|\s+if\s+)\s*(.+)$/i);
    const name = explicit?.[1]?.trim() || raw;
    const expression = explicit?.[2]?.trim();
    const parsed = expression ? parseConditionExpression(expression) : undefined;
    return {
      name,
      condition: expression || raw,
      conditions: parsed ? [parsed] : undefined,
      isDefault: false,
      next: edge.to,
    };
  }

  private findStartElement(elements: FlowElement[]): string {
    return elements.find((element) => element.type === 'Start')?.id || '';
  }

  private inferLegacyVariables(elements: FlowElement[]): FlowVariable[] {
    const names = new Set<string>();
    for (const element of elements) {
      if (element.type !== 'Assignment') continue;
      for (const assignment of element.assignments) {
        if (/^[A-Za-z][A-Za-z0-9_]*$/.test(assignment.variable)) names.add(assignment.variable);
      }
    }
    return Array.from(names).sort().map((name) => ({
      name,
      dataType: 'String',
      isCollection: false,
      isInput: false,
      isOutput: false,
    }));
  }

  private normalizeFields(fields: Record<string, any>): Record<string, ReturnType<typeof normalizeFlowValue>> {
    const result: Record<string, ReturnType<typeof normalizeFlowValue>> = {};
    for (const [field, value] of Object.entries(fields || {})) result[field] = normalizeFlowValue(value as any);
    return result;
  }

  private normalizeFilters(filters: any[]) {
    return (filters || []).map((filter) => ({ ...filter, value: normalizeFlowValue(filter.value) }));
  }

  private createScreenElement(base: any, metadata: ExtractedMetadata, edgeMap: Map<string, MermaidEdge[]>): ScreenElement {
    return { ...base, type: 'Screen', components: metadata.properties.components || [], next: (edgeMap.get(base.id) || [])[0]?.to };
  }

  private createRecordCreateElement(base: any, metadata: ExtractedMetadata, edgeMap: Map<string, MermaidEdge[]>): RecordCreateElement {
    return { ...base, type: 'RecordCreate', object: metadata.properties.object || '', fields: this.normalizeFields(metadata.properties.fields || {}), next: (edgeMap.get(base.id) || [])[0]?.to };
  }

  private createRecordUpdateElement(base: any, metadata: ExtractedMetadata, edgeMap: Map<string, MermaidEdge[]>): RecordUpdateElement {
    return { ...base, type: 'RecordUpdate', object: metadata.properties.object || '', fields: this.normalizeFields(metadata.properties.fields || {}), filters: this.normalizeFilters(metadata.properties.filters || []), next: (edgeMap.get(base.id) || [])[0]?.to };
  }

  private createSubflowElement(base: any, metadata: ExtractedMetadata, edgeMap: Map<string, MermaidEdge[]>): SubflowElement {
    const inputs = (metadata.properties.inputAssignments || []).map((item: any) => ({ ...item, value: normalizeFlowValue(item.value) }));
    const outputs = (metadata.properties.outputAssignments || []).map((item: any) => ({ ...item, value: normalizeFlowValue(item.value) }));
    return { ...base, type: 'Subflow', flowName: metadata.properties.flowName || '', inputAssignments: inputs, outputAssignments: outputs, next: (edgeMap.get(base.id) || [])[0]?.to };
  }

  private createLoopElement(base: any, metadata: ExtractedMetadata, edgeMap: Map<string, MermaidEdge[]>) {
    return { ...base, type: 'Loop' as const, collection: metadata.properties.collection || '', next: (edgeMap.get(base.id) || [])[0]?.to };
  }

  private createWaitElement(base: any, metadata: ExtractedMetadata, edgeMap: Map<string, MermaidEdge[]>) {
    const waitType = metadata.properties.waitType || (metadata.properties.eventName ? 'event' : metadata.properties.durationValue ? 'duration' : 'condition');
    return { ...base, type: 'Wait' as const, waitType, condition: metadata.properties.condition, durationValue: metadata.properties.durationValue, durationUnit: metadata.properties.durationUnit, eventName: metadata.properties.eventName, next: (edgeMap.get(base.id) || [])[0]?.to };
  }

  private createGetRecordsElement(base: any, metadata: ExtractedMetadata, edgeMap: Map<string, MermaidEdge[]>) {
    return { ...base, type: 'GetRecords' as const, object: metadata.properties.object || '', filters: this.normalizeFilters(metadata.properties.filters || []), fields: metadata.properties.fields || [], sortField: metadata.properties.sortField, sortDirection: metadata.properties.sortDirection, next: (edgeMap.get(base.id) || [])[0]?.to };
  }

  private createFaultElement(base: any, edgeMap: Map<string, MermaidEdge[]>) {
    return { ...base, type: 'Fault' as const, next: (edgeMap.get(base.id) || [])[0]?.to };
  }
}
