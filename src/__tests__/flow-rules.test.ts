import { validateFlow, FlowNode } from '../validation/flow-rules';

const baseStart: FlowNode = { id: 'Start_1', type: 'Start', next: 'Screen_1' };
const baseEnd: FlowNode = { id: 'End_1', type: 'End' };

const createScreen = (id: string, next?: string): FlowNode => ({ id, type: 'Screen', next });

describe('validateFlow', () => {
  it('passes for a minimal valid flow', () => {
    const nodes: FlowNode[] = [baseStart, createScreen('Screen_1', 'End_1'), { ...baseEnd }];
    const result = validateFlow(nodes);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('requires exactly one start', () => {
    const result = validateFlow([baseStart, { ...baseStart, id: 'Start_2' }, baseEnd]);
    expect(result.errors.some((err) => err.code === 'multiple-starts')).toBe(true);
  });

  it('requires an end', () => {
    const result = validateFlow([baseStart, createScreen('Screen_1', 'Screen_1')]);
    expect(result.errors.some((err) => err.code === 'missing-end')).toBe(true);
  });

  it('requires linear nodes to define next', () => {
    const result = validateFlow([baseStart, createScreen('Screen_1'), baseEnd]);
    expect(result.errors.some((err) => err.code === 'missing-next')).toBe(true);
  });

  it('flags decisions without outcomes', () => {
    const decision: FlowNode = { id: 'Decision_1', type: 'Decision' };
    const result = validateFlow([baseStart, decision, baseEnd]);
    expect(result.errors.some((err) => err.code === 'missing-decision-paths')).toBe(true);
  });

  it('flags missing default decision outcome', () => {
    const decision: FlowNode = { id: 'Decision_1', type: 'Decision', yesNext: 'End_1' };
    const result = validateFlow([baseStart, decision, baseEnd]);
    expect(result.errors.some((err) => err.code === 'missing-default-outcome')).toBe(true);
  });

  it('yields warning for loops lacking metadata', () => {
    const loop: FlowNode = { id: 'Loop_1', type: 'Loop', next: 'End_1' };
    const result = validateFlow([baseStart, loop, baseEnd]);
    expect(result.warnings.some((warn) => warn.code === 'missing-loop-condition')).toBe(true);
    expect(result.warnings.some((warn) => warn.code === 'missing-loop-iterations')).toBe(true);
  });

  it('detects unreachable nodes', () => {
    const orphan: FlowNode = { id: 'Screen_2', type: 'Screen', next: 'End_1' };
    const result = validateFlow([baseStart, createScreen('Screen_1', 'End_1'), orphan, baseEnd]);
    expect(result.errors.some((err) => err.code === 'unreachable-node')).toBe(true);
  });

  it('enforces API name rules and uniqueness', () => {
    const badApi: FlowNode = { id: 'Screen_1', type: 'Screen', next: 'End_1', apiName: '1Invalid' };
    const duplicate: FlowNode = {
      id: 'Assignment_1',
      type: 'Assignment',
      next: 'End_1',
      apiName: 'Shared',
    };
    const duplicate2: FlowNode = {
      id: 'Assignment_2',
      type: 'Assignment',
      next: 'End_1',
      apiName: 'Shared',
    };
    const result = validateFlow([baseStart, badApi, duplicate, duplicate2, baseEnd]);
    expect(result.errors.some((err) => err.code === 'invalid-api-name')).toBe(true);
    expect(result.errors.some((err) => err.code === 'duplicate-api-name')).toBe(true);
  });
});
