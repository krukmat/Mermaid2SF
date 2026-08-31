import { FlowDSL, FlowValueLike } from '../types/flow-dsl';
import { ValidationResult, ValidationError, ValidationWarning } from '../types/validation';
import { SchemaValidator } from './schema-validator';
import { SalesforceSemanticValidator } from './salesforce-semantic-validator';

export class FlowValidator {
  private readonly schemaValidator = new SchemaValidator();
  private readonly salesforceValidator = new SalesforceSemanticValidator();

  validate(dsl: FlowDSL): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const schemaErrors = this.schemaValidator.validate(dsl);
    errors.push(...schemaErrors);
    if (schemaErrors.length > 0) return { valid: false, errors, warnings };

    this.validateStartEnd(dsl, errors);
    this.validateReachability(dsl, warnings);
    this.validateDecisions(dsl, errors);
    this.validateElementReferences(dsl, errors);
    if (dsl.version < 2) this.validateLegacyVariableReferences(dsl, warnings);
    this.detectCycles(dsl, warnings);

    if (dsl.version >= 2) {
      const salesforce = this.salesforceValidator.validate(dsl);
      errors.push(...salesforce.errors);
      warnings.push(...salesforce.warnings);
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  private validateStartEnd(dsl: FlowDSL, errors: ValidationError[]): void {
    const starts = dsl.elements.filter((element) => element.type === 'Start');
    const ends = dsl.elements.filter((element) => element.type === 'End');
    if (starts.length === 0) errors.push({ code: 'MISSING_START', message: 'Flow must have at least one Start element' });
    if (starts.length > 1) errors.push({ code: 'MULTIPLE_START', message: `Flow must have exactly one Start element, found ${starts.length}` });
    if (ends.length === 0) errors.push({ code: 'MISSING_END', message: 'Flow must have at least one End element' });
    if (!dsl.elements.find((element) => element.id === dsl.startElement)) {
      errors.push({ code: 'INVALID_START_REFERENCE', message: `startElement "${dsl.startElement}" does not exist` });
    }
  }

  private validateReachability(dsl: FlowDSL, warnings: ValidationWarning[]): void {
    const reachable = new Set<string>();
    const queue: string[] = [dsl.startElement];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (reachable.has(currentId)) continue;
      reachable.add(currentId);
      const element = dsl.elements.find((candidate) => candidate.id === currentId);
      if (!element) continue;
      if ('next' in element && element.next) queue.push(element.next);
      if (element.type === 'Decision') for (const outcome of element.outcomes) queue.push(outcome.next);
    }
    for (const element of dsl.elements) {
      if (!reachable.has(element.id)) warnings.push({ code: 'UNREACHABLE_ELEMENT', message: `Element "${element.id}" is not reachable from Start`, elementId: element.id });
    }
  }

  private validateDecisions(dsl: FlowDSL, errors: ValidationError[]): void {
    for (const decision of dsl.elements) {
      if (decision.type !== 'Decision') continue;
      if (decision.outcomes.length === 0) errors.push({ code: 'DECISION_NO_OUTCOMES', message: `Decision "${decision.id}" must have at least one outcome`, elementId: decision.id });
      const defaults = decision.outcomes.filter((outcome) => outcome.isDefault);
      if (defaults.length === 0) errors.push({ code: 'DECISION_NO_DEFAULT', message: `Decision "${decision.id}" must have exactly one default outcome`, elementId: decision.id });
      if (defaults.length > 1) errors.push({ code: 'DECISION_MULTIPLE_DEFAULTS', message: `Decision "${decision.id}" has ${defaults.length} default outcomes, expected 1`, elementId: decision.id });
      for (const outcome of decision.outcomes) {
        if (!outcome.next) errors.push({ code: 'OUTCOME_NO_NEXT', message: `Outcome "${outcome.name}" in Decision "${decision.id}" must have a next element`, elementId: decision.id });
      }
    }
  }

  private validateElementReferences(dsl: FlowDSL, errors: ValidationError[]): void {
    const ids = new Set(dsl.elements.map((element) => element.id));
    for (const element of dsl.elements) {
      if ('next' in element && element.next && !ids.has(element.next)) {
        errors.push({ code: 'INVALID_ELEMENT_REFERENCE', message: `Element "${element.id}" references non-existent element "${element.next}"`, elementId: element.id });
      }
      if (element.type === 'Decision') {
        for (const outcome of element.outcomes) {
          if (!ids.has(outcome.next)) errors.push({ code: 'INVALID_OUTCOME_REFERENCE', message: `Decision "${element.id}" outcome "${outcome.name}" references non-existent element "${outcome.next}"`, elementId: element.id });
        }
      }
    }
  }

  private validateLegacyVariableReferences(dsl: FlowDSL, warnings: ValidationWarning[]): void {
    const defined = new Set<string>((dsl.variables || []).map((variable) => variable.name));
    for (const element of dsl.elements) {
      if (element.type === 'Assignment') for (const assignment of element.assignments) defined.add(assignment.variable);
      if (element.type === 'Loop' && element.collection) defined.add(element.collection);
    }
    const check = (value: FlowValueLike, elementId: string) => this.checkLegacyExpression(value, defined, elementId, warnings);
    for (const element of dsl.elements) {
      if (element.type === 'Assignment') for (const assignment of element.assignments) check(assignment.value, element.id);
      if (element.type === 'Decision') for (const outcome of element.outcomes) if (outcome.condition) check(outcome.condition, element.id);
      if (element.type === 'RecordCreate' || element.type === 'RecordUpdate') for (const value of Object.values(element.fields)) check(value, element.id);
      if (element.type === 'RecordUpdate') for (const filter of element.filters || []) check(filter.value, element.id);
      if (element.type === 'Subflow') for (const mapping of element.inputAssignments || []) check(mapping.value, element.id);
    }
  }

  private checkLegacyExpression(value: FlowValueLike, defined: Set<string>, elementId: string, warnings: ValidationWarning[]): void {
    if (typeof value !== 'string') return;
    for (const pattern of [/\{!(\w+)\}/g, /\$(\w+)/g, /\{(\w+)\}/g]) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(value)) !== null) {
        const variable = match[1];
        if (!defined.has(variable)) warnings.push({ code: 'UNDEFINED_VARIABLE', message: `Element "${elementId}" references undefined variable "${variable}"`, elementId });
      }
    }
  }

  private detectCycles(dsl: FlowDSL, warnings: ValidationWarning[]): void {
    const visited = new Set<string>();
    const stack = new Set<string>();
    const visit = (id: string, path: string[]): boolean => {
      if (stack.has(id)) {
        const start = path.indexOf(id);
        const cycle = path.slice(start).concat(id);
        warnings.push({ code: 'CYCLE_DETECTED', message: `Potential infinite loop detected: ${cycle.join(' -> ')}`, elementId: id });
        return true;
      }
      if (visited.has(id)) return false;
      const element = dsl.elements.find((candidate) => candidate.id === id);
      if (!element || element.type === 'End') return false;
      visited.add(id); stack.add(id);
      const nextPath = [...path, id];
      if ('next' in element && element.next) visit(element.next, nextPath);
      if (element.type === 'Decision') for (const outcome of element.outcomes) visit(outcome.next, nextPath);
      stack.delete(id);
      return false;
    };
    visit(dsl.startElement, []);
  }
}
