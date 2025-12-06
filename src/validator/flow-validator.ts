import { FlowDSL } from '../types/flow-dsl';
import { ValidationResult, ValidationError, ValidationWarning } from '../types/validation';
import { SchemaValidator } from './schema-validator';

export class FlowValidator {
  private readonly schemaValidator = new SchemaValidator();

  /**
   * Validate Flow DSL structure
   * @param dsl - Flow DSL to validate
   * @returns Validation result
   */
  validate(dsl: FlowDSL): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Schema validation (Task 3.0)
    const schemaErrors = this.schemaValidator.validate(dsl);
    errors.push(...schemaErrors);
    if (schemaErrors.length > 0) {
      return {
        valid: false,
        errors,
        warnings,
      };
    }

    // TASK 2.3: Enhanced semantic validation
    this.validateStartEnd(dsl, errors);
    this.validateReachability(dsl, warnings);
    this.validateDecisions(dsl, errors);
    this.validateElementReferences(dsl, errors);
    this.validateVariableReferences(dsl, errors, warnings);
    this.detectCycles(dsl, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateStartEnd(dsl: FlowDSL, errors: ValidationError[]): void {
    const startElements = dsl.elements.filter((e) => e.type === 'Start');
    const endElements = dsl.elements.filter((e) => e.type === 'End');

    if (startElements.length === 0) {
      errors.push({
        code: 'MISSING_START',
        message: 'Flow must have at least one Start element',
      });
    }

    if (startElements.length > 1) {
      errors.push({
        code: 'MULTIPLE_START',
        message: `Flow must have exactly one Start element, found ${startElements.length}`,
      });
    }

    if (endElements.length === 0) {
      errors.push({
        code: 'MISSING_END',
        message: 'Flow must have at least one End element',
      });
    }

    // Validate startElement points to existing element
    if (!dsl.elements.find((e) => e.id === dsl.startElement)) {
      errors.push({
        code: 'INVALID_START_REFERENCE',
        message: `startElement "${dsl.startElement}" does not exist`,
      });
    }
  }

  private validateReachability(dsl: FlowDSL, warnings: ValidationWarning[]): void {
    const reachable = new Set<string>();
    const queue: string[] = [dsl.startElement];

    // BFS to find all reachable elements
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (reachable.has(currentId)) continue;

      reachable.add(currentId);
      const element = dsl.elements.find((e) => e.id === currentId);
      if (!element) continue;

      // Add next elements to queue
      if ('next' in element && element.next) {
        queue.push(element.next);
      }

      if (element.type === 'Decision') {
        for (const outcome of element.outcomes) {
          queue.push(outcome.next);
        }
      }
    }

    // Find unreachable elements
    for (const element of dsl.elements) {
      if (!reachable.has(element.id)) {
        warnings.push({
          code: 'UNREACHABLE_ELEMENT',
          message: `Element "${element.id}" is not reachable from Start`,
          elementId: element.id,
        });
      }
    }
  }

  private validateDecisions(dsl: FlowDSL, errors: ValidationError[]): void {
    const decisions = dsl.elements.filter((e) => e.type === 'Decision');

    for (const decision of decisions) {
      if (decision.type !== 'Decision') continue;

      // Must have at least one outcome
      if (decision.outcomes.length === 0) {
        errors.push({
          code: 'DECISION_NO_OUTCOMES',
          message: `Decision "${decision.id}" must have at least one outcome`,
          elementId: decision.id,
        });
      }

      // Must have exactly one default outcome
      const defaultOutcomes = decision.outcomes.filter((o) => o.isDefault);
      if (defaultOutcomes.length === 0) {
        errors.push({
          code: 'DECISION_NO_DEFAULT',
          message: `Decision "${decision.id}" must have exactly one default outcome`,
          elementId: decision.id,
        });
      }

      if (defaultOutcomes.length > 1) {
        errors.push({
          code: 'DECISION_MULTIPLE_DEFAULTS',
          message: `Decision "${decision.id}" has ${defaultOutcomes.length} default outcomes, expected 1`,
          elementId: decision.id,
        });
      }

      // Validate all outcomes have next
      for (const outcome of decision.outcomes) {
        if (!outcome.next) {
          errors.push({
            code: 'OUTCOME_NO_NEXT',
            message: `Outcome "${outcome.name}" in Decision "${decision.id}" must have a next element`,
            elementId: decision.id,
          });
        }
      }
    }
  }

  // TASK 2.3: Validate that all element references point to existing elements
  private validateElementReferences(dsl: FlowDSL, errors: ValidationError[]): void {
    const elementIds = new Set(dsl.elements.map((e) => e.id));

    for (const element of dsl.elements) {
      // Check 'next' references
      if ('next' in element && element.next && !elementIds.has(element.next)) {
        errors.push({
          code: 'INVALID_ELEMENT_REFERENCE',
          message: `Element "${element.id}" references non-existent element "${element.next}"`,
          elementId: element.id,
        });
      }

      // Check Decision outcome references
      if (element.type === 'Decision') {
        for (const outcome of element.outcomes) {
          if (!elementIds.has(outcome.next)) {
            errors.push({
              code: 'INVALID_OUTCOME_REFERENCE',
              message: `Decision "${element.id}" outcome "${outcome.name}" references non-existent element "${outcome.next}"`,
              elementId: element.id,
            });
          }
        }
      }
    }
  }

