# TASK 3.0: JSON Schema & OpenAPI for DSL - Análisis

## Estado Actual
**Estado**: In progress (schema + validación listas; OpenAPI/VSCode pendiente)

## Objetivo
Agregar JSON Schema validation al Flow DSL para mejorar la experiencia de desarrollo y garantizar la validación estructural del DSL antes de generar XML.

## Subtareas Detalladas

### ✅ 3.0.1: Generar JSON Schema del Flow DSL (COMPLETADO)
**Archivos**: `schemas/flow-dsl.schema.json`

**Tareas**:
- [x] Crear `schemas/flow-dsl.schema.json`
- [x] Schema para FlowDSL root
- [x] Schema para cada ElementType
- [x] Validations y constraints

**Implementación Necesaria**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Salesforce Flow DSL",
  "description": "Domain Specific Language for Salesforce Flows",
  "type": "object",
  "required": ["version", "flowApiName", "label", "processType", "startElement", "elements"],
  "properties": {
    "version": {
      "type": "number",
      "const": 1,
      "description": "DSL schema version"
    },
    "flowApiName": {
      "type": "string",
      "pattern": "^[a-zA-Z][a-zA-Z0-9_]*$",
      "description": "Salesforce API name for the flow"
    },
    "label": {
      "type": "string",
      "minLength": 1,
      "description": "Human-readable label"
    },
    "processType": {
      "type": "string",
      "enum": ["Autolaunched", "RecordTriggered", "Screen"],
      "description": "Type of Flow process"
    },
    "apiVersion": {
      "type": "string",
      "pattern": "^\\d+\\.0$",
      "description": "Salesforce API version"
    },
    "startElement": {
      "type": "string",
      "description": "ID of the start element"
    },
    "variables": {
      "type": "array",
      "items": { "$ref": "#/definitions/FlowVariable" }
    },
    "elements": {
      "type": "array",
      "minItems": 2,
      "items": { "$ref": "#/definitions/FlowElement" }
    }
  },
  "definitions": {
    "FlowVariable": {
      "type": "object",
      "required": ["name", "dataType", "isCollection", "isInput", "isOutput"],
      "properties": {
        "name": {
          "type": "string",
          "pattern": "^[a-zA-Z][a-zA-Z0-9_]*$"
        },
        "dataType": {
          "type": "string",
          "enum": ["String", "Number", "Boolean", "Date", "DateTime", "SObject"]
        },
        "isCollection": { "type": "boolean" },
        "isInput": { "type": "boolean" },
        "isOutput": { "type": "boolean" }
      }
    },
    "BaseElement": {
      "type": "object",
      "required": ["id", "type"],
      "properties": {
        "id": { "type": "string" },
        "type": { "type": "string" },
        "apiName": { "type": "string" },
        "label": { "type": "string" },
        "next": { "type": "string" }
      }
    },
    "StartElement": {
      "allOf": [
        { "$ref": "#/definitions/BaseElement" },
        {
          "properties": {
            "type": { "const": "Start" }
          }
        }
      ]
    },
    "EndElement": {
      "allOf": [
        { "$ref": "#/definitions/BaseElement" },
        {
          "properties": {
            "type": { "const": "End" }
          }
        }
      ]
    },
    "AssignmentElement": {
      "allOf": [
        { "$ref": "#/definitions/BaseElement" },
        {
          "properties": {
            "type": { "const": "Assignment" },
            "assignments": {
              "type": "array",
              "minItems": 0,
              "items": {
                "type": "object",
                "required": ["variable", "value"],
                "properties": {
                  "variable": { "type": "string" },
                  "value": { "type": "string" }
                }
              }
            }
          },
          "required": ["assignments"]
        }
      ]
    },
    "DecisionElement": {
      "allOf": [
        { "$ref": "#/definitions/BaseElement" },
        {
          "properties": {
            "type": { "const": "Decision" },
            "outcomes": {
              "type": "array",
              "minItems": 1,
              "items": {
                "type": "object",
                "required": ["name", "next"],
                "properties": {
                  "name": { "type": "string" },
                  "condition": { "type": "string" },
                  "isDefault": { "type": "boolean" },
                  "next": { "type": "string" }
                }
              }
            }
          },
          "required": ["outcomes"]
        }
      ]
    },
    "ScreenElement": {
      "allOf": [
        { "$ref": "#/definitions/BaseElement" },
        {
          "properties": {
            "type": { "const": "Screen" },
            "components": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["type", "name"],
                "properties": {
                  "type": {
                    "type": "string",
                    "enum": ["Field", "DisplayText", "DisplayImage"]
                  },
                  "name": { "type": "string" },
                  "dataType": { "type": "string" },
                  "target": { "type": "string" },
                  "text": { "type": "string" },
                  "required": { "type": "boolean" }
                }
              }
            }
          },
          "required": ["components"]
        }
      ]
    },
    "RecordCreateElement": {
      "allOf": [
        { "$ref": "#/definitions/BaseElement" },
        {
          "properties": {
            "type": { "const": "RecordCreate" },
            "object": { "type": "string", "minLength": 1 },
            "fields": {
              "type": "object",
              "additionalProperties": { "type": "string" }
            },
            "assignRecordIdToReference": { "type": "string" }
          },
          "required": ["object", "fields"]
        }
      ]
    },
    "RecordUpdateElement": {
      "allOf": [
        { "$ref": "#/definitions/BaseElement" },
        {
          "properties": {
            "type": { "const": "RecordUpdate" },
            "object": { "type": "string", "minLength": 1 },
            "fields": {
              "type": "object",
              "additionalProperties": { "type": "string" }
            },
            "filters": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["field", "operator", "value"],
                "properties": {
                  "field": { "type": "string" },
                  "operator": {
                    "type": "string",
                    "enum": ["EqualTo", "NotEqualTo", "GreaterThan", "LessThan"]
                  },
                  "value": { "type": "string" }
                }
              }
            }
          },
          "required": ["object", "fields"]
        }
      ]
    },
    "SubflowElement": {
      "allOf": [
        { "$ref": "#/definitions/BaseElement" },
        {
          "properties": {
            "type": { "const": "Subflow" },
            "flowName": { "type": "string", "minLength": 1 },
            "inputAssignments": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["name", "value"],
                "properties": {
                  "name": { "type": "string" },
                  "value": { "type": "string" }
                }
              }
            },
            "outputAssignments": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["name", "value"],
                "properties": {
                  "name": { "type": "string" },
                  "value": { "type": "string" }
                }
              }
            }
          },
          "required": ["flowName"]
        }
      ]
    },
    "FlowElement": {
      "oneOf": [
        { "$ref": "#/definitions/StartElement" },
        { "$ref": "#/definitions/EndElement" },
        { "$ref": "#/definitions/AssignmentElement" },
        { "$ref": "#/definitions/DecisionElement" },
        { "$ref": "#/definitions/ScreenElement" },
        { "$ref": "#/definitions/RecordCreateElement" },
        { "$ref": "#/definitions/RecordUpdateElement" },
        { "$ref": "#/definitions/SubflowElement" }
      ]
    }
  }
}
```

### ✅ 3.0.2: Configurar validación automática con schema (COMPLETADO)
**Archivos**: `src/validator/schema-validator.ts`

**Tareas**:
- [x] Instalar: `npm install ajv`
- [x] Validar DSL contra schema antes de generar XML
- [x] Mensajes de error basados en schema violations

**Implementación Necesaria**:

```typescript
// src/validator/schema-validator.ts
import Ajv, { ValidateFunction } from 'ajv';
import { FlowDSL } from '../types/flow-dsl';
import { ValidationError } from '../types/validation';
import * as fs from 'fs';
import * as path from 'path';

