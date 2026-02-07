# Phase F3: Parser/Extractor

> **Objective**: Robust multiline parsing and complete metadata extraction.
> **Status**: ✅ DONE (100%)
> **Prerequisites**: F0, F1, F2 completed

---

## Context (Minimal)

**Files to modify**:
- `src/extractor/metadata-extractor.ts`
- `src/parser/mermaid-parser.ts`

**Files to create**:
- `src/extractor/extraction-utils.ts`
- `src/extractor/extraction-strategy.ts`
- `src/extractor/strategy-registry.ts`
- `src/extractor/strategies/*.ts`

**Key types** (already exist in `src/types/flow-dsl.ts`):
```typescript
type ElementType = 'Start' | 'End' | 'Assignment' | 'Decision' | 'Screen' |
                   'RecordCreate' | 'RecordUpdate' | 'Subflow' | 'Loop' |
                   'Wait' | 'GetRecords' | 'Fault';

interface BaseElement {
  id: string;
  type: ElementType;
  apiName?: string;
  label?: string;
  next?: string;
  layout?: { x: number; y: number };
}
```

---

## Tasks

### TASK F3.1: Create extraction-utils.ts

**Priority**: P0 (Blocker)
**Create**: `src/extractor/extraction-utils.ts`
**Test**: `src/__tests__/extractor/extraction-utils.test.ts`

#### Subtask F3.1.1 — Write test
```typescript
// src/__tests__/extractor/extraction-utils.test.ts
import { extractLayout, parseLines, COMMON_PATTERNS } from '../../extractor/extraction-utils';

describe('extractLayout', () => {
  it('extracts layout from valid line', () => {
    const lines = ['api: Test', 'layout: pos: 120,240'];
    expect(extractLayout(lines)).toEqual({ x: 120, y: 240 });
  });

  it('returns undefined when no layout', () => {
    expect(extractLayout(['api: Test'])).toBeUndefined();
  });

  it('handles spaces', () => {
    expect(extractLayout(['layout: pos:  120 , 240 '])).toEqual({ x: 120, y: 240 });
  });
});

describe('parseLines', () => {
  it('splits and trims', () => {
    const result = parseLines('DECISION: Test\n  api: Dec\n  condition: x > 0');
    expect(result).toEqual(['DECISION: Test', 'api: Dec', 'condition: x > 0']);
  });

  it('handles escaped newlines', () => {
    expect(parseLines('A\\nB')).toEqual(['A', 'B']);
  });
});
```

#### Subtask F3.1.2 — Implement
```typescript
// src/extractor/extraction-utils.ts
export const COMMON_PATTERNS = {
  layout: /layout:\s*pos:\s*(\d+)\s*,\s*(\d+)/i,
  apiName: /api:\s*(\w+)/i,
  condition: /condition:\s*(.+)/i,
  conditionLogic: /conditionLogic:\s*(\w+)/i,
  filterLogic: /filterLogic:\s*(\w+)/i,
  assignment: /set:\s*(\w+)\s*=\s*(.+)/i,
  operator: /op:\s*(\w+)\s*=\s*(\w+)/i,
  valueType: /valueType:\s*(\w+)\s*=\s*(\w+)/i,
} as const;

export function parseLines(label: string): string[] {
  return label.replace(/\\n/g, '\n').split('\n').map(l => l.trim()).filter(Boolean);
}

export function extractLayout(lines: string[]): { x: number; y: number } | undefined {
  for (const line of lines) {
    const m = line.match(COMMON_PATTERNS.layout);
    if (m) return { x: parseInt(m[1], 10), y: parseInt(m[2], 10) };
  }
  return undefined;
}

export function extractPattern(lines: string[], pattern: RegExp): string | undefined {
  for (const line of lines) {
    const m = line.match(pattern);
    if (m) return m[1].trim();
  }
  return undefined;
}
```

#### Subtask F3.1.3 — Verify
```bash
npm test -- extraction-utils
npm run lint
```

#### Acceptance
- [ ] Test file exists
- [ ] Implementation file exists
- [ ] Tests pass
- [ ] No lint errors

---

### TASK F3.2: Add filterLogic to RecordUpdate

**Priority**: P0
**Modify**: `src/extractor/metadata-extractor.ts` line ~226-259
**Test**: Add to `src/__tests__/extractor/metadata-extractor.test.ts`

