import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import schema from '../../schemas/flow-dsl.schema.json';
import { FlowDSL } from '../types/flow-dsl';
import { ValidationError } from '../types/validation';

export class SchemaValidator {
  // TASK 3.0: Disable strict mode to avoid warnings from schema definitions
  private readonly ajv = new Ajv({ allErrors: true, strict: false });
  private readonly validateFn: ValidateFunction;

  constructor() {
    this.validateFn = this.ajv.compile(schema);
  }

  validate(dsl: FlowDSL): ValidationError[] {
    const valid = this.validateFn(dsl);
    if (valid) return [];

    const errors: ValidationError[] = [];
    for (const err of (this.validateFn.errors as ErrorObject[]) || []) {
      const path = err.instancePath || '/';
      const elementId = this.extractElementId(path);
      const message = this.formatError(err, path);

      errors.push({
        code: 'SCHEMA_VALIDATION',
        message,
        ...(elementId && { elementId }),
      });
    }

    return errors;
  }

  // TASK 3.0: Extract element ID from path for better error reporting
  private extractElementId(path: string): string | undefined {
    // Match patterns like /elements/0, /elements/1, etc.
    const match = path.match(/\/elements\/(\d+)/);
    if (match) {
      return `element_${match[1]}`;
    }
    return undefined;
  }

  // TASK 3.0: Format error messages based on keyword type
  private formatError(err: ErrorObject, path: string): string {
    const location = path === '/' ? '(root)' : path;

    switch (err.keyword) {
      case 'required':
        return `Missing required property '${err.params.missingProperty}' at ${location}`;

      case 'type':
        return `Invalid type at ${location}: expected ${err.params.type}, got ${typeof err.data}`;

      case 'enum': {
        const allowedValues = err.params.allowedValues || [];
        return `Invalid value at ${location}: must be one of [${allowedValues.join(', ')}]`;
      }

      case 'pattern':
        return `Invalid format at ${location}: must match pattern ${err.params.pattern}`;

      case 'minLength':
        return `Value too short at ${location}: minimum length is ${err.params.limit} characters`;

      case 'minItems':
        return `Array too short at ${location}: minimum ${err.params.limit} items required`;

      case 'const':
        return `Invalid value at ${location}: must be ${err.params.allowedValue}`;

      case 'additionalProperties':
        return `Unexpected property '${err.params.additionalProperty}' at ${location}`;

      case 'oneOf':
        return `Invalid element type at ${location}: must match exactly one of the allowed element types`;

      default:
        // Fallback to default AJV message
        return `${location}: ${err.message}`;
    }
  }
}
