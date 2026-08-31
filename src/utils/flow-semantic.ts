import {
  FlowDSL,
  FlowElement,
  FlowValueLike,
  normalizeFlowValue,
  resolveFlowKind,
} from '../types/flow-dsl';

function stableValue(value: FlowValueLike): unknown { return normalizeFlowValue(value); }
function stableRecord(values: Record<string, FlowValueLike> | undefined): Record<string, unknown> {
  return Object.keys(values || {}).sort().reduce<Record<string, unknown>>((result, key) => {
    result[key] = stableValue((values || {})[key]); return result;
  }, {});
}
function stableNext(next: string | undefined, terminalIds: Set<string>): string | undefined {
  if (!next) return undefined; return terminalIds.has(next) ? '__TERMINAL__' : next;
}
function elementSnapshot(element: FlowElement, terminalIds: Set<string>): unknown {
  const common = { id: element.apiName || element.id, type: element.type, label: element.label || undefined, next: stableNext('next' in element ? element.next : undefined, terminalIds) };
  switch (element.type) {
    case 'Start': return common;
    case 'End': return undefined;
    case 'Assignment': return { ...common, assignments: [...element.assignments].map((item) => ({ variable: item.variable, value: stableValue(item.value) })).sort((a, b) => a.variable.localeCompare(b.variable)) };
    case 'Decision': return { ...common, conditionLogic: element.conditionLogic || undefined, outcomes: [...element.outcomes].map((outcome) => ({ name: outcome.name, isDefault: Boolean(outcome.isDefault), next: stableNext(outcome.next, terminalIds), conditionLogic: outcome.conditionLogic || undefined, conditions: (outcome.conditions || []).map((condition) => ({ left: stableValue(condition.left), operator: condition.operator, right: stableValue(condition.right) })) })).sort((a, b) => a.name.localeCompare(b.name)) };
    case 'Screen': return { ...common, allowBack: element.allowBack, allowFinish: element.allowFinish, components: [...element.components].map((component) => ({ ...component })) };
    case 'RecordCreate': return { ...common, object: element.object, fields: stableRecord(element.fields), assignRecordIdToReference: element.assignRecordIdToReference, storeOutputAutomatically: element.storeOutputAutomatically };
    case 'RecordUpdate': return { ...common, object: element.object, fields: stableRecord(element.fields), filterLogic: element.filterLogic, filters: (element.filters || []).map((filter) => ({ field: filter.field, operator: filter.operator, value: stableValue(filter.value) })) };
    case 'Subflow': return { ...common, flowName: element.flowName, inputAssignments: (element.inputAssignments || []).map((item) => ({ name: item.name, value: stableValue(item.value) })), outputAssignments: (element.outputAssignments || []).map((item) => ({ name: item.name, value: stableValue(item.value) })) };
    case 'GetRecords': return { ...common, object: element.object, fields: [...(element.fields || [])].sort(), filters: (element.filters || []).map((filter) => ({ field: filter.field, operator: filter.operator, value: stableValue(filter.value) })), sortField: element.sortField, sortDirection: element.sortDirection };
    case 'Loop': return { ...common, collection: element.collection };
    case 'Wait': return { ...common, waitType: element.waitType, condition: element.condition, durationValue: element.durationValue, durationUnit: element.durationUnit, eventName: element.eventName };
    case 'Fault': return common;
  }
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((result, key) => {
      const item = (value as Record<string, unknown>)[key];
      if (item !== undefined) result[key] = canonical(item);
      return result;
    }, {});
  }
  return value;
}
export function flowSemanticSnapshot(dsl: FlowDSL): unknown {
  const terminalIds = new Set(dsl.elements.filter((element) => element.type === 'End').map((element) => element.id));
  const start = dsl.elements.find((element) => element.id === dsl.startElement);
  const resources = [...(dsl.variables || [])].map((variable) => ({ ...variable })).sort((a, b) => a.name.localeCompare(b.name));
  const elements = dsl.elements.filter((element) => element.type !== 'Start' && element.type !== 'End').map((element) => elementSnapshot(element, terminalIds)).sort((a: any, b: any) => a.id.localeCompare(b.id));
  return canonical({
    flowApiName: dsl.flowApiName,
    label: dsl.label,
    flowKind: resolveFlowKind(dsl),
    apiVersion: dsl.apiVersion,
    status: dsl.status,
    startNext: stableNext(start && 'next' in start ? start.next : undefined, terminalIds),
    trigger: dsl.trigger ? { ...dsl.trigger, filters: (dsl.trigger.filters || []).map((filter) => ({ field: filter.field, operator: filter.operator, value: stableValue(filter.value) })) } : undefined,
    variables: resources,
    elements,
  });
}
export interface SemanticDiff { equal: boolean; expected: unknown; actual: unknown; }
export function semanticDiff(expected: FlowDSL, actual: FlowDSL): SemanticDiff {
  const expectedSnapshot = flowSemanticSnapshot(expected);
  const actualSnapshot = flowSemanticSnapshot(actual);
  return { equal: JSON.stringify(expectedSnapshot) === JSON.stringify(actualSnapshot), expected: expectedSnapshot, actual: actualSnapshot };
}