  // TASK 2.3: Validate variable references
  private validateVariableReferences(
    dsl: FlowDSL,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    // Collect all defined variables
    const definedVariables = new Set<string>();

    // Add variables from DSL variables section
    if (dsl.variables) {
      for (const variable of dsl.variables) {
        definedVariables.add(variable.name);
      }
    }

    // Add variables assigned in Assignment elements
    for (const element of dsl.elements) {
      if (element.type === 'Assignment') {
        for (const assignment of element.assignments) {
          definedVariables.add(assignment.variable);
        }
      }
      if (element.type === 'Loop') {
        // Loop iteration variable inferred from collection name
        definedVariables.add(element.collection || 'loopItem');
      }
    }

    // Check variable usage
    for (const element of dsl.elements) {
      switch (element.type) {
        case 'Assignment':
          // Check if assignment values reference undefined variables
          for (const assignment of element.assignments) {
            this.checkExpressionVariables(
              assignment.value,
              definedVariables,
              element.id,
              warnings,
            );
          }
          break;

        case 'Decision':
          // Check conditions reference valid variables
          for (const outcome of element.outcomes) {
            if (outcome.condition) {
              this.checkExpressionVariables(
                outcome.condition,
                definedVariables,
                element.id,
                warnings,
              );
            }
          }
          break;

        case 'RecordCreate':
          // Check field values
          for (const [fieldName, value] of Object.entries(element.fields)) {
            this.checkExpressionVariables(value, definedVariables, element.id, warnings);
          }
          break;

        case 'RecordUpdate':
          // Check field values and filters
          for (const [fieldName, value] of Object.entries(element.fields)) {
            this.checkExpressionVariables(value, definedVariables, element.id, warnings);
          }
          if (element.filters) {
            for (const filter of element.filters) {
              this.checkExpressionVariables(filter.value, definedVariables, element.id, warnings);
            }
          }
          break;

        case 'Subflow':
          // Check input assignments
          if (element.inputAssignments) {
            for (const mapping of element.inputAssignments) {
              this.checkExpressionVariables(
                mapping.value,
                definedVariables,
                element.id,
                warnings,
              );
            }
          }
          break;
      }
    }
  }

  // TASK 2.3: Check if expression contains undefined variable references
  private checkExpressionVariables(
    expression: string,
    definedVariables: Set<string>,
    elementId: string,
    warnings: ValidationWarning[],
  ): void {
    // Simple heuristic: look for variable patterns like {!varName} or $varName
    const variablePatterns = [
      /\{!(\w+)\}/g, // {!varName}
      /\$(\w+)/g, // $varName
      /\{(\w+)\}/g, // {varName}
    ];

    for (const pattern of variablePatterns) {
      let match;
      while ((match = pattern.exec(expression)) !== null) {
        const varName = match[1];
        if (!definedVariables.has(varName)) {
          warnings.push({
            code: 'UNDEFINED_VARIABLE',
            message: `Element "${elementId}" references undefined variable "${varName}"`,
            elementId,
          });
        }
      }
    }
  }

  // TASK 2.3: Detect cycles (infinite loops) in the flow
  private detectCycles(dsl: FlowDSL, warnings: ValidationWarning[]): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (elementId: string, path: string[]): boolean => {
      if (recursionStack.has(elementId)) {
        // Found a cycle
        const cycleStart = path.indexOf(elementId);
        const cyclePath = path.slice(cycleStart).concat(elementId);
        warnings.push({
          code: 'CYCLE_DETECTED',
          message: `Potential infinite loop detected: ${cyclePath.join(' -> ')}`,
          elementId,
        });
        return true;
      }

      if (visited.has(elementId)) {
        return false;
      }

      const element = dsl.elements.find((e) => e.id === elementId);
      if (!element || element.type === 'End') {
        return false;
      }

      visited.add(elementId);
      recursionStack.add(elementId);
      path.push(elementId);

      let cycleFound = false;

      // Check next element
      if ('next' in element && element.next) {
        cycleFound = hasCycle(element.next, [...path]) || cycleFound;
      }

      // Check Decision outcomes
      if (element.type === 'Decision') {
        for (const outcome of element.outcomes) {
          cycleFound = hasCycle(outcome.next, [...path]) || cycleFound;
        }
      }

      recursionStack.delete(elementId);
      return cycleFound;
    };

    // Start cycle detection from the start element
    hasCycle(dsl.startElement, []);
  }
}
