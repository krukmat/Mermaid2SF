export type FlowOperator =
  | 'EqualTo'
  | 'NotEqualTo'
  | 'GreaterThan'
  | 'GreaterThanOrEqualTo'
  | 'LessThan'
  | 'LessThanOrEqualTo'
  | 'IsNull';

export interface StringFlowValue { kind: 'string'; value: string }
export interface BooleanFlowValue { kind: 'boolean'; value: boolean }
export interface NumberFlowValue { kind: 'number'; value: number }
export interface DateFlowValue { kind: 'date'; value: string }
export interface DateTimeFlowValue { kind: 'datetime'; value: string }
export interface ReferenceFlowValue { kind: 'reference'; name: string }
export interface NullFlowValue { kind: 'null' }

export type FlowValue =
  | StringFlowValue
  | BooleanFlowValue
  | NumberFlowValue
  | DateFlowValue
  | DateTimeFlowValue
  | ReferenceFlowValue
  | NullFlowValue;

/** Compatibility input accepted at authoring boundaries. FlowIR v2 builders normalize it. */
export type FlowValueLike = FlowValue | string | number | boolean | null;

export interface FlowCondition {
  left: ReferenceFlowValue;
  operator: FlowOperator;
  right: FlowValue;
}

export function isFlowValue(value: FlowValueLike): value is FlowValue {
  return typeof value === 'object' && value !== null && 'kind' in value;
}

export function reference(name: string): ReferenceFlowValue {
  return { kind: 'reference', name: normalizeReferenceName(name) };
}

export function normalizeReferenceName(value: string): string {
  const trimmed = value.trim();
  const explicit = trimmed.match(/^ref:\s*(.+)$/i);
  if (explicit) return explicit[1].trim();
  const merge = trimmed.match(/^\{!([^}]+)\}$/);
  return merge ? merge[1].trim() : trimmed;
}

export function normalizeFlowValue(value: FlowValueLike): FlowValue {
  if (isFlowValue(value)) return value;
  if (value === null) return { kind: 'null' };
  if (typeof value === 'boolean') return { kind: 'boolean', value };
  if (typeof value === 'number') return { kind: 'number', value };

  const trimmed = value.trim();
  if (/^null$/i.test(trimmed)) return { kind: 'null' };
  if (/^(true|false)$/i.test(trimmed)) return { kind: 'boolean', value: trimmed.toLowerCase() === 'true' };
  if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) return { kind: 'number', value: Number(trimmed) };
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return { kind: 'date', value: trimmed };
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return { kind: 'datetime', value: trimmed };
  if (/^ref:\s*.+$/i.test(trimmed)) return reference(trimmed);
  if (/^\{![^}]+\}$/.test(trimmed) || /^\$[A-Za-z]/.test(trimmed)) return reference(trimmed);

  const quoted = trimmed.match(/^(['"])([\s\S]*)\1$/);
  return { kind: 'string', value: quoted ? quoted[2] : trimmed };
}

export function parseConditionExpression(expression: string): FlowCondition | undefined {
  const source = expression.trim();
  const nullMatch = source.match(/^(.+?)\s+is\s+(not\s+)?null$/i);
  if (nullMatch) {
    return {
      left: reference(nullMatch[1]),
      operator: 'IsNull',
      right: { kind: 'boolean', value: !nullMatch[2] },
    };
  }

  const match = source.match(/^(.+?)\s*(>=|<=|!=|==|=|>|<)\s*(.+)$/);
  if (!match) return undefined;
  const operators: Record<string, FlowOperator> = {
    '=': 'EqualTo',
    '==': 'EqualTo',
    '!=': 'NotEqualTo',
    '>': 'GreaterThan',
    '>=': 'GreaterThanOrEqualTo',
    '<': 'LessThan',
    '<=': 'LessThanOrEqualTo',
  };
  return {
    left: reference(match[1]),
    operator: operators[match[2]],
    right: normalizeFlowValue(match[3]),
  };
}

export function serializeFlowValueXml(
  value: FlowValueLike,
  escapeXml: (text: string) => string,
  indentLevel: number,
): string[] {
  const normalized = normalizeFlowValue(value);
  const indent = ' '.repeat(indentLevel);
  switch (normalized.kind) {
    case 'string': return [`${indent}<stringValue>${escapeXml(normalized.value)}</stringValue>`];
    case 'boolean': return [`${indent}<booleanValue>${normalized.value}</booleanValue>`];
    case 'number': return [`${indent}<numberValue>${normalized.value}</numberValue>`];
    case 'date': return [`${indent}<dateValue>${escapeXml(normalized.value)}</dateValue>`];
    case 'datetime': return [`${indent}<dateTimeValue>${escapeXml(normalized.value)}</dateTimeValue>`];
    case 'reference': return [`${indent}<elementReference>${escapeXml(normalized.name)}</elementReference>`];
    case 'null': return [`${indent}<elementReference>$GlobalConstant.Null</elementReference>`];
  }
}
