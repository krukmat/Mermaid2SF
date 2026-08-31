import {
  FlowDSL,
  FlowElement,
  FlowValueLike,
  normalizeFlowValue,
  parseConditionExpression,
  resolveFlowKind,
} from '../types/flow-dsl';
import { ValidationError, ValidationWarning } from '../types/validation';

export interface SalesforceSemanticResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export class SalesforceSemanticValidator {
  validate(dsl: FlowDSL): SalesforceSemanticResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    this.validateFlowFamily(dsl, errors, warnings);
    this.validateApiNames(dsl, errors);
    this.validateRequiredMetadata(dsl, errors);
    this.validateDecisions(dsl, errors);
    this.validateResources(dsl, errors);
    this.warnExperimentalElements(dsl, warnings);
    return { errors, warnings };
  }

  private validateFlowFamily(dsl: FlowDSL, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const kind = resolveFlowKind(dsl);
    const screens = dsl.elements.filter((element) => element.type === 'Screen');
    if (kind !== 'Screen' && screens.length > 0) {
      for (const screen of screens) this.error(errors, 'M2SF-SF-001', 'Screen elements are only valid in Screen Flows.', screen.id);
    }
    if (kind === 'Screen' && screens.length === 0) {
      warnings.push({ code: 'M2SF-SF-002', message: 'Screen Flow contains no Screen element.' });
    }
    if (kind === 'RecordTriggered') {
      if (!dsl.trigger) {
        this.error(errors, 'M2SF-SF-003', 'Record-Triggered Flow requires trigger metadata.');
      } else {
        if (!dsl.trigger.object?.trim()) this.error(errors, 'M2SF-SF-004', 'Record-Triggered Flow requires trigger.object.');
        if (!dsl.trigger.triggerType) this.error(errors, 'M2SF-SF-005', 'Record-Triggered Flow requires trigger.triggerType.');
        if (!dsl.trigger.recordTriggerType) this.error(errors, 'M2SF-SF-006', 'Record-Triggered Flow requires trigger.recordTriggerType.');
      }
    } else if (dsl.trigger) {
      warnings.push({ code: 'M2SF-SF-007', message: `Trigger metadata is ignored for ${kind} Flow.` });
    }
  }

  private validateApiNames(dsl: FlowDSL, errors: ValidationError[]): void {
    const seen = new Map<string, string>();
    for (const element of dsl.elements) {
      if (element.type === 'Start' || element.type === 'End') continue;
      const name = element.apiName || element.id;
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) this.error(errors, 'M2SF-SF-010', `Invalid Salesforce API name "${name}".`, element.id);
      const previous = seen.get(name);
      if (previous) this.error(errors, 'M2SF-SF-011', `Duplicate Salesforce API name "${name}" (also used by ${previous}).`, element.id);
      else seen.set(name, element.id);
    }
  }

  private validateRequiredMetadata(dsl: FlowDSL, errors: ValidationError[]): void {
    for (const element of dsl.elements) {
      switch (element.type) {
        case 'RecordCreate':
        case 'RecordUpdate':
        case 'GetRecords':
          if (!element.object?.trim()) this.error(errors, 'M2SF-SF-020', `${element.type} requires a Salesforce object API name.`, element.id);
          break;
        case 'Subflow':
          if (!element.flowName?.trim()) this.error(errors, 'M2SF-SF-021', 'Subflow requires an explicit child Flow API name (flow: Child_Flow).', element.id);
          break;
        case 'Loop':
          if (!element.collection?.trim()) this.error(errors, 'M2SF-SF-022', 'Loop requires a collection reference.', element.id);
          break;
      }
    }
  }

  private validateDecisions(dsl: FlowDSL, errors: ValidationError[]): void {
    for (const element of dsl.elements) {
      if (element.type !== 'Decision') continue;
      for (const outcome of element.outcomes) {
        if (outcome.isDefault) continue;
        const structured = outcome.conditions || [];
        const legacy = outcome.condition ? parseConditionExpression(outcome.condition) : undefined;
        if (structured.length === 0 && !legacy) {
          this.error(
            errors,
            'M2SF-SF-030',
            `Decision outcome "${outcome.name}" needs a real condition. Use "Outcome if $Record.Field = value" or structured FlowIR conditions.`,
            element.id,
          );
        }
      }
    }
  }

  private validateResources(dsl: FlowDSL, errors: ValidationError[]): void {
    const resources = new Set((dsl.variables || []).map((variable) => variable.name));
    const elements = new Set<string>();
    for (const element of dsl.elements) {
      elements.add(element.id);
      elements.add(element.apiName || element.id);
    }

    const check = (value: FlowValueLike, element: FlowElement) => {
      const normalized = normalizeFlowValue(value);
      if (normalized.kind !== 'reference') return;
      const name = normalized.name;
      if (name.startsWith('$')) {
        if ((name === '$Record' || name.startsWith('$Record.')) && resolveFlowKind(dsl) !== 'RecordTriggered') {
          this.error(errors, 'M2SF-SF-041', '$Record is only valid in the current Record-Triggered baseline.', element.id);
        }
        return;
      }
      const root = name.split('.')[0];
      if (!resources.has(root) && !elements.has(root)) {
        this.error(errors, 'M2SF-SF-040', `Reference "${name}" does not resolve to a declared resource or Flow element.`, element.id);
      }
    };

    for (const element of dsl.elements) {
      if (element.type === 'Assignment') for (const item of element.assignments) check(item.value, element);
      if (element.type === 'RecordCreate' || element.type === 'RecordUpdate') for (const value of Object.values(element.fields)) check(value, element);
      if (element.type === 'RecordUpdate' || element.type === 'GetRecords') for (const filter of element.filters || []) check(filter.value, element);
      if (element.type === 'Subflow') for (const input of element.inputAssignments || []) check(input.value, element);
      if (element.type === 'Decision') {
        for (const outcome of element.outcomes) {
          for (const condition of outcome.conditions || []) {
            check(condition.left, element);
            check(condition.right, element);
          }
        }
      }
    }
  }

  private warnExperimentalElements(dsl: FlowDSL, warnings: ValidationWarning[]): void {
    for (const element of dsl.elements) {
      if (element.type === 'Loop' || element.type === 'Wait' || element.type === 'Fault') {
        warnings.push({
          code: 'M2SF-SF-090',
          message: `${element.type} is experimental and outside the M1-M3 Salesforce correctness contract.`,
          elementId: element.id,
        });
      }
    }
  }

  private error(errors: ValidationError[], code: string, message: string, elementId?: string): void {
    errors.push({ code, message, ...(elementId ? { elementId } : {}) });
  }
}