export class SchemaValidator {
  private ajv: Ajv;
  private validate: ValidateFunction;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });

    // Load schema
    const schemaPath = path.join(__dirname, '../../schemas/flow-dsl.schema.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

    this.validate = this.ajv.compile(schema);
  }

  /**
   * Validate DSL against JSON Schema
   * @param dsl - Flow DSL to validate
   * @returns Array of validation errors
   */
  validateSchema(dsl: FlowDSL): ValidationError[] {
    const errors: ValidationError[] = [];

    const valid = this.validate(dsl);

    if (!valid && this.validate.errors) {
      for (const error of this.validate.errors) {
        errors.push({
          code: 'SCHEMA_VALIDATION_ERROR',
          message: this.formatSchemaError(error),
          elementId: this.extractElementId(error),
        });
      }
    }

    return errors;
  }

  private formatSchemaError(error: any): string {
    const path = error.instancePath || '/';
    const message = error.message || 'Unknown error';

    switch (error.keyword) {
      case 'required':
        return `Missing required property: ${error.params.missingProperty} at ${path}`;
      case 'type':
        return `Invalid type at ${path}: expected ${error.params.type}, got ${typeof error.data}`;
      case 'enum':
        return `Invalid value at ${path}: must be one of [${error.params.allowedValues.join(', ')}]`;
      case 'pattern':
        return `Invalid format at ${path}: ${message}`;
      case 'minItems':
        return `Array at ${path} must have at least ${error.params.limit} items`;
      case 'const':
        return `Value at ${path} must be ${error.params.allowedValue}`;
      default:
        return `Schema validation error at ${path}: ${message}`;
    }
  }

  private extractElementId(error: any): string | undefined {
    // Try to extract element ID from instance path
    const match = error.instancePath?.match(/\/elements\/(\d+)/);
    if (match) {
      return `element_${match[1]}`;
    }
    return undefined;
  }
}
```

**Integración en FlowValidator**:

```typescript
// src/validator/flow-validator.ts (actualizar)
import { SchemaValidator } from './schema-validator';

