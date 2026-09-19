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

  it('accepts the supported RecordBeforeSave element subset', () => {
    const dsl = flow({
      flowKind: 'RecordTriggered',
      processType: 'RecordTriggered',
      trigger: {
        object: 'Account',
        triggerType: 'RecordBeforeSave',
        recordTriggerType: 'CreateAndUpdate',
      },
      elements: [
        { id: 'Start', type: 'Start', next: 'Route' },
        {
          id: 'Route',
          type: 'Decision',
          outcomes: [
            {
              name: 'Technology',
              conditions: [{
                left: { kind: 'reference', name: '$Record.Industry' },
                operator: 'EqualTo',
                right: { kind: 'string', value: 'Technology' },
              }],
              next: 'SetDescription',
            },
            { name: 'Default', isDefault: true, next: 'End' },
          ],
        },
        {
          id: 'SetDescription',
          type: 'Assignment',
          assignments: [{
            variable: '$Record.Description',
            value: { kind: 'string', value: 'Validated by Mermaid2SF' },
          }],
          next: 'End',
        },
        { id: 'End', type: 'End' },
      ],
    });

    expect(validator.validate(dsl).errors).toHaveLength(0);
  });

  it.each([
    ['RecordCreate', { id: 'Bad', type: 'RecordCreate', object: 'Contact', fields: {}, next: 'End' }],
    ['RecordUpdate', { id: 'Bad', type: 'RecordUpdate', object: 'Account', fields: {}, next: 'End' }],
    ['Subflow', { id: 'Bad', type: 'Subflow', flowName: 'Child_Flow', next: 'End' }],
    ['Wait', { id: 'Bad', type: 'Wait', waitType: 'duration', durationValue: 1, durationUnit: 'Minutes', next: 'End' }],
    ['Fault', { id: 'Bad', type: 'Fault', next: 'End' }],
  ] as const)('rejects %s in RecordBeforeSave', (_type, invalidElement) => {
    const dsl = flow({
      flowKind: 'RecordTriggered',
      processType: 'RecordTriggered',
      trigger: {
        object: 'Account',
        triggerType: 'RecordBeforeSave',
        recordTriggerType: 'CreateAndUpdate',
      },
      elements: [
        { id: 'Start', type: 'Start', next: 'Bad' },
        invalidElement as any,
        { id: 'End', type: 'End' },
      ],
    });

    const result = validator.validate(dsl);
    expect(result.errors.some((error) => error.code === 'M2SF-SF-008' && error.elementId === 'Bad')).toBe(true);
  });

  it('accepts a valid RecordBeforeDelete trigger pair with $Record context', () => {
    const dsl = flow({
      flowKind: 'RecordTriggered',
      processType: 'RecordTriggered',
      trigger: {
        object: 'Account',
        triggerType: 'RecordBeforeDelete',
        recordTriggerType: 'Delete',
      },
      variables: [
        { name: 'deletedId', dataType: 'String', isCollection: false, isInput: false, isOutput: false },
      ],
      elements: [
        { id: 'Start', type: 'Start', next: 'Capture' },
        {
          id: 'Capture',
          type: 'Assignment',
          assignments: [{ variable: 'deletedId', value: { kind: 'reference', name: '$Record.Id' } }],
          next: 'End',
        },
        { id: 'End', type: 'End' },
      ],
    });

    expect(validator.validate(dsl).errors).toHaveLength(0);
  });

  it.each([
    ['RecordBeforeDelete + Update', 'RecordBeforeDelete', 'Update', 'M2SF-SF-017'],
    ['RecordBeforeSave + Delete', 'RecordBeforeSave', 'Delete', 'M2SF-SF-018'],
    ['RecordAfterSave + Delete', 'RecordAfterSave', 'Delete', 'M2SF-SF-018'],
  ] as const)('rejects invalid before-delete trigger pair: %s', (_name, triggerType, recordTriggerType, code) => {
    const dsl = flow({
      flowKind: 'RecordTriggered',
      processType: 'RecordTriggered',
      trigger: {
        object: 'Account',
        triggerType,
        recordTriggerType,
      },
    });

    expect(validator.validate(dsl).errors.some((error) => error.code === code)).toBe(true);
  });

  it('prevents XML serialization for an invalid RecordBeforeDelete trigger pair', () => {
    const dsl = flow({
      flowKind: 'RecordTriggered',
      processType: 'RecordTriggered',
      trigger: {
        object: 'Account',
        triggerType: 'RecordBeforeDelete',
        recordTriggerType: 'Update',
      },
    });

    expect(() => new FlowXmlGenerator().generate(dsl)).toThrow(/M2SF-SF-017/);
  });

  it('accepts a complete ScheduleTriggered baseline with object context', () => {
    const dsl = flow({
      flowKind: 'ScheduleTriggered',
      processType: 'ScheduleTriggered',
      schedule: {
        frequency: 'Daily',
        startDate: '2030-01-01',
        startTime: '02:00:00.000Z',
        object: 'Account',
        filters: [
          { field: 'Industry', operator: 'EqualTo', value: { kind: 'string', value: 'Technology' } },
        ],
      },
      elements: [
        { id: 'Start', type: 'Start', next: 'Capture' },
        {
          id: 'Capture',
          type: 'Assignment',
          assignments: [{ variable: 'recordName', value: { kind: 'reference', name: '$Record.Name' } }],
          next: 'End',
        },
        { id: 'End', type: 'End' },
      ],
      variables: [
        { name: 'recordName', dataType: 'String', isCollection: false, isInput: false, isOutput: false },
      ],
    });

    expect(validator.validate(dsl).errors).toHaveLength(0);
  });

  it('allows ScheduleTriggered flows without an object when no record context is used', () => {
    const dsl = flow({
      flowKind: 'ScheduleTriggered',
      processType: 'ScheduleTriggered',
      schedule: {
        frequency: 'Weekly',
        startDate: '2030-01-07',
        startTime: '03:30:00.000Z',
      },
    });

    expect(validator.validate(dsl).errors).toHaveLength(0);
  });

  it.each([
    ['missing schedule', undefined, 'M2SF-SF-009'],
    ['bad date', { frequency: 'Daily', startDate: '01-01-2030', startTime: '02:00:00.000Z' }, 'M2SF-SF-013'],
    ['bad time', { frequency: 'Daily', startDate: '2030-01-01', startTime: '02:00' }, 'M2SF-SF-014'],
    ['filter without object', {
      frequency: 'Daily',
      startDate: '2030-01-01',
      startTime: '02:00:00.000Z',
      filters: [{ field: 'Industry', operator: 'EqualTo', value: { kind: 'string', value: 'Technology' } }],
    }, 'M2SF-SF-015'],
  ] as const)('rejects ScheduleTriggered %s', (_name, schedule, code) => {
    const dsl = flow({
      flowKind: 'ScheduleTriggered',
      processType: 'ScheduleTriggered',
      schedule: schedule as any,
    });

    expect(validator.validate(dsl).errors.some((error) => error.code === code)).toBe(true);
  });

  it('rejects $Record in ScheduleTriggered flow without object context', () => {
    const dsl = flow({
      flowKind: 'ScheduleTriggered',
      processType: 'ScheduleTriggered',
      schedule: {
        frequency: 'Daily',
        startDate: '2030-01-01',
        startTime: '02:00:00.000Z',
      },
      variables: [
        { name: 'recordName', dataType: 'String', isCollection: false, isInput: false, isOutput: false },
      ],
      elements: [
        { id: 'Start', type: 'Start', next: 'Capture' },
        {
          id: 'Capture',
          type: 'Assignment',
          assignments: [{ variable: 'recordName', value: { kind: 'reference', name: '$Record.Name' } }],
          next: 'End',
        },
        { id: 'End', type: 'End' },
      ],
    });

    expect(validator.validate(dsl).errors.some((error) => error.code === 'M2SF-SF-041')).toBe(true);
  });

  it('prevents XML serialization for invalid RecordBeforeSave elements', () => {
    const dsl = flow({
      flowKind: 'RecordTriggered',
      processType: 'RecordTriggered',
      trigger: {
        object: 'Account',
        triggerType: 'RecordBeforeSave',
        recordTriggerType: 'CreateAndUpdate',
      },
      elements: [
        { id: 'Start', type: 'Start', next: 'Create1' },
        { id: 'Create1', type: 'RecordCreate', object: 'Contact', fields: {}, next: 'End' },
        { id: 'End', type: 'End' },
      ],
    });

    expect(() => new FlowXmlGenerator().generate(dsl)).toThrow(/M2SF-SF-008/);
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
