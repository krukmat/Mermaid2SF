# Phase F4: XML Generator

> **Objective**: Serialize DSL to Salesforce Flow XML with complete metadata and layout.
> **Status**: ✅ DONE (100%)
> **Prerequisites**: F3 completed

---

## Context (Minimal)

**File to modify**: `src/generators/flow-xml-generator.ts`

**Input**: FlowDSL object (from `src/types/flow-dsl.ts`)
**Output**: `*.flow-meta.xml` string

**Key properties to serialize**:
```typescript
// Must serialize these new fields:
layout?: { x: number; y: number }  // → <locationX>, <locationY>
conditionLogic?: string            // → <conditionLogic>
filterLogic?: string               // → <filterLogic>
operator?: string                  // → <operator>
valueType?: string                 // → <processMetadataValues>
```

---

## Tasks

### TASK F4.1: Add layout serialization

**Priority**: P0
**Modify**: `src/generators/flow-xml-generator.ts`
**Test**: `src/__tests__/generators/flow-xml-generator.test.ts`

#### Subtask F4.1.1 — Write test
```typescript
describe('layout serialization', () => {
  it('serializes locationX and locationY', () => {
    const dsl: FlowDSL = {
      version: 1,
      flowApiName: 'Test',
      label: 'Test',
      processType: 'Screen',
      startElement: 'Start_1',
      elements: [
        { id: 'Start_1', type: 'Start', next: 'End_1', layout: { x: 100, y: 200 } },
        { id: 'End_1', type: 'End', layout: { x: 300, y: 400 } },
      ],
    };
    const xml = generator.generate(dsl);
    expect(xml).toContain('<locationX>100</locationX>');
    expect(xml).toContain('<locationY>200</locationY>');
  });

  it('omits location when layout undefined', () => {
    const dsl: FlowDSL = {
      version: 1,
      flowApiName: 'Test',
      label: 'Test',
      processType: 'Screen',
      startElement: 'Start_1',
      elements: [
        { id: 'Start_1', type: 'Start', next: 'End_1' },
        { id: 'End_1', type: 'End' },
      ],
    };
    const xml = generator.generate(dsl);
    expect(xml).not.toContain('<locationX>');
  });
});
```

#### Subtask F4.1.2 — Implement helper
```typescript
private serializeLayout(element: FlowElement): string {
  if (!element.layout) return '';
  return `
        <locationX>${element.layout.x}</locationX>
        <locationY>${element.layout.y}</locationY>`;
}
```

#### Subtask F4.1.3 — Apply to all element serializers
Add `${this.serializeLayout(element)}` to each element serialization method.

#### Acceptance
- [ ] Layout serialized for all element types
- [ ] Omitted when undefined
- [ ] Tests pass

---

### TASK F4.2: Add conditionLogic serialization

**Priority**: P0
**Modify**: Decision element serialization in `flow-xml-generator.ts`

#### Subtask F4.2.1 — Write test
```typescript
describe('Decision conditionLogic', () => {
  it('serializes conditionLogic', () => {
    const dsl = createDslWithDecision({ conditionLogic: 'and' });
    const xml = generator.generate(dsl);
    expect(xml).toContain('<conditionLogic>and</conditionLogic>');
  });
});
```

#### Subtask F4.2.2 — Implement
In `serializeDecision`:
```typescript
${element.conditionLogic ? `<conditionLogic>${element.conditionLogic}</conditionLogic>` : ''}
```

#### Acceptance
- [ ] conditionLogic serialized
- [ ] Omitted when undefined

---

### TASK F4.3: Add filterLogic serialization

**Priority**: P0
**Modify**: RecordUpdate element serialization

#### Subtask F4.3.1 — Write test
```typescript
describe('RecordUpdate filterLogic', () => {
  it('serializes filterLogic', () => {
    const dsl = createDslWithRecordUpdate({ filterLogic: 'or' });
    const xml = generator.generate(dsl);
    expect(xml).toContain('<filterLogic>or</filterLogic>');
  });
});
```

#### Subtask F4.3.2 — Implement
In `serializeRecordUpdate`:
```typescript
${element.filterLogic ? `<filterLogic>${element.filterLogic}</filterLogic>` : ''}
```

#### Acceptance
- [ ] filterLogic serialized
- [ ] Omitted when undefined

---

### TASK F4.4: Add Assignment operator/valueType

**Priority**: P1
**Modify**: Assignment element serialization

#### Subtask F4.4.1 — Write test
```typescript
describe('Assignment operator/valueType', () => {
  it('serializes operator', () => {
    const dsl = createDslWithAssignment({
      assignments: [{ variable: 'v_Count', value: '1', operator: 'Add' }],
    });
    const xml = generator.generate(dsl);
    expect(xml).toContain('<operator>Add</operator>');
  });
});
```

#### Subtask F4.4.2 — Implement
In assignment serialization:
```typescript
<assignments>
  <name>${a.variable}</name>
  <value><stringValue>${a.value}</stringValue></value>
  ${a.operator ? `<operator>${a.operator}</operator>` : ''}
</assignments>
```

#### Acceptance
- [ ] operator serialized
- [ ] valueType serialized
- [ ] Tests pass

---

### TASK F4.5: Create golden file tests

**Priority**: P1
**Create**: `examples/golden/` directory with input/output pairs

#### Subtask F4.5.1 — Create test input
```yaml
# examples/golden/complete-flow.flow.yaml
version: 1
flowApiName: Complete_Test
label: Complete Test Flow
processType: Screen
startElement: Start_1
elements:
  - id: Start_1
    type: Start
    next: Screen_1
    layout: { x: 50, y: 0 }
  - id: Screen_1
    type: Screen
    next: Decision_1
    layout: { x: 50, y: 100 }
    components: []
  - id: Decision_1
    type: Decision
    conditionLogic: and
    layout: { x: 50, y: 200 }
    outcomes:
      - name: Yes
        condition: "true"
        next: End_1
      - name: No
        isDefault: true
        next: End_1
  - id: End_1
    type: End
    layout: { x: 50, y: 300 }
```

#### Subtask F4.5.2 — Create expected output
```xml
<!-- examples/golden/complete-flow.flow-meta.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>Complete Test Flow</label>
    <processType>Screen</processType>
    <start>
        <locationX>50</locationX>
        <locationY>0</locationY>
        <connector>
            <targetReference>Screen_1</targetReference>
        </connector>
    </start>
    <!-- ... -->
</Flow>
```

#### Subtask F4.5.3 — Write comparison test
```typescript
describe('golden file tests', () => {
  it('matches expected output', () => {
    const input = loadYaml('examples/golden/complete-flow.flow.yaml');
    const expected = loadFile('examples/golden/complete-flow.flow-meta.xml');
    const actual = generator.generate(input);
    expect(normalizeXml(actual)).toBe(normalizeXml(expected));
  });
});
```

#### Acceptance
- [ ] Golden input/output files exist
- [ ] Comparison test passes
- [ ] Diff is zero

---

## Task Dependencies

```
F4.1 (layout) ─┬── F4.5 (golden tests)
F4.2 (conditionLogic) ─┤
F4.3 (filterLogic) ────┤
F4.4 (operator) ───────┘
```

## Verification

```bash
npm test -- flow-xml-generator
npm run lint
```

---

## Completion Checklist

- [x] F4.1 layout serialization
- [x] F4.2 conditionLogic serialization
- [x] F4.3 filterLogic serialization
- [x] F4.4 operator/valueType serialization
- [x] F4.5 golden file tests

✅ **PHASE F4 COMPLETE** - All tasks done. See [PHASE_INDEX.md](./PHASE_INDEX.md)