export class FlowValidator {
  private schemaValidator = new SchemaValidator();

  validate(dsl: FlowDSL): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // TASK 3.0: Schema validation primero
    const schemaErrors = this.schemaValidator.validateSchema(dsl);
    errors.push(...schemaErrors);

    // Si hay errores de schema, retornar inmediatamente
    if (schemaErrors.length > 0) {
      return {
        valid: false,
        errors,
        warnings,
      };
    }

    // Continuar con validaciones semánticas...
    this.validateStartEnd(dsl, errors);
    this.validateReachability(dsl, warnings);
    // ... resto de validaciones
  }
}
```

### ⬜ 3.0.3: Generar OpenAPI spec (PENDIENTE)
**Archivos**: `docs/api/openapi.yaml`

**Descripción**: Esta subtarea es opcional y aplicaría si se implementa un servicio web para compilar flows.

**Posible implementación**:
```yaml
openapi: 3.0.0
info:
  title: Mermaid Flow Compiler API
  version: 1.0.0
  description: API for compiling Mermaid flowcharts to Salesforce Flow metadata

paths:
  /compile:
    post:
      summary: Compile Mermaid to Salesforce Flow
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                mermaid:
                  type: string
                  description: Mermaid flowchart text
                flowApiName:
                  type: string
                options:
                  type: object
      responses:
        '200':
          description: Compilation successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  dsl:
                    $ref: '#/components/schemas/FlowDSL'
                  xml:
                    type: string
        '400':
          description: Validation error
          content:
            application/json:
              schema:
                type: object
                properties:
                  errors:
                    type: array
                    items:
                      $ref: '#/components/schemas/ValidationError'

components:
  schemas:
    FlowDSL:
      $ref: '../schemas/flow-dsl.schema.json'
