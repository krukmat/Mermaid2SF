# Wave 2A Proof — Record-Triggered After Save Bidirectionality

**Status:** PASS  
**Validated:** 2026-09-19  
**Scope:** Record-Triggered Flow — After Save  
**Contract:** Salesforce XML ⇄ FlowIR ⇄ Mermaid

## What Wave 2A proves

Wave 2A extends the bidirectional compiler contract established in Wave 1 to Record-Triggered After Save Flows.

The verified path is:

```text
Salesforce Record-Triggered Flow XML
              ↓
            FlowIR
              ↓
            Mermaid
              ↓
            FlowIR
              ↓
Salesforce Record-Triggered Flow XML
              ↓
            FlowIR
```

Correctness is defined as semantic equivalence rather than byte-for-byte XML identity.

## Guaranteed trigger metadata

The canonical Mermaid/FlowIR round-trip preserves:

- trigger object,
- `RecordAfterSave`,
- record trigger mode:
  - `Create`,
  - `Update`,
  - `CreateAndUpdate`,
- entry filters in the current `EqualTo` subset,
- `filterLogic`,
- `doesRequireRecordChangedToMeetCriteria`,
- supported `$Record` references.

## Internal semantic proof

The automated test suite exercises the rich fixture:

```text
test/fixtures/Golden_RecordTriggered_AfterSave_Rich.flow-meta.xml
```

The fixture includes:

- Account Record-Triggered After Save Start,
- trigger entry criteria,
- `$Record.Id` and `$Record.Name` references,
- explicit variables and typed values,
- Assignment,
- Decision with default path,
- Get Records,
- Create Records,
- Update Records,
- basic Subflow input/output mappings.

The test executes:

```text
Salesforce XML
  → FlowIR A
  → canonical Mermaid
  → FlowIR B
  → Salesforce XML
  → FlowIR C
```

and requires:

```text
semanticDiff(FlowIR A, FlowIR B) == 0
semanticDiff(FlowIR A, FlowIR C) == 0
```

Additional parameterized tests prove canonical Mermaid preservation for all three Wave 2A record trigger modes:

```text
Create
Update
CreateAndUpdate
```

Relevant test:

```text
src/__tests__/golden-salesforce.test.ts
```

CI evidence on the Wave 2A implementation:

```text
Test Suites: 44 passed, 44 total
Tests:       293 passed, 293 total
TypeScript:  build passed
```

## Real Salesforce Metadata API proof

A separate org-safe fixture is used for external compatibility validation:

```text
test/salesforce-project/force-app/main/default/flows/
Golden_RecordTriggered_AfterSave.flow-meta.xml
```

It uses only standard Salesforce metadata dependencies:

- `Account`,
- `Contact`,
- standard fields,
- `$Record` references.

The authenticated CI gate executes:

```bash
sf project deploy start \
  --dry-run \
  --source-dir force-app/main/default/flows/Golden_RecordTriggered_AfterSave.flow-meta.xml \
  --target-org m2sf-ci \
  --wait 20
```

Observed Salesforce result:

```text
Component: Golden_RecordTriggered_AfterSave
Type: Flow
Components: 1/1
Status: Succeeded
Deploy ID: 0Afd200000Ttxl7CAB
Dry-run complete.
```

No metadata was persisted to the validation org.

## Traceability

The full Wave 2A implementation was validated by:

- Repository: `krukmat/Mermaid2SF`
- Branch: `main`
- Implementation commit: `e9adee78fd8147ce40af043f44d3ba3041be337a`
- GitHub Actions workflow: `CI`
- Run: `#101`
- Run URL: https://github.com/krukmat/Mermaid2SF/actions/runs/35432135724
- `compiler-core`: success
- `salesforce-org-gate`: success

The persistent Salesforce gate remains in:

```text
.github/workflows/ci.yml
```

and validates both Wave 1 and Wave 2A canonical fixtures on authenticated runs.

## What is proven vs not claimed

| Claim | Evidence | Status |
|---|---|---|
| Salesforce After Save XML parses into FlowIR | automated tests | PASS |
| FlowIR serializes Record-Triggered Start metadata into canonical Mermaid | automated tests | PASS |
| Canonical Mermaid reconstructs equivalent After Save trigger metadata | semantic round-trip tests | PASS |
| Create / Update / CreateAndUpdate modes survive canonical Mermaid round-trip | parameterized tests | PASS |
| `$Record` references survive the supported round-trip | rich fixture | PASS |
| Wave 1 business primitives remain semantically stable in After Save | rich fixture | PASS |
| Canonical After Save metadata is accepted by a real Salesforce org | Metadata API dry-run | PASS |
| Before Save restrictions/fidelity | deferred to Wave 2B | NOT IN SCOPE |
| Before Delete / Scheduled Paths | future work | NOT IN SCOPE |
| Every Salesforce Record-Triggered metadata feature is lossless | not claimed | NOT IN SCOPE |

## Closure statement

The correct Wave 2A claim is:

> Mermaid2SF supports a tested bidirectional Record-Triggered After Save pipeline through FlowIR for the documented subset, including Create, Update and CreateAndUpdate trigger modes, and its canonical After Save metadata has been accepted by Salesforce Metadata API v67.0.

## Related files

- [Supported feature contract](../SUPPORTED_FEATURES.md)
- [Golden Salesforce tests](../src/__tests__/golden-salesforce.test.ts)
- [Rich After Save fixture](../test/fixtures/Golden_RecordTriggered_AfterSave_Rich.flow-meta.xml)
- [Salesforce validation fixture](../test/salesforce-project/force-app/main/default/flows/Golden_RecordTriggered_AfterSave.flow-meta.xml)
- [CI workflow](../.github/workflows/ci.yml)
- [Wave 1 proof](./WAVE1_AUTOLAUNCHED_PROOF.md)
