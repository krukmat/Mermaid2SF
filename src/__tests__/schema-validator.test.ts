// TASK 3.0: JSON Schema & OpenAPI for DSL - SchemaValidator Tests
import { SchemaValidator } from '../validator/schema-validator';
import { FlowDSL } from '../types/flow-dsl';

describe('SchemaValidator', () => {
  let validator: SchemaValidator;

  beforeEach(() => {
    validator = new SchemaValidator();
  });

  describe('Valid DSL', () => {
    it('should pass validation for valid minimal DSL', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'START_1',
        elements: [
          {
            id: 'START_1',
            type: 'Start',
            apiName: 'Start',
            label: 'Start',
            next: 'END_1',
          },
          {
            id: 'END_1',
            type: 'End',
            apiName: 'End',
            label: 'End',
          },
        ],
      };

      const errors = validator.validate(dsl);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation for DSL with all element types', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'Complete_Flow',
        label: 'Complete Flow',
        processType: 'Screen',
        apiVersion: '60.0',
        startElement: 'START_1',
        variables: [
          {
            name: 'varName',
            dataType: 'String',
            isCollection: false,
            isInput: false,
            isOutput: false,
          },
        ],
        elements: [
          {
            id: 'START_1',
            type: 'Start',
            apiName: 'Start',
            label: 'Start',
            next: 'SCREEN_1',
          },
          {
            id: 'SCREEN_1',
            type: 'Screen',
            apiName: 'Screen_User_Input',
            label: 'User Input',
            next: 'ASSIGN_1',
            components: [
              {
                type: 'Field',
                name: 'InputField',
              },
            ],
            allowBack: true,
            allowFinish: false,
          },
          {
            id: 'ASSIGN_1',
            type: 'Assignment',
            apiName: 'Assign_Variables',
            label: 'Set Variables',
            next: 'DECISION_1',
            assignments: [
              {
                variable: 'varName',
                value: 'value',
              },
            ],
          },
          {
            id: 'DECISION_1',
            type: 'Decision',
            apiName: 'Check_Condition',
            label: 'Check Condition',
            outcomes: [
              {
                name: 'Yes',
                condition: 'varName == "value"',
                isDefault: false,
                next: 'CREATE_1',
              },
              {
                name: 'No',
                isDefault: true,
                next: 'UPDATE_1',
              },
            ],
          },
          {
            id: 'CREATE_1',
            type: 'RecordCreate',
            apiName: 'Create_Account',
            label: 'Create Account',
            next: 'SUBFLOW_1',
            object: 'Account',
            fields: {
              Name: 'Test Account',
            },
            assignRecordIdToReference: 'accountId',
          },
          {
            id: 'UPDATE_1',
            type: 'RecordUpdate',
            apiName: 'Update_Account',
            label: 'Update Account',
            next: 'SUBFLOW_1',
            object: 'Account',
            fields: {
              Name: 'Updated Account',
            },
            filters: [
              {
                field: 'Id',
                operator: 'EqualTo',
                value: 'accountId',
              },
            ],
            updateMode: 'all',
          },
          {
            id: 'SUBFLOW_1',
            type: 'Subflow',
            apiName: 'Call_Email_Subflow',
            label: 'Send Email',
            next: 'END_1',
            flowName: 'Email_Notification_Flow',
            inputAssignments: [
              {
                name: 'recipientId',
                value: 'accountId',
              },
            ],
            outputAssignments: [
              {
                name: 'success',
                value: 'emailSent',
              },
            ],
          },
          {
            id: 'END_1',
            type: 'End',
            apiName: 'End',
            label: 'End',
          },
        ],
      };

      const errors = validator.validate(dsl);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Missing Required Fields', () => {
    it('should fail when missing version field', () => {
      const dsl: any = {
        // version missing
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'START_1',
        elements: [
          {
            id: 'START_1',
            type: 'Start',
            apiName: 'Start',
            label: 'Start',
          },
        ],
      };

      const errors = validator.validate(dsl);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('version'))).toBe(true);
    });

    it('should fail when missing flowApiName field', () => {
      const dsl: any = {
        version: 1,
        // flowApiName missing
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'START_1',
        elements: [],
      };

      const errors = validator.validate(dsl);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('flowApiName'))).toBe(true);
    });

    it('should fail when missing label field', () => {
      const dsl: any = {
        version: 1,
        flowApiName: 'Test_Flow',
        // label missing
        processType: 'Autolaunched',
        startElement: 'START_1',
        elements: [],
      };

      const errors = validator.validate(dsl);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('label'))).toBe(true);
    });

    it('should fail when missing processType field', () => {
      const dsl: any = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        // processType missing
        startElement: 'START_1',
        elements: [],
      };

      const errors = validator.validate(dsl);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('processType'))).toBe(true);
    });

    it('should fail when missing startElement field', () => {
      const dsl: any = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        // startElement missing
        elements: [],
      };

      const errors = validator.validate(dsl);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('startElement'))).toBe(true);
    });

    it('should fail when missing elements array', () => {
      const dsl: any = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'START_1',
        // elements missing
      };

      const errors = validator.validate(dsl);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('elements'))).toBe(true);
    });

    it('should fail when elements array is empty', () => {
      const dsl: any = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'START_1',
        elements: [], // Empty array
      };

      const errors = validator.validate(dsl);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('Array too short'))).toBe(true);
    });
  });

  describe('Invalid Types', () => {
    it('should fail when version is not an integer', () => {
      const dsl: any = {
        version: '1', // String instead of integer
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'START_1',
        elements: [
          {
            id: 'START_1',
            type: 'Start',
          },
        ],
      };

      const errors = validator.validate(dsl);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('integer'))).toBe(true);
    });

    it('should fail when flowApiName is not a string', () => {
      const dsl: any = {
        version: 1,
        flowApiName: 123, // Number instead of string
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'START_1',
        elements: [
          {
            id: 'START_1',
            type: 'Start',
          },
        ],
      };

      const errors = validator.validate(dsl);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('string'))).toBe(true);
    });

    it('should fail when elements is not an array', () => {
      const dsl: any = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'START_1',
        elements: 'not an array', // String instead of array
      };

      const errors = validator.validate(dsl);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('array'))).toBe(true);
    });

    it('should fail when variable isCollection is not boolean', () => {
      const dsl: any = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'START_1',
        variables: [
          {
            name: 'var1',
            dataType: 'String',
            isCollection: 'yes', // String instead of boolean
            isInput: false,
            isOutput: false,
          },
        ],
        elements: [
          {
            id: 'START_1',
            type: 'Start',
          },
        ],
      };

      const errors = validator.validate(dsl);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('boolean'))).toBe(true);
    });
  });

  describe('Invalid Enum Values', () => {
    it('should fail when processType has invalid enum value', () => {
      const dsl: any = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'InvalidType', // Invalid enum value
        startElement: 'START_1',
        elements: [
          {
            id: 'START_1',
            type: 'Start',
          },
        ],
      };

      const errors = validator.validate(dsl);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('must be one of'))).toBe(true);
    });

    it('should fail when RecordFilter operator has invalid enum value', () => {
      const dsl: any = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'START_1',
        elements: [
          {
            id: 'START_1',
            type: 'Start',
            next: 'UPDATE_1',
          },
          {
            id: 'UPDATE_1',
            type: 'RecordUpdate',
            object: 'Account',
            fields: [],
            filters: [
              {
                field: 'Name',
                operator: 'InvalidOperator', // Invalid enum
                value: 'test',
              },
            ],
            updateMode: 'UpdateAll',
          },
        ],
      };

      const errors = validator.validate(dsl);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('must be one of'))).toBe(true);
    });
  });

  describe('Pattern Violations', () => {
    it('should fail when apiName violates pattern (starts with number)', () => {
      const dsl: any = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'START_1',
        elements: [
          {
            id: 'START_1',
            type: 'Start',
            apiName: '1InvalidStart', // Starts with number
          },
        ],
      };

      const errors = validator.validate(dsl);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('pattern'))).toBe(true);
    });

    it('should fail when element id contains special characters', () => {
      const dsl: any = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'START_1',
        elements: [
          {
            id: 'START-1', // Contains dash (invalid)
            type: 'Start',
          },
        ],
      };

      const errors = validator.validate(dsl);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('pattern'))).toBe(true);
    });
  });

  describe('String Length Violations', () => {
    it('should fail when flowApiName is empty string', () => {
      const dsl: any = {
        version: 1,
        flowApiName: '', // Empty string
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'START_1',
        elements: [
          {
            id: 'START_1',
            type: 'Start',
          },
        ],
      };

      const errors = validator.validate(dsl);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('Value too short'))).toBe(true);
    });

    it('should fail when label is empty string', () => {
      const dsl: any = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: '', // Empty string
        processType: 'Autolaunched',
        startElement: 'START_1',
        elements: [
          {
            id: 'START_1',
            type: 'Start',
          },
        ],
      };

      const errors = validator.validate(dsl);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('Value too short'))).toBe(true);
    });
  });

  describe('Multiple Errors', () => {
    it('should return multiple errors when multiple fields are invalid', () => {
      const dsl: any = {
        version: '1', // Wrong type
        flowApiName: '', // Empty string
        // label missing
        processType: 'InvalidType', // Invalid enum
        startElement: 'START_1',
        elements: [], // Empty array
      };

      const errors = validator.validate(dsl);
      expect(errors.length).toBeGreaterThanOrEqual(4);
    });

    it('should return all errors when allErrors is true', () => {
      const dsl: any = {
        // Multiple missing required fields
        flowApiName: 'Test_Flow',
        elements: [
          {
            // Missing required element fields
            type: 'Start',
          },
        ],
      };

      const errors = validator.validate(dsl);
      expect(errors.length).toBeGreaterThan(1);
    });
  });

  describe('All Element Types Validation', () => {
    it('should validate StartElement', () => {
      const dsl: any = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'START_1',
        elements: [
          {
            id: 'START_1',
            type: 'Start',
            apiName: 'Start',
            label: 'Start',
            next: 'END_1',
          },
          {
            id: 'END_1',
            type: 'End',
          },
        ],
      };

      const errors = validator.validate(dsl);
      expect(errors).toHaveLength(0);
    });

    it('should validate EndElement', () => {
      const dsl: any = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'START_1',
        elements: [
          {
            id: 'START_1',
            type: 'Start',
            next: 'END_1',
          },
          {
            id: 'END_1',
            type: 'End',
            apiName: 'End',
            label: 'End',
          },
        ],
      };

      const errors = validator.validate(dsl);
      expect(errors).toHaveLength(0);
    });

    it('should validate AssignmentElement', () => {
      const dsl: any = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'START_1',
        elements: [
          {
            id: 'START_1',
            type: 'Start',
            next: 'ASSIGN_1',
          },
          {
            id: 'ASSIGN_1',
            type: 'Assignment',
            apiName: 'Assign_Vars',
            assignments: [
              {
                variable: 'var1',
                value: 'value1',
              },
            ],
            next: 'END_1',
          },
          {
            id: 'END_1',
            type: 'End',
          },
        ],
      };

      const errors = validator.validate(dsl);
      expect(errors).toHaveLength(0);
    });

    it('should validate DecisionElement', () => {
      const dsl: any = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'START_1',
        elements: [
          {
            id: 'START_1',
            type: 'Start',
            next: 'DECISION_1',
          },
          {
            id: 'DECISION_1',
            type: 'Decision',
            apiName: 'Check_Value',
            outcomes: [
              {
                name: 'Yes',
                condition: 'var1 == "yes"',
                isDefault: false,
                next: 'END_1',
              },
              {
                name: 'Default',
                isDefault: true,
                next: 'END_1',
              },
            ],
          },
          {
            id: 'END_1',
            type: 'End',
          },
        ],
      };

      const errors = validator.validate(dsl);
      expect(errors).toHaveLength(0);
    });

    it('should validate ScreenElement', () => {
      const dsl: any = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Screen',
        startElement: 'START_1',
        elements: [
          {
            id: 'START_1',
            type: 'Start',
            next: 'SCREEN_1',
          },
          {
            id: 'SCREEN_1',
            type: 'Screen',
            apiName: 'User_Input_Screen',
            components: [
              {
                type: 'Field',
                name: 'InputLabel',
              },
            ],
            allowBack: true,
            allowFinish: false,
            next: 'END_1',
          },
          {
            id: 'END_1',
            type: 'End',
          },
        ],
      };

      const errors = validator.validate(dsl);
      expect(errors).toHaveLength(0);
    });

    it('should validate RecordCreateElement', () => {
      const dsl: any = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'START_1',
        elements: [
          {
            id: 'START_1',
            type: 'Start',
            next: 'CREATE_1',
          },
          {
            id: 'CREATE_1',
            type: 'RecordCreate',
            apiName: 'Create_Account',
            object: 'Account',
            fields: {
              Name: 'Test Account',
            },
            assignRecordIdToReference: 'accountId',
            next: 'END_1',
          },
          {
            id: 'END_1',
            type: 'End',
          },
        ],
      };

      const errors = validator.validate(dsl);
      expect(errors).toHaveLength(0);
    });

    it('should validate RecordUpdateElement', () => {
      const dsl: any = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'START_1',
        elements: [
          {
            id: 'START_1',
            type: 'Start',
            next: 'UPDATE_1',
          },
          {
            id: 'UPDATE_1',
            type: 'RecordUpdate',
            apiName: 'Update_Account',
            object: 'Account',
            fields: {
              Name: 'Updated Account',
            },
            filters: [
              {
                field: 'Id',
                operator: 'EqualTo',
                value: 'accountId',
              },
            ],
            updateMode: 'all',
            next: 'END_1',
          },
          {
            id: 'END_1',
            type: 'End',
          },
        ],
      };

      const errors = validator.validate(dsl);
      expect(errors).toHaveLength(0);
    });

    it('should validate SubflowElement', () => {
      const dsl: any = {
        version: 1,
        flowApiName: 'Test_Flow',
        label: 'Test Flow',
        processType: 'Autolaunched',
        startElement: 'START_1',
        elements: [
          {
            id: 'START_1',
            type: 'Start',
            next: 'SUBFLOW_1',
          },
          {
            id: 'SUBFLOW_1',
            type: 'Subflow',
            apiName: 'Call_Email_Flow',
            flowName: 'Email_Notification_Flow',
            inputAssignments: [
              {
                name: 'recipientId',
                value: 'userId',
              },
            ],
            outputAssignments: [
              {
                name: 'success',
                value: 'emailSent',
              },
            ],
            next: 'END_1',
          },
          {
            id: 'END_1',
            type: 'End',
          },
        ],
      };

      const errors = validator.validate(dsl);
      expect(errors).toHaveLength(0);
    });
  });
});
