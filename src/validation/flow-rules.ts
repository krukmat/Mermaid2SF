import { FlowDSL, FlowElement, ElementType, DecisionElement } from '../types/flow-dsl';
import { FlowValidator } from '../validator/flow-validator';

/** Compatibility facade for the pre-v2 visual validation API. */
export interface FlowNode {
  id: string;
  type: ElementType;
  apiName?: string;
  label?: string;
  next?: string;
  yesNext?: string;
  noNext?: string;
  loopCondition?: string;
  iterationCount?: string;
  outcomes?: DecisionOutcomeNode[];
}

export interface DecisionOutcomeNode {
  name?: string;
  next?: string;
  isDefault?: boolean;
}

export type ValidationSeverity = 'error' | 'warning';
export interface FlowValidationMessage {
  code: string;
  severity: ValidationSeverity;
  message: string;
  nodes: string[];
}
export interface FlowValidationResult {
  errors: FlowValidationMessage[];
  warnings: FlowValidationMessage[];
  all: FlowValidationMessage[];
  isValid: boolean;
}

function toMessage(
  severity: ValidationSeverity,
  item: { code: string; message: string; elementId?: string },
): FlowValidationMessage {
  return { code: item.code, severity, message: item.message, nodes: item.elementId ? [item.elementId] : [] };
}

function adaptResult(dsl: FlowDSL): FlowValidationResult {
  const result = new FlowValidator().validate(dsl);
  const errors = result.errors.map((item) => toMessage('error', item));
  const warnings = result.warnings.map((item) => toMessage('warning', item));
  return { errors, warnings, all: [...errors, ...warnings], isValid: errors.length === 0 };
}

function legacyMessage(code: string, severity: ValidationSeverity, message: string, nodes: string[] = []): FlowValidationMessage {
  return { code, severity, message, nodes };
}

function validateLegacyVisualRules(nodes: FlowNode[]): FlowValidationResult {
  const errors: FlowValidationMessage[] = [];
  const warnings: FlowValidationMessage[] = [];
  const registry = new Map(nodes.map((node) => [node.id, node]));
  const starts = nodes.filter((node) => node.type === 'Start');
  const ends = nodes.filter((node) => node.type === 'End');

  if (starts.length === 0) errors.push(legacyMessage('missing-start', 'error', 'Flow must have exactly one Start element.'));
  if (starts.length > 1) errors.push(legacyMessage('multiple-starts', 'error', 'Flow cannot contain more than one Start element.', starts.map((node) => node.id)));
  if (ends.length === 0) errors.push(legacyMessage('missing-end', 'error', 'Flow must have at least one End element.'));

  const apiNames = new Map<string, string>();
  for (const node of nodes) {
    if (node.apiName) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(node.apiName)) {
        errors.push(legacyMessage('invalid-api-name', 'error', `Invalid API name '${node.apiName}'.`, [node.id]));
      } else if (apiNames.has(node.apiName)) {
        errors.push(legacyMessage('duplicate-api-name', 'error', `Duplicate API name '${node.apiName}'.`, [node.id, apiNames.get(node.apiName)!]));
      } else apiNames.set(node.apiName, node.id);
    }
  }

  const adjacency = new Map<string, Set<string>>();
  const connect = (from: string, to?: string) => {
    if (!to) return;
    if (!registry.has(to)) errors.push(legacyMessage('missing-target', 'error', `${from} references nonexistent target ${to}.`, [from]));
    if (!adjacency.has(from)) adjacency.set(from, new Set());
    adjacency.get(from)!.add(to);
  };

  for (const node of nodes) {
    if (node.type !== 'End' && node.type !== 'Decision' && !node.next) {
      errors.push(legacyMessage('missing-next', 'error', `${node.type} ${node.id} must specify a next element.`, [node.id]));
    }
    if (node.type === 'Decision') {
      const outcomes = normalizeDecisionOutcomes(node);
      if (outcomes.length === 0) errors.push(legacyMessage('missing-decision-paths', 'error', `Decision ${node.id} requires at least one outcome.`, [node.id]));
      const defaults = outcomes.filter((outcome) => outcome.isDefault);
      if (defaults.length === 0) errors.push(legacyMessage('missing-default-outcome', 'error', `Decision ${node.id} must declare a default outcome.`, [node.id]));
      if (defaults.length > 1) errors.push(legacyMessage('multiple-default-outcomes', 'error', `Decision ${node.id} has multiple default outcomes.`, [node.id]));
      for (const outcome of outcomes) connect(node.id, outcome.next);
    } else connect(node.id, node.next);

    if (node.type === 'Loop' && !node.loopCondition) warnings.push(legacyMessage('missing-loop-condition', 'warning', `Loop ${node.id} is missing loopCondition.`, [node.id]));
    if (node.type === 'Loop' && !node.iterationCount) warnings.push(legacyMessage('missing-loop-iterations', 'warning', `Loop ${node.id} should declare an iteration limit.`, [node.id]));
  }

  if (starts[0]) {
    const reachable = new Set<string>();
    const queue = [starts[0].id];
    while (queue.length) {
      const id = queue.shift()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      for (const next of adjacency.get(id) || []) queue.push(next);
    }
    for (const node of nodes) {
      if (!reachable.has(node.id)) errors.push(legacyMessage('unreachable-node', 'error', `Node ${node.id} is not reachable from Start.`, [node.id]));
    }
  }

  return { errors, warnings, all: [...errors, ...warnings], isValid: errors.length === 0 };
}

