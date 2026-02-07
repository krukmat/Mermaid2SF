import { MetadataExtractor } from '../extractor/metadata-extractor';

describe('MetadataExtractor direct coverage', () => {
  const extractor = new MetadataExtractor();

  it('throws for unknown element type', () => {
    expect(() => extractor.extract({ id: 'X', label: 'UNKNOWN: X', shape: 'square' })).toThrow(
      /Unknown element type/i,
    );
  });

  it('uses fallback API name when api is not provided', () => {
    const meta = extractor.extract({ id: 'Node_1', label: 'START: Hello World', shape: 'round' });
    expect(meta.apiName).toBe('Hello_World');
  });

  it('uses node id fallback when label sanitizes to empty', () => {
    const meta = extractor.extract({ id: 'Fallback_Id', label: 'START: !!!', shape: 'round' });
    expect(meta.apiName).toBe('Fallback_Id');
  });

  it('extracts assignment and decision properties', () => {
    const assignment = extractor.extract({
      id: 'Assign',
      label: 'ASSIGNMENT: Set\nset: varA = 1\nset: varB = {!Now()}',
      shape: 'square',
    });
    const decision = extractor.extract({
      id: 'Dec',
      label: 'DECISION: Route\ncondition: x > 5',
      shape: 'diamond',
    });

    expect(assignment.properties.assignments).toHaveLength(2);
    expect(decision.properties.conditions).toEqual(['x > 5']);
  });

  it('extracts screen fields and display components with properties', () => {
    const screen = extractor.extract({
      id: 'Screen',
      label: `SCREEN: Form
field: FirstName (String)
required: true
target: {!varName}
display: Welcome`,
      shape: 'square',
    });

    expect(screen.properties.components.length).toBeGreaterThanOrEqual(2);
    expect(screen.properties.components[0].name).toBe('FirstName');
    expect(screen.properties.components[0].required).toBe(true);
  });

  it('extracts record create, update and subflow properties', () => {
    const create = extractor.extract({
      id: 'Create',
      label: `CREATE: Acc
object: Account
field: Name = Test`,
      shape: 'square',
    });
    const update = extractor.extract({
      id: 'Update',
      label: `UPDATE: Acc
object: Account
field: Name = New
filter: Id = {!idVar}`,
      shape: 'square',
    });
    const subflow = extractor.extract({
      id: 'Sub',
      label: `SUBFLOW: Child
flow: ChildFlow
input: inVar = {!x}
output: outVar = {!y}`,
      shape: 'subroutine',
    });

    expect(create.properties.object).toBe('Account');
    expect(update.properties.filters).toHaveLength(1);
    expect(subflow.properties.flowName).toBe('ChildFlow');
    expect(subflow.properties.inputAssignments).toHaveLength(1);
    expect(subflow.properties.outputAssignments).toHaveLength(1);
  });

  it('extracts loop, wait and get records properties', () => {
    const loop = extractor.extract({
      id: 'Loop',
      label: `LOOP: Iterate
collection: coll_Items`,
      shape: 'subroutine',
    });
    const wait = extractor.extract({
      id: 'Wait',
      label: `WAIT: Pause
mode: duration
duration: 5m`,
      shape: 'round',
    });
    const get = extractor.extract({
      id: 'Get',
      label: `GET: Accounts
object: Account
field: Id
filter: Name = 'Test'
sort: Name desc`,
      shape: 'square',
    });

    expect(loop.properties.collection).toBe('coll_Items');
    expect(wait.properties.waitType).toBe('duration');
    expect(wait.properties.durationUnit).toBe('Minutes');
    expect(get.properties.object).toBe('Account');
    expect(get.properties.fields).toEqual(['Id']);
    expect(get.properties.sortDirection).toBe('Descending');
  });

  it('extracts wait event/condition and fault defaults', () => {
    const waitEvent = extractor.extract({
      id: 'WaitEvent',
      label: `WAIT: Event
event: Event_Name__e`,
      shape: 'round',
    });
    const waitCondition = extractor.extract({
      id: 'WaitCond',
      label: `WAIT: Condition
condition: {!x} > 0`,
      shape: 'round',
    });
    const fault = extractor.extract({
      id: 'Fault',
      label: 'FAULT: Handle',
      shape: 'round',
    });

    expect(waitEvent.properties.waitType).toBe('event');
    expect(waitEvent.properties.eventName).toBe('Event_Name__e');
    expect(waitCondition.properties.waitType).toBe('condition');
    expect(fault.properties).toEqual({});
  });
});
