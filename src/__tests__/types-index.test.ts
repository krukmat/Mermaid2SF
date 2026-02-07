import * as typesIndex from '../types';
import {
  DEFAULT_API_VERSION,
  isAssignmentElement,
  isDecisionElement,
  isRecordCreateElement,
  isRecordUpdateElement,
  isScreenElement,
  isSubflowElement,
} from '../types/flow-dsl';

describe('types exports and type guards', () => {
  it('should expose DEFAULT_API_VERSION via barrel export', () => {
    expect(typesIndex.DEFAULT_API_VERSION).toBe(DEFAULT_API_VERSION);
    expect(DEFAULT_API_VERSION).toBe('60.0');
  });

  it('should correctly evaluate flow-dsl type guards', () => {
    const assignment: any = { type: 'Assignment', assignments: [] };
    const decision: any = { type: 'Decision', outcomes: [] };
    const screen: any = { type: 'Screen', components: [] };
    const create: any = { type: 'RecordCreate', object: 'Account', fields: {} };
    const update: any = { type: 'RecordUpdate', object: 'Account', fields: {} };
    const subflow: any = { type: 'Subflow', flowName: 'MySubflow' };
    const end: any = { type: 'End' };

    expect(isAssignmentElement(assignment)).toBe(true);
    expect(isAssignmentElement(decision)).toBe(false);

    expect(isDecisionElement(decision)).toBe(true);
    expect(isDecisionElement(screen)).toBe(false);

    expect(isScreenElement(screen)).toBe(true);
    expect(isScreenElement(create)).toBe(false);

    expect(isRecordCreateElement(create)).toBe(true);
    expect(isRecordCreateElement(update)).toBe(false);

    expect(isRecordUpdateElement(update)).toBe(true);
    expect(isRecordUpdateElement(subflow)).toBe(false);

    expect(isSubflowElement(subflow)).toBe(true);
    expect(isSubflowElement(end)).toBe(false);
  });
});
