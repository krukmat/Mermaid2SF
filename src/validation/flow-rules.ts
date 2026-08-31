import { FlowDSL, FlowElement, ElementType, DecisionElement } from '../types/flow-dsl';
import { FlowValidator } from '../validator/flow-validator';

/**
 * Compatibility facade for the pre-v2 visual validation API.
 *
 * The canonical validation implementation is FlowValidator. This module only
 * adapts its result shape for callers that still consume FlowValidationResult.
 */
export interface FlowNode {
  id: string;
  type: ElementType;
  apiName?: string;
  label?: string;
  next?: string;
  yesNext?: string;
  noNext?: string;
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
  return {
    code: item.code,
    severity,
    message: item.message,
    nodes: item.elementId ? [item.elementId] : [],
  };
}

function adaptResult(dsl: FlowDSL): FlowValidationResult {
  const result = new FlowValidator().validate(dsl);
  const errors = result.errors.map((item) => toMessage('error', item));
  const warnings = result.warnings.map((item) => toMessage('warning', item));
  return { errors, warnings, all: [...errors, ...warnings], isValid: errors.length === 0 };
}

function normalizeDecisionOutcomes(node: FlowNode): DecisionElement['outcomes'] {
  const outcomes: DecisionElement['outcomes'] = [];
  if (node.outcomes) {
    for (const outcome of node.outcomes) {
      if (outcome.next) {
        outcomes.push({
          name: outcome.name || 'Outcome',
          next: outcome.next,
          isDefault: outcome.isDefault,
        });
      }
    }
  }
  if (node.yesNext) {
    outcomes.push({ name: 'Yes', next: node.yesNext });
  }
  if (node.noNext) {
    outcomes.push({ name: 'Default', next: node.noNext, isDefault: true });
  }
  return outcomes;
}

function nodeToElement(node: FlowNode): FlowElement {
  const base = {
    id: node.id,
    type: node.type,
    apiName: node.apiName,
    label: node.label,
    next: node.next,
  };

  switch (node.type) {
    case 'Start':
      return { ...base, type: 'Start' };
    case 'End':
      return { ...base, type: 'End', next: undefined };
    case 'Assignment':
      return { ...base, type: 'Assignment', assignments: [] };
    case 'Decision':
      return { ...base, type: 'Decision', next: undefined, outcomes: normalizeDecisionOutcomes(node) };
    case 'Screen':
      return { ...base, type: 'Screen', components: [] };
    case 'RecordCreate':
      return { ...base, type: 'RecordCreate', object: 'CompatibilityObject', fields: {} };
    case 'RecordUpdate':
      return { ...base, type: 'RecordUpdate', object: 'CompatibilityObject', fields: {} };
    case 'Subflow':
      return { ...base, type: 'Subflow', flowName: 'CompatibilitySubflow' };
    case 'Loop':
      return { ...base, type: 'Loop', collection: 'CompatibilityCollection' };
    case 'Wait':
      return { ...base, type: 'Wait', waitType: 'condition', condition: 'true' };
    case 'GetRecords':
      return { ...base, type: 'GetRecords', object: 'CompatibilityObject' };
    case 'Fault':
      return { ...base, type: 'Fault' };
  }
}

export function validateFlow(nodes: FlowNode[]): FlowValidationResult {
  const start = nodes.find((node) => node.type === 'Start');
  const elements = nodes.map(nodeToElement);
  const dsl: FlowDSL = {
    version: 1,
    flowApiName: 'CompatibilityFlow',
    label: 'Compatibility Flow',
    processType: nodes.some((node) => node.type === 'Screen') ? 'Screen' : 'Autolaunched',
    startElement: start?.id || '',
    elements,
  };
  return adaptResult(dsl);
}

export function convertDslToFlowNodes(dsl: FlowDSL): FlowNode[] {
  return dsl.elements.map((element) => {
    const node: FlowNode = {
      id: element.id,
      type: element.type,
      apiName: element.apiName,
      label: element.label,
    };
    if ('next' in element && element.next) node.next = element.next;
    if (element.type === 'Decision') {
      node.outcomes = element.outcomes.map((outcome) => ({
        name: outcome.name,
        next: outcome.next,
        isDefault: outcome.isDefault,
      }));
    }
    return node;
  });
}

export function validateDsl(dsl: FlowDSL): FlowValidationResult {
  return adaptResult(dsl);
}