#### Subtask F3.2.1 — Write test
```typescript
describe('extractRecordUpdateProperties', () => {
  it('extracts filterLogic', () => {
    const extractor = new MetadataExtractor();
    const node = {
      id: 'U1',
      label: 'UPDATE: Test\nobject: Account\nfilter: Id = x\nfilterLogic: and',
      shape: 'square' as const,
    };
    expect(extractor.extract(node).properties.filterLogic).toBe('and');
  });
});
```

#### Subtask F3.2.2 — Implement
Add to `extractRecordUpdateProperties`:
```typescript
let filterLogic: string | undefined;
// Inside loop:
const filterLogicMatch = line.match(/filterLogic:\s*(\w+)/i);
if (filterLogicMatch) {
  filterLogic = filterLogicMatch[1].trim();
}
// Return:
return { object, fields, filters, filterLogic };
```

#### Acceptance
- [ ] Test passes
- [ ] Existing tests pass

---

### TASK F3.3: Add layout to all extractors

**Priority**: P0
**Modify**: `src/extractor/metadata-extractor.ts`
**Depends on**: F3.1

#### Subtask F3.3.1 — Import utilities
```typescript
import { parseLines, extractLayout } from './extraction-utils';
```

#### Subtask F3.3.2 — Modify each method
Apply to: `extractDecisionProperties`, `extractScreenProperties`, `extractRecordCreateProperties`, `extractRecordUpdateProperties`, `extractSubflowProperties`, `extractLoopProperties`, `extractWaitProperties`, `extractGetRecordsProperties`

Pattern:
```typescript
private extractXxxProperties(label: string): Record<string, any> {
  const lines = parseLines(label);
  const layout = extractLayout(lines);
  // ... existing logic using lines instead of label.split('\n') ...
  return { ...existingProps, layout };
}
```

#### Subtask F3.3.3 — Write tests
```typescript
describe('layout extraction', () => {
  const extractor = new MetadataExtractor();

  it('extracts from Decision', () => {
    const node = { id: 'D', label: 'DECISION: T\nlayout: pos: 100,200', shape: 'diamond' as const };
    expect(extractor.extract(node).properties.layout).toEqual({ x: 100, y: 200 });
  });

  it('extracts from Screen', () => {
    const node = { id: 'S', label: 'SCREEN: T\nlayout: pos: 150,300', shape: 'square' as const };
    expect(extractor.extract(node).properties.layout).toEqual({ x: 150, y: 300 });
  });
});
```

#### Acceptance
- [ ] All 8 methods return layout
- [ ] Tests pass for each type
- [ ] No code duplication

---

### TASK F3.4: Create ExtractionStrategy interface

**Priority**: P1
**Create**: `src/extractor/extraction-strategy.ts`
**Depends on**: F3.1

#### Implementation
```typescript
// src/extractor/extraction-strategy.ts
import { ElementType } from '../types/flow-dsl';

export interface ExtractionStrategy {
  readonly elementType: ElementType;
  supports(label: string): boolean;
  extract(label: string): Record<string, any>;
}

export abstract class BaseExtractionStrategy implements ExtractionStrategy {
  abstract readonly elementType: ElementType;
  abstract readonly typePrefix: string;

  supports(label: string): boolean {
    return label.trim().toUpperCase().startsWith(this.typePrefix);
  }

  abstract extract(label: string): Record<string, any>;

  protected parseLines(label: string): string[] {
    return label.replace(/\\n/g, '\n').split('\n').map(l => l.trim()).filter(Boolean);
  }

  protected extractLayout(lines: string[]): { x: number; y: number } | undefined {
    for (const line of lines) {
      const m = line.match(/layout:\s*pos:\s*(\d+)\s*,\s*(\d+)/i);
      if (m) return { x: parseInt(m[1], 10), y: parseInt(m[2], 10) };
    }
    return undefined;
  }
}
```

#### Acceptance
- [ ] File exists
- [ ] TypeScript compiles

---

### TASK F3.5: Implement DecisionExtractionStrategy

**Priority**: P1
**Create**: `src/extractor/strategies/decision-strategy.ts`
**Test**: `src/__tests__/extractor/strategies/decision-strategy.test.ts`
**Depends on**: F3.4

#### Subtask F3.5.1 — Write test
```typescript
import { DecisionExtractionStrategy } from '../../../extractor/strategies/decision-strategy';

describe('DecisionExtractionStrategy', () => {
  const strategy = new DecisionExtractionStrategy();

  it('supports DECISION:', () => {
    expect(strategy.supports('DECISION: Test')).toBe(true);
    expect(strategy.supports('SCREEN: Test')).toBe(false);
  });

  it('extracts all properties', () => {
    const label = 'DECISION: T\ncondition: x > 0\nconditionLogic: or\nlayout: pos: 100,150';
    expect(strategy.extract(label)).toEqual({
      conditions: ['x > 0'],
      conditionLogic: 'or',
      layout: { x: 100, y: 150 },
    });
  });
});
```

