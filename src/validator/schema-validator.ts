import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import legacySchema from '../../schemas/flow-dsl.schema.json';
import v2Schema from '../../schemas/flow-ir-v2.schema.json';
import { FlowDSL } from '../types/flow-dsl';
import { ValidationError } from '../types/validation';

export class SchemaValidator {
  private readonly ajv = new Ajv({ allErrors: true, strict: false });
  private readonly legacyValidateFn: ValidateFunction;
  private readonly v2ValidateFn: ValidateFunction;

  constructor() {
    this.legacyValidateFn = this.ajv.compile(legacySchema);
    this.v2ValidateFn = this.ajv.compile(v2Schema);
  }

  validate(dsl: FlowDSL): ValidationError[] {
    const validateFn = dsl.version >= 2 ? this.v2ValidateFn : this.legacyValidateFn;
    const valid = validateFn(dsl);
    if (valid) return [];
    return ((validateFn.errors as ErrorObject[]) || []).map((err) => {
      const path = err.instancePath || '/';
      const elementId = this.extractElementId(path, dsl);
      return {
        code: 'SCHEMA_VALIDATION',
        message: this.formatError(err, path),
        ...(elementId && { elementId }),
      };
    });
  }

  private extractElementId(path: string, dsl: FlowDSL): string | undefined {
    const match = path.match(/\/elements\/(\d+)/);
    if (!match) return undefined;
    const index = Number(match[1]);
    return dsl.elements[index]?.id || `element_${index}`;
  }

  private formatError(err: ErrorObject, path: string): string {
    const location = path === '/' ? '(root)' : path;
    switch (err.keyword) {
      case 'required':
        return `Missing required property '${err.params.missingProperty}' at ${location}`;
      case 'type':
        return `Invalid type at ${location}: expected ${err.params.type}, got ${typeof err.data}`;
      case 'enum':
        return `Invalid value at ${location}: must be one of [${(err.params.allowedValues || []).join(', ')}]`;
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
        return `Invalid value at ${location}: must match exactly one supported schema shape`;
      default:
        return `${location}: ${err.message}`;
    }
  }
}
