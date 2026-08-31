import { FlowXmlGenerator } from '../generators/flow-xml-generator';
import { FlowDSL } from '../types/flow-dsl';
import { SalesforceSemanticValidator } from '../validator/salesforce-semantic-validator';

function flow(overrides: Partial<FlowDSL> = {}): FlowDSL {
  return {
    version: 2,
    flowApiName: 'Semantic_Test',
    label: 'Semantic Test',
    flowKind: 'Autolaunched',
    processType: 'Autolaunched',
    apiVersion: '67.0',
    status: 'Draft',
    startElement: 'Start',
    elements: [
      { id: 'Start', type: 'Start', next: 'End' },
      { id: 'End', type: 'End' },
    ],
    ...overrides,
  };
}

describe('SalesforceSemanticValidator', () => {
  const validator = new SalesforceSemanticValidator();

  it('rejects Screen elements in an Autolaunched Flow', () => {
    const dsl = flow({
      elements: [
        { id: 'Start', type: 'Start', next: 'Screen1' },
        { id: 'Screen1', type: 'Screen', components: [], next: 'End' },
        { id: 'End', type: 'End' },
      ],
    });
    expect(validator.validate(dsl).errors.some((error) => error.code === 'M2SF-SF-001')).toBe(true);
  });

  it('rejects record operations with a missing object', () => {
    const dsl = flow({
      elements: [
        { id: 'Start', type: 'Start', next: 'Create1' },
        { id: 'Create1', type: 'RecordCreate', object: '', fields: {}, next: 'End' },
        { id: 'End', type: 'End' },
      ],
    });
    expect(validator.validate(dsl).errors.some((error) => error.code === 'M2SF-SF-020')).toBe(true);
  });

  it('rejects a Subflow without an explicit child Flow API name', () => {
    const dsl = flow({
      elements: [
        { id: 'Start', type: 'Start', next: 'Sub1' },
        { id: 'Sub1', type: 'Subflow', flowName: '', next: 'End' },
        { id: 'End', type: 'End' },
      ],
    });
    expect(validator.validate(dsl).errors.some((error) => error.code === 'M2SF-SF-021')).toBe(true);
  });

  it('requires real Decision conditions instead of outcome labels', () => {
    const dsl = flow({
      elements: [
        { id: 'Start', type: 'Start', next: 'Route' },
        {
          id: 'Route',
          type: 'Decision',
          outcomes: [
            { name: 'New Customer', condition: 'New Customer', next: 'End' },
            { name: 'Default', isDefault: true, next: 'End' },
          ],
        },
        { id: 'End', type: 'End' },
      ],
    });
    expect(validator.validate(dsl).errors.some((error) => error.code === 'M2SF-SF-030')).toBe(true);
  });

  it('accepts a complete record-triggered baseline', () => {
    const dsl = flow({
      flowKind: 'RecordTriggered',
      processType: 'RecordTriggered',
      trigger: {
        object: 'Account',
        triggerType: 'RecordAfterSave',
        recordTriggerType: 'CreateAndUpdate',
      },
      elements: [
        { id: 'Start', type: 'Start', next: 'End' },
        { id: 'End', type: 'End' },
      ],
    });
    expect(validator.validate(dsl).errors).toHaveLength(0);
  });

  it('prevents XML serialization when v2 semantics are invalid', () => {
    const dsl = flow({
      elements: [
        { id: 'Start', type: 'Start', next: 'Create1' },
        { id: 'Create1', type: 'RecordCreate', object: '', fields: {}, next: 'End' },
        { id: 'End', type: 'End' },
      ],
    });
    expect(() => new FlowXmlGenerator().generate(dsl)).toThrow(/M2SF-SF-020/);
  });
});
