import { ElementType, FlowDSL, FlowElement, DecisionElement } from '../types/flow-dsl';

export interface FlowNode extends BaseNode {
  yesNext?: string;
  noNext?: string;
  loopCondition?: string;
  iterationCount?: string;
  waitFor?: string;
  waitDuration?: string;
  faultSource?: string;
  faultMessage?: string;
  outcomes?: DecisionOutcomeNode[];
}

export interface BaseNode {
  id: string;
  type: ElementType;
  apiName?: string;
  label?: string;
  next?: string;
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

const requiredNextTypes: ElementType[] = [
  'Start',
  'Screen',
  'Assignment',
  'RecordCreate',
  'RecordUpdate',
  'Subflow',
  'Loop',
  'Wait',
  'GetRecords',
  'Fault',
];

const numericIdRegEx = /^[A-Za-z_][A-Za-z0-9_]*$/;

function createMessage(
  code: string,
  severity: ValidationSeverity,
  message: string,
  nodes: string[] = [],
): FlowValidationMessage {
  return { code, severity, message, nodes };
}

function normalizeDecisionOutcomes(node: FlowNode): DecisionOutcomeNode[] {
  const outcomes: DecisionOutcomeNode[] = [];
  if (Array.isArray(node.outcomes)) {
    outcomes.push(...node.outcomes);
  }
  if (node.yesNext) {
    outcomes.push({ name: 'Yes', next: node.yesNext });
  }
  if (node.noNext) {
    outcomes.push({ name: 'No', next: node.noNext, isDefault: true });
  }
  return outcomes;
}

export function validateFlow(nodes: FlowNode[]): FlowValidationResult {
  const errors: FlowValidationMessage[] = [];
  const warnings: FlowValidationMessage[] = [];
  const registry = new Map<string, FlowNode>();
  nodes.forEach((node) => registry.set(node.id, node));

  const starts = nodes.filter((node) => node.type === 'Start');
  if (starts.length === 0) {
    errors.push(
      createMessage('missing-start', 'error', 'Flow must have exactly one Start element.'),
    );
  } else if (starts.length > 1) {
    errors.push(
      createMessage(
        'multiple-starts',
        'error',
        'Flow cannot contain more than one Start element.',
        starts.map((node) => node.id),
      ),
    );
  }

  const ends = nodes.filter((node) => node.type === 'End');
  if (ends.length === 0) {
    errors.push(createMessage('missing-end', 'error', 'Flow must have at least one End element.'));
  }

  const apiNameMap = new Map<string, FlowNode>();
  nodes.forEach((node) => {
    if (node.apiName) {
      if (!numericIdRegEx.test(node.apiName)) {
        errors.push(
          createMessage(
            'invalid-api-name',
            'error',
            `${node.type} ${node.id} uses an invalid API name '${node.apiName}'.`,
            [node.id],
          ),
        );
      } else if (apiNameMap.has(node.apiName)) {
        errors.push(
          createMessage(
            'duplicate-api-name',
            'error',
            `API name '${node.apiName}' is defined by multiple nodes.`,
            [node.id, apiNameMap.get(node.apiName)!.id],
          ),
        );
      } else {
        apiNameMap.set(node.apiName, node);
      }
    }
  });

  const adjacency = new Map<string, Set<string>>();
  const addEdge = (from: string, to?: string | null) => {
    if (!to) return;
    if (!adjacency.has(from)) adjacency.set(from, new Set());
    adjacency.get(from)!.add(to);
  };

  const registerTarget = (node: FlowNode, prop: string, targetId?: string) => {
    if (!targetId) return;
    if (!registry.has(targetId)) {
      errors.push(
        createMessage(
          'missing-target',
          'error',
          `${node.type} ${node.id} references a nonexistent target (${prop} -> ${targetId}).`,
          [node.id],
        ),
      );
    } else {
      addEdge(node.id, targetId);
    }
  };

  nodes.forEach((node) => {
    if (requiredNextTypes.includes(node.type) && node.type !== 'Decision' && !node.next) {
      errors.push(
        createMessage(
          'missing-next',
          'error',
          `${node.type} ${node.id} must specify a next element.`,
          [node.id],
        ),
      );
    }

    if (node.type === 'Decision') {
      const outcomes = normalizeDecisionOutcomes(node);
      const outcomesWithNext = outcomes.filter((outcome) => Boolean(outcome.next));
      const defaultOutcomes = outcomesWithNext.filter((outcome) => outcome.isDefault);
      if (outcomesWithNext.length === 0) {
        errors.push(
          createMessage(
            'missing-decision-paths',
            'error',
            `Decision ${node.id} requires at least one outcome.`,
            [node.id],
          ),
        );
      }
      if (defaultOutcomes.length === 0) {
        errors.push(
          createMessage(
            'missing-default-outcome',
            'error',
            `Decision ${node.id} must declare a default outcome.`,
            [node.id],
          ),
        );
      }
      if (defaultOutcomes.length > 1) {
        errors.push(
          createMessage(
            'multiple-default-outcomes',
            'error',
            `Decision ${node.id} has ${defaultOutcomes.length} default outcomes, expected 1.`,
            [node.id],
          ),
        );
      }
      outcomesWithNext.forEach((outcome) => {
        registerTarget(node, `outcome:${outcome.name || 'next'}`, outcome.next);
      });
    }

    if (node.type === 'Loop' && !node.loopCondition) {
      warnings.push(
        createMessage(
          'missing-loop-condition',
          'warning',
          `Loop ${node.id} is missing a loopCondition, which may cause infinite retries.`,
          [node.id],
        ),
      );
    }

    if (node.type === 'Loop' && !node.iterationCount) {
      warnings.push(
        createMessage(
          'missing-loop-iterations',
          'warning',
          `Loop ${node.id} should have an iterationCount limit to avoid infinite loops.`,
          [node.id],
        ),
      );
    }

    if (node.type === 'Wait' && !node.waitFor && !node.waitDuration) {
      warnings.push(
        createMessage(
          'wait-metadata-warning',
          'warning',
          `Wait ${node.id} should document either a waitFor signal or waitDuration.`,
          [node.id],
        ),
      );
    }

    if (node.type === 'Fault' && (!node.faultSource || !node.faultMessage)) {
      warnings.push(
        createMessage(
          'fault-metadata-warning',
          'warning',
          `Fault ${node.id} should include faultSource and faultMessage metadata.`,
          [node.id],
        ),
      );
    }

    registerTarget(node, 'next', node.next);
    registerTarget(node, 'yesNext', node.yesNext);
    registerTarget(node, 'noNext', node.noNext);
  });

  const startNode = starts[0];
  if (startNode) {
    const reachable = new Set<string>();
    const queue: string[] = [startNode.id];
    while (queue.length) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);
      const neighbors = adjacency.get(current);
      if (!neighbors) continue;
      neighbors.forEach((neighbor) => {
        if (!reachable.has(neighbor)) {
          queue.push(neighbor);
        }
      });
    }
    nodes.forEach((node) => {
      if (node.type === 'Start') return;
      if (!reachable.has(node.id)) {
        errors.push(
          createMessage(
            'unreachable-node',
            'error',
            `Node ${node.id} is not reachable from the Start element.`,
            [node.id],
          ),
        );
      }
    });
  }

  const result: FlowValidationResult = {
    errors,
    warnings,
    all: [...errors, ...warnings],
    isValid: errors.length === 0,
  };
  return result;
}

function mapElementToNode(element: FlowElement): FlowNode {
  const node: FlowNode = {
    id: element.id,
    type: element.type,
    apiName: element.apiName,
    label: element.label,
  };
  if ('next' in element && element.next) {
    node.next = element.next;
  }
  if (element.type === 'Decision') {
    const decision = element as DecisionElement;
    node.outcomes = decision.outcomes.map((outcome) => ({
      name: outcome.name,
      next: outcome.next,
      isDefault: outcome.isDefault,
    }));
  }
  return node;
}

export function convertDslToFlowNodes(dsl: FlowDSL): FlowNode[] {
  return dsl.elements.map(mapElementToNode);
}

export function validateDsl(dsl: FlowDSL): FlowValidationResult {
  return validateFlow(convertDslToFlowNodes(dsl));
}