#### Subtask F3.5.2 — Implement
```typescript
// src/extractor/strategies/decision-strategy.ts
import { BaseExtractionStrategy } from '../extraction-strategy';
import { ElementType } from '../../types/flow-dsl';

export class DecisionExtractionStrategy extends BaseExtractionStrategy {
  readonly elementType: ElementType = 'Decision';
  readonly typePrefix = 'DECISION:';

  extract(label: string): Record<string, any> {
    const lines = this.parseLines(label);
    const conditions: string[] = [];
    let conditionLogic: string | undefined;
    const layout = this.extractLayout(lines);

    for (const line of lines) {
      const condMatch = line.match(/condition:\s*(.+)/i);
      if (condMatch) { conditions.push(condMatch[1].trim()); continue; }

      const logicMatch = line.match(/conditionLogic:\s*(\w+)/i);
      if (logicMatch) conditionLogic = logicMatch[1].trim();
    }

    return { conditions, conditionLogic, layout };
  }
}
```

#### Acceptance
- [ ] Tests pass
- [ ] Strategy isolated

---

### TASK F3.6: Create StrategyRegistry

**Priority**: P1
**Create**: `src/extractor/strategy-registry.ts`
**Depends on**: F3.4

#### Implementation
```typescript
// src/extractor/strategy-registry.ts
import { ElementType } from '../types/flow-dsl';
import { ExtractionStrategy } from './extraction-strategy';

export class ExtractionStrategyRegistry {
  private readonly strategies = new Map<ElementType, ExtractionStrategy>();

  register(strategy: ExtractionStrategy): this {
    this.strategies.set(strategy.elementType, strategy);
    return this;
  }

  get(type: ElementType): ExtractionStrategy | undefined {
    return this.strategies.get(type);
  }

  has(type: ElementType): boolean {
    return this.strategies.has(type);
  }

  extractFor(type: ElementType, label: string): Record<string, any> {
    const s = this.get(type);
    return s ? s.extract(label) : {};
  }
}
```

#### Acceptance
- [ ] O(1) lookup
- [ ] Method chaining works

---

### TASK F3.7: Migrate MetadataExtractor to Registry

**Priority**: P1
**Modify**: `src/extractor/metadata-extractor.ts`
**Depends on**: F3.5, F3.6

#### Subtask F3.7.1 — Add imports and constructor
```typescript
import { ExtractionStrategyRegistry } from './strategy-registry';
import { DecisionExtractionStrategy } from './strategies/decision-strategy';

export class MetadataExtractor {
  private readonly registry: ExtractionStrategyRegistry;

  constructor(registry?: ExtractionStrategyRegistry) {
    this.registry = registry ?? this.createDefaultRegistry();
  }

  private createDefaultRegistry(): ExtractionStrategyRegistry {
    return new ExtractionStrategyRegistry()
      .register(new DecisionExtractionStrategy());
  }
}
```

#### Subtask F3.7.2 — Modify extractProperties
```typescript
private extractProperties(label: string, type: ElementType): Record<string, any> {
  if (this.registry.has(type)) {
    return this.registry.extractFor(type, label);
  }
  // Fallback switch for non-migrated types
  switch (type) {
    case 'Assignment': return this.extractAssignmentProperties(label);
    // ... keep others
  }
}
```

#### Acceptance
- [ ] Decision uses Strategy
- [ ] Other types still work
- [ ] All tests pass

---

## Task Dependencies

```
F3.1 ──┬── F3.2
       ├── F3.3
       └── F3.4 ──┬── F3.5 ──┐
                  └── F3.6 ──┴── F3.7
```

## Verification

```bash
npm test && npm run lint && npm run type-check
```

---

## Completion Checklist

- [x] F3.1 extraction-utils created
- [x] F3.2 filterLogic added
- [x] F3.3 layout in all extractors
- [x] F3.4 ExtractionStrategy interface
- [x] F3.5 DecisionExtractionStrategy
- [x] F3.6 StrategyRegistry
- [x] F3.7 MetadataExtractor migrated

✅ **PHASE F3 COMPLETE** - All tasks done. See [PHASE_INDEX.md](./PHASE_INDEX.md)