function normalizeDecisionOutcomes(node: FlowNode): DecisionElement['outcomes'] {
  const outcomes: DecisionElement['outcomes'] = [];
  for (const outcome of node.outcomes || []) {
    if (outcome.next) outcomes.push({ name: outcome.name || 'Outcome', next: outcome.next, isDefault: outcome.isDefault });
  }
  if (node.yesNext) outcomes.push({ name: 'Yes', next: node.yesNext });
  if (node.noNext) outcomes.push({ name: 'Default', next: node.noNext, isDefault: true });
  return outcomes;
}

function nodeToElement(node: FlowNode): FlowElement {
  const base = { id: node.id, type: node.type, apiName: node.apiName, label: node.label, next: node.next };
  switch (node.type) {
    case 'Start': return { ...base, type: 'Start' };
    case 'End': return { ...base, type: 'End', next: undefined };
    case 'Assignment': return { ...base, type: 'Assignment', assignments: [] };
    case 'Decision': return { ...base, type: 'Decision', next: undefined, outcomes: normalizeDecisionOutcomes(node) };
    case 'Screen': return { ...base, type: 'Screen', components: [] };
    case 'RecordCreate': return { ...base, type: 'RecordCreate', object: 'CompatibilityObject', fields: {} };
    case 'RecordUpdate': return { ...base, type: 'RecordUpdate', object: 'CompatibilityObject', fields: {} };
    case 'Subflow': return { ...base, type: 'Subflow', flowName: 'CompatibilitySubflow' };
    case 'Loop': return { ...base, type: 'Loop', collection: 'CompatibilityCollection' };
    case 'Wait': return { ...base, type: 'Wait', waitType: 'condition', condition: 'true' };
    case 'GetRecords': return { ...base, type: 'GetRecords', object: 'CompatibilityObject' };
    case 'Fault': return { ...base, type: 'Fault' };
  }
}

export function validateFlow(nodes: FlowNode[]): FlowValidationResult {
  return validateLegacyVisualRules(nodes);
}

export function convertDslToFlowNodes(dsl: FlowDSL): FlowNode[] {
  return dsl.elements.map((element) => {
    const node: FlowNode = { id: element.id, type: element.type, apiName: element.apiName, label: element.label };
    if ('next' in element && element.next) node.next = element.next;
    if (element.type === 'Decision') node.outcomes = element.outcomes.map((outcome) => ({ name: outcome.name, next: outcome.next, isDefault: outcome.isDefault }));
    return node;
  });
}

export function validateDsl(dsl: FlowDSL): FlowValidationResult {
  return adaptResult(dsl);
}
