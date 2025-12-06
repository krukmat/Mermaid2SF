// TASK 2.3: Comprehensive validator tests for semantic validation
import { FlowValidator } from '../../src/validator/flow-validator';
import {
  FlowDSL,
  AssignmentElement,
  DecisionElement,
  StartElement,
  EndElement,
  RecordCreateElement,
} from '../../src/types/flow-dsl';

describe('FlowValidator', () => {
  let validator: FlowValidator;

  beforeEach(() => {
    validator = new FlowValidator();
  });

  describe('Basic structural validation', () => {
    it('should pass validation for a valid simple flow', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            next: 'End',
          } as StartElement,
          {
            id: 'End',
            type: 'End',
            apiName: 'End',
          } as EndElement,
        ],
      };

      const result = validator.validate(dsl);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should error when Start element is missing', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          {
            id: 'End',
            type: 'End',
            apiName: 'End',
          } as EndElement,
        ],
      };

      const result = validator.validate(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'MISSING_START')).toBe(true);
    });

    it('should error when End element is missing', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
          } as StartElement,
        ],
      };

      const result = validator.validate(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'MISSING_END')).toBe(true);
    });
  });

  describe('Decision validation', () => {
    it('should error when decision has no outcomes', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            next: 'Decision',
          } as StartElement,
          {
            id: 'Decision',
            type: 'Decision',
            apiName: 'Check',
            outcomes: [],
          } as DecisionElement,
          {
            id: 'End',
            type: 'End',
            apiName: 'End',
          } as EndElement,
        ],
      };

      const result = validator.validate(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'DECISION_NO_OUTCOMES')).toBe(true);
    });

    it('should error when decision has no default outcome', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            next: 'Decision',
          } as StartElement,
          {
            id: 'Decision',
            type: 'Decision',
            apiName: 'Check',
            outcomes: [{ name: 'Yes', condition: 'true', isDefault: false, next: 'End' }],
          } as DecisionElement,
          {
            id: 'End',
            type: 'End',
            apiName: 'End',
          } as EndElement,
        ],
      };

      const result = validator.validate(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'DECISION_NO_DEFAULT')).toBe(true);
    });

    it('should error when decision has multiple default outcomes', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            next: 'Decision',
          } as StartElement,
          {
            id: 'Decision',
            type: 'Decision',
            apiName: 'Check',
            outcomes: [
              { name: 'Default1', isDefault: true, next: 'End' },
              { name: 'Default2', isDefault: true, next: 'End' },
            ],
          } as DecisionElement,
          {
            id: 'End',
            type: 'End',
            apiName: 'End',
          } as EndElement,
        ],
      };

      const result = validator.validate(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'DECISION_MULTIPLE_DEFAULTS')).toBe(true);
    });
  });

  describe('Element reference validation (TASK 2.3)', () => {
    it('should error when next references non-existent element', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            next: 'NonExistent',
          } as StartElement,
          {
            id: 'End',
            type: 'End',
            apiName: 'End',
          } as EndElement,
        ],
      };

      const result = validator.validate(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_ELEMENT_REFERENCE')).toBe(true);
    });

    it('should error when decision outcome references non-existent element', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            next: 'Decision',
          } as StartElement,
          {
            id: 'Decision',
            type: 'Decision',
            apiName: 'Check',
            outcomes: [
              { name: 'Yes', condition: 'true', isDefault: false, next: 'NonExistent' },
              { name: 'No', isDefault: true, next: 'End' },
            ],
          } as DecisionElement,
          {
            id: 'End',
            type: 'End',
            apiName: 'End',
          } as EndElement,
        ],
      };

      const result = validator.validate(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_OUTCOME_REFERENCE')).toBe(true);
    });
  });

  describe('Variable reference validation (TASK 2.3)', () => {
    it('should warn when variable is referenced but not defined', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            next: 'Assign',
          } as StartElement,
          {
            id: 'Assign',
            type: 'Assignment',
            apiName: 'SetValue',
            assignments: [{ variable: 'v_Result', value: '{!v_UndefinedVar}' }],
            next: 'End',
          } as AssignmentElement,
          {
            id: 'End',
            type: 'End',
            apiName: 'End',
          } as EndElement,
        ],
      };

      const result = validator.validate(dsl);
      expect(result.valid).toBe(true); // Warnings don't invalidate
      expect(result.warnings.some((w) => w.code === 'UNDEFINED_VARIABLE')).toBe(true);
    });

    it('should not warn when variable is defined in DSL variables', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        variables: [
          {
            name: 'v_Input',
            dataType: 'String',
            isCollection: false,
            isInput: true,
            isOutput: false,
          },
        ],
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            next: 'Assign',
          } as StartElement,
          {
            id: 'Assign',
            type: 'Assignment',
            apiName: 'SetValue',
            assignments: [{ variable: 'v_Result', value: '{!v_Input}' }],
            next: 'End',
          } as AssignmentElement,
          {
            id: 'End',
            type: 'End',
            apiName: 'End',
          } as EndElement,
        ],
      };

      const result = validator.validate(dsl);
      expect(result.warnings.some((w) => w.code === 'UNDEFINED_VARIABLE')).toBe(false);
    });

    it('should not warn when variable is defined in Assignment', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            next: 'Assign1',
          } as StartElement,
          {
            id: 'Assign1',
            type: 'Assignment',
            apiName: 'SetValue1',
            assignments: [{ variable: 'v_Temp', value: 'Hello' }],
            next: 'Assign2',
          } as AssignmentElement,
          {
            id: 'Assign2',
            type: 'Assignment',
            apiName: 'SetValue2',
            assignments: [{ variable: 'v_Result', value: '{!v_Temp}' }],
            next: 'End',
          } as AssignmentElement,
          {
            id: 'End',
            type: 'End',
            apiName: 'End',
          } as EndElement,
        ],
      };

      const result = validator.validate(dsl);
      expect(result.warnings.some((w) => w.code === 'UNDEFINED_VARIABLE')).toBe(false);
    });

    it('should check variables in RecordCreate fields', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            next: 'Create',
          } as StartElement,
          {
            id: 'Create',
            type: 'RecordCreate',
            apiName: 'CreateAccount',
            object: 'Account',
            fields: {
              Name: '{!v_AccountName}',
              Description: 'Test',
            },
            next: 'End',
          } as RecordCreateElement,
          {
            id: 'End',
            type: 'End',
            apiName: 'End',
          } as EndElement,
        ],
      };

      const result = validator.validate(dsl);
      expect(result.warnings.some((w) => w.code === 'UNDEFINED_VARIABLE')).toBe(true);
    });
  });

  describe('Cycle detection (TASK 2.3)', () => {
    it('should detect simple cycle', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            next: 'Assign1',
          } as StartElement,
          {
            id: 'Assign1',
            type: 'Assignment',
            apiName: 'Step1',
            assignments: [{ variable: 'v_Counter', value: '1' }],
            next: 'Assign2',
          } as AssignmentElement,
          {
            id: 'Assign2',
            type: 'Assignment',
            apiName: 'Step2',
            assignments: [{ variable: 'v_Counter', value: '2' }],
            next: 'Assign1', // Cycle back
          } as AssignmentElement,
          {
            id: 'End',
            type: 'End',
            apiName: 'End',
          } as EndElement,
        ],
      };

      const result = validator.validate(dsl);
      expect(result.warnings.some((w) => w.code === 'CYCLE_DETECTED')).toBe(true);
    });

    it('should detect cycle through decision', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            next: 'Assign',
          } as StartElement,
          {
            id: 'Assign',
            type: 'Assignment',
            apiName: 'Counter',
            assignments: [{ variable: 'v_Counter', value: '1' }],
            next: 'Decision',
          } as AssignmentElement,
          {
            id: 'Decision',
            type: 'Decision',
            apiName: 'Check',
            outcomes: [
              { name: 'Continue', condition: 'true', isDefault: false, next: 'Assign' },
              { name: 'End', isDefault: true, next: 'End' },
            ],
          } as DecisionElement,
          {
            id: 'End',
            type: 'End',
            apiName: 'End',
          } as EndElement,
        ],
      };

      const result = validator.validate(dsl);
      expect(result.warnings.some((w) => w.code === 'CYCLE_DETECTED')).toBe(true);
    });

    it('should not flag false positives for valid branching flow', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            next: 'Decision',
          } as StartElement,
          {
            id: 'Decision',
            type: 'Decision',
            apiName: 'Check',
            outcomes: [
              { name: 'Yes', condition: 'true', isDefault: false, next: 'End1' },
              { name: 'No', isDefault: true, next: 'End2' },
            ],
          } as DecisionElement,
          {
            id: 'End1',
            type: 'End',
            apiName: 'Success',
          } as EndElement,
          {
            id: 'End2',
            type: 'End',
            apiName: 'Failure',
          } as EndElement,
        ],
      };

      const result = validator.validate(dsl);
      expect(result.warnings.some((w) => w.code === 'CYCLE_DETECTED')).toBe(false);
    });
  });

  describe('Reachability validation', () => {
    it('should warn about unreachable elements', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          {
            id: 'Start',
            type: 'Start',
            apiName: 'Start',
            next: 'End',
          } as StartElement,
          {
            id: 'Orphan',
            type: 'Assignment',
            apiName: 'OrphanElement',
            assignments: [{ variable: 'v_Test', value: '1' }],
            next: 'End',
          } as AssignmentElement,
          {
            id: 'End',
            type: 'End',
            apiName: 'End',
          } as EndElement,
        ],
      };

      const result = validator.validate(dsl);
      expect(result.warnings.some((w) => w.code === 'UNREACHABLE_ELEMENT')).toBe(true);
    });
  });

  describe('Schema validation (Task 3.0)', () => {
    it('should report schema violations before structural validation', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: '', // invalid: minLength 1
        elements: [], // invalid: minItems 1
      };

      const result = validator.validate(dsl);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'SCHEMA_VALIDATION')).toBe(true);
    });
  });
});
