import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import schema from '../../schemas/flow-dsl.schema.json';
import { FlowDSL } from '../types/flow-dsl';
import { ValidationError } from '../types/validation';

export class SchemaValidator {
  private readonly ajv = new Ajv({ allErrors: true, strict: false });
  private readonly validateFn: ValidateFunction;

  constructor() {
    this.validateFn = this.ajv.compile(schema);
  }

  validate(dsl: FlowDSL): ValidationError[] {
    if (dsl.version >= 2) return this.validateV2(dsl);
    const valid = this.validateFn(dsl);
    if (valid) return [];
    return ((this.validateFn.errors as ErrorObject[]) || []).map((err) => {
      const path = err.instancePath || '/';
      const elementId = this.extractElementId(path);
      return {
        code: 'SCHEMA_VALIDATION',
        message: this.formatError(err, path),
        ...(elementId && { elementId }),
      };
    });
  }

  private validateV2(dsl: FlowDSL): ValidationError[] {
    const errors: ValidationError[] = [];
    const requiredString = (value: unknown, path: string) => {
      if (typeof value !== 'string' || value.trim().length === 0) {
        errors.push({ code: 'SCHEMA_VALIDATION', message: `Missing or invalid string at ${path}` });
      }
    };
    requiredString(dsl.flowApiName, '/flowApiName');
    requiredString(dsl.label, '/label');
    requiredString(dsl.processType, '/processType');
    requiredString(dsl.startElement, '/startElement');
    if (!Array.isArray(dsl.elements) || dsl.elements.length === 0) {
      errors.push({ code: 'SCHEMA_VALIDATION', message: 'FlowIR v2 requires a non-empty /elements array' });
      return errors;
    }
    dsl.elements.forEach((element, index) => {
      if (!element || typeof element !== 'object') {
        errors.push({ code: 'SCHEMA_VALIDATION', message: `Invalid element at /elements/${index}` });
        return;
      }
      if (!/^[A-Za-z0-9_]+$/.test(element.id)) {
        errors.push({ code: 'SCHEMA_VALIDATION', message: `Invalid element id at /elements/${index}/id`, elementId: element.id });
      }
      requiredString(element.type, `/elements/${index}/type`);
    });
    return errors;
  }

  private extractElementId(path: string): string | undefined {
    const match = path.match(/\/elements\/(\d+)/);
    return match ? `element_${match[1]}` : undefined;
  }

  private formatError(err: ErrorObject, path: string): string {
    const location = path === '/' ? '(root)' : path;
    switch (err.keyword) {
      case 'required': return `Missing required property '${err.params.missingProperty}' at ${location}`;
      case 'type': return `Invalid type at ${location}: expected ${err.params.type}, got ${typeof err.data}`;
      case 'enum': return `Invalid value at ${location}: must be one of [${(err.params.allowedValues || []).join(', ')}]`;
      case 'pattern': return `Invalid format at ${location}: must match pattern ${err.params.pattern}`;
      case 'minLength': return `Value too short at ${location}: minimum length is ${err.params.limit} characters`;
      case 'minItems': return `Array too short at ${location}: minimum ${err.params.limit} items required`;
      case 'const': return `Invalid value at ${location}: must be ${err.params.allowedValue}`;
      case 'additionalProperties': return `Unexpected property '${err.params.additionalProperty}' at ${location}`;
      case 'oneOf': return `Invalid element type at ${location}: must match exactly one of the allowed element types`;
      default: return `${location}: ${err.message}`;
    }
  }
}