```

### ⬜ 3.0.4: VSCode schema integration (PENDIENTE)
**Archivos**: `.vscode/settings.json`, `package.json`

**Implementación**:

**1. Configurar mapping en `.vscode/settings.json`**:
```json
{
  "json.schemas": [
    {
      "fileMatch": ["**/*.flow.json"],
      "url": "./schemas/flow-dsl.schema.json"
    }
  ]
}
```

**2. Agregar configuración en `package.json`**:
```json
{
  "contributes": {
    "jsonValidation": [
      {
        "fileMatch": "*.flow.json",
        "url": "./schemas/flow-dsl.schema.json"
      }
    ]
  }
}
```

**Beneficios**:
- ✅ Autocomplete al editar archivos `.flow.json`
- ✅ Validación inline en el editor
- ✅ Documentación hover sobre propiedades
- ✅ Sugerencias de valores válidos

## Implementación Recomendada

### Paso 1: Crear directorio schemas
```bash
mkdir -p schemas
```

### Paso 2: Crear JSON Schema
Crear `schemas/flow-dsl.schema.json` con el contenido completo mostrado arriba.

### Paso 3: Instalar dependencias
```bash
npm install ajv
npm install --save-dev @types/ajv
```

### Paso 4: Crear SchemaValidator
Crear `src/validator/schema-validator.ts` con la implementación mostrada arriba.

### Paso 5: Integrar en FlowValidator
Modificar `src/validator/flow-validator.ts` para usar SchemaValidator primero.

### Paso 6: Tests
Crear `src/__tests__/schema-validator.test.ts`:

```typescript
import { SchemaValidator } from '../validator/schema-validator';
import { FlowDSL } from '../types/flow-dsl';

describe('SchemaValidator', () => {
  let validator: SchemaValidator;

  beforeEach(() => {
    validator = new SchemaValidator();
  });

  it('should pass valid DSL', () => {
    const validDSL: FlowDSL = {
      version: 1,
      flowApiName: 'Test_Flow',
      label: 'Test Flow',
      processType: 'Autolaunched',
      startElement: 'Start',
      elements: [
        { id: 'Start', type: 'Start', apiName: 'Start', next: 'End' },
        { id: 'End', type: 'End', apiName: 'End' }
      ]
    };

    const errors = validator.validateSchema(validDSL);
    expect(errors).toHaveLength(0);
  });

  it('should fail with missing required field', () => {
    const invalidDSL: any = {
      version: 1,
      flowApiName: 'Test_Flow',
      // missing label
      processType: 'Autolaunched',
      startElement: 'Start',
      elements: []
    };

    const errors = validator.validateSchema(invalidDSL);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Missing required property: label');
  });

  it('should fail with invalid processType', () => {
    const invalidDSL: any = {
      version: 1,
      flowApiName: 'Test_Flow',
      label: 'Test',
      processType: 'InvalidType',
      startElement: 'Start',
      elements: []
    };

    const errors = validator.validateSchema(invalidDSL);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('must be one of');
  });
});
```

## Beneficios de TASK 3.0

1. **Validación Estructural Temprana**: Detecta errores de estructura antes de validaciones semánticas
2. **Mensajes de Error Claros**: JSON Schema proporciona mensajes descriptivos
3. **Documentación Automática**: El schema sirve como documentación del formato DSL
4. **IDE Integration**: VSCode puede validar archivos `.flow.json` en tiempo real
5. **Type Safety**: El schema complementa los tipos TypeScript
6. **Extensibilidad**: Fácil agregar nuevas validaciones al schema

## Dependencias

- `ajv` (^8.12.0): JSON Schema validator
- `@types/ajv` (dev): TypeScript types

## Riesgos y Consideraciones

1. **Performance**: Validación de schema puede ser costosa para DSLs grandes
   - **Mitigación**: Cachear el validador compilado

2. **Mantenimiento**: Schema debe mantenerse sincronizado con tipos TypeScript
   - **Mitigación**: Considerar generación automática desde tipos TypeScript (ej: `typescript-json-schema`)

3. **Errores Redundantes**: Schema validation puede duplicar algunas validaciones semánticas
   - **Mitigación**: Diseñar jerarquía clara: schema → semántica → business logic

## Siguiente Paso

Una vez completada TASK 3.0, el siguiente paso lógico sería **TASK 3.1: Command - Explain**, que permite generar análisis y explicaciones de flows compilados.

## Referencias

- [JSON Schema Documentation](https://json-schema.org/)
- [AJV Documentation](https://ajv.js.org/)
- [VSCode JSON Schema](https://code.visualstudio.com/docs/languages/json#_json-schemas-and-settings)
