# Wave 2B Proof — Record-Triggered Before Save Bidirectionality

**Status:** PASS  
**Validated:** 2026-09-19  
**Scope:** Record-Triggered Flow — Before Save / Fast Field Updates  
**Contract:** Salesforce XML ⇄ FlowIR ⇄ Mermaid

## What Wave 2B proves

Wave 2B extends the bidirectional compiler contract to Record-Triggered Before Save Flows and adds Salesforce-specific semantic rejection before XML generation.

```text
Salesforce Record-Triggered Before Save XML
                 ↓
               FlowIR
                 ↓
               Mermaid
                 ↓
               FlowIR
                 ↓
Salesforce Record-Triggered Before Save XML
                 ↓
               FlowIR
```

Correctness is defined as semantic equivalence rather than byte-for-byte XML identity.

## Salesforce semantic rule enforced

Salesforce documents Fast Field Updates / Before Save flows as limited to:

- Assignment
- Decision
- Get Records
- Loop

Before Save flows can update the triggering record's field values but cannot perform actions such as creating/updating related records or invoking unsupported action families.

Mermaid2SF encodes this as semantic diagnostic:

```text
M2SF-SF-008
```

For `RecordBeforeSave`, unsupported elements are rejected before Salesforce XML is serialized.

Official references:

- https://help.salesforce.com/s/articleView?id=sf.flow_concepts_trigger_record.htm&language=en_US&type=5
- https://help.salesforce.com/s/articleView?id=platform.automate_flow_build_get_started_record_triggered_before_or_after_save.htm&language=en_US&type=5

Loop is permitted by Salesforce, but Loop fidelity remains experimental in Mermaid2SF and is therefore not part of the Wave 2B guaranteed round-trip subset.

## Guaranteed Wave 2B subset

The canonical path preserves:

- trigger object,
- `RecordBeforeSave`,
- record trigger modes:
  - `Create`,
  - `Update`,
  - `CreateAndUpdate`,
- supported entry criteria/filter metadata,
- `$Record.Field` references,
- Assignment targets on `$Record.Field`,
- Decision conditions,
- basic Get Records semantics,
- Start and terminal semantics.

## Internal semantic proof

Rich fixture:

```text
test/fixtures/Golden_RecordTriggered_BeforeSave_Rich.flow-meta.xml
```

The fixture exercises:

- Account Before Save trigger,
- entry criteria,
- Decision on `$Record.Name`,
- Get Records using `$Record.Name`,
- Assignment to `$Record.Description`,
- default-path behavior.

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

Additional tests prove canonical Mermaid preservation for:

```text
Create
Update
CreateAndUpdate
```

Negative tests prove that invalid Before Save constructs are blocked before serialization, including:

```text
RecordCreate
RecordUpdate
Subflow
Wait
Fault
```

Screen elements are already rejected for non-Screen flow families by the existing family validator.

CI evidence:

```text
Test Suites: 44 passed, 44 total
Tests:       306 passed, 306 total
TypeScript:  build passed
```

## Canonical compiler-output proof

The external validation fixture is:

```text
test/salesforce-project/force-app/main/default/flows/
Golden_RecordTriggered_BeforeSave.flow-meta.xml
```

The automated golden test parses that fixture into FlowIR, regenerates it with `FlowXmlGenerator`, and requires canonical XML equality.

This binds the Salesforce dry-run evidence to compiler output rather than to an unrelated hand-maintained XML sample.

## Real Salesforce Metadata API proof

Authenticated CI executes:

```bash
sf project deploy start \
  --dry-run \
  --source-dir force-app/main/default/flows/Golden_RecordTriggered_BeforeSave.flow-meta.xml \
  --target-org m2sf-ci \
  --wait 20
```

Observed Salesforce result:

```text
Component: Golden_RecordTriggered_BeforeSave
Type: Flow
Components: 1/1
Status: Succeeded
Deploy ID: 0Afd200000TtyndCAB
Dry-run complete.
```

No metadata was persisted to the validation org.

## Traceability

- Repository: `krukmat/Mermaid2SF`
- Branch: `main`
- Core Wave 2B normalization commit: `a2dcb2453a27c6606353b08ec7740cfdb6fa76f0`
- GitHub Actions workflow: `CI`
- Run: `#118`
- Run URL: https://github.com/krukmat/Mermaid2SF/actions/runs/35432666182
- `compiler-core`: success
- `salesforce-org-gate`: success

The persistent CI gate now validates Wave 1, Wave 2A and Wave 2B canonical fixtures on authenticated runs.

## What is proven vs not claimed

| Claim | Evidence | Status |
|---|---|---|
| Before Save Salesforce XML parses into FlowIR | automated tests | PASS |
| FlowIR serializes Before Save Start metadata into canonical Mermaid | automated tests | PASS |
| Mermaid reconstructs equivalent Before Save trigger semantics | semantic round-trip tests | PASS |
| Create / Update / CreateAndUpdate trigger modes survive round-trip | parameterized tests | PASS |
| `$Record.Field` Assignment targets survive round-trip | rich fixture | PASS |
| Decision and basic Get Records survive the documented Before Save subset | rich fixture | PASS |
| Invalid Before Save element families are rejected pre-serialization | semantic validator tests | PASS |
| Salesforce validation fixture is canonical compiler output | golden compiler-output test | PASS |
| Canonical Before Save metadata is accepted by a real Salesforce org | Metadata API dry-run | PASS |
| Loop round-trip fidelity | experimental | NOT GUARANTEED |
| Before Delete | future wave | NOT IN SCOPE |
| Every Salesforce Before Save metadata feature | not claimed | NOT IN SCOPE |

## Closure statement

> Mermaid2SF supports a tested bidirectional Record-Triggered Before Save pipeline through FlowIR for the documented subset, enforces Salesforce's Before Save element restrictions before XML generation, and its canonical Before Save metadata has been accepted by Salesforce Metadata API v67.0.

## Related files

- [Supported feature contract](../SUPPORTED_FEATURES.md)
- [Golden Salesforce tests](../src/__tests__/golden-salesforce.test.ts)
- [Semantic validator tests](../src/__tests__/salesforce-semantic-validator.test.ts)
- [Rich Before Save fixture](../test/fixtures/Golden_RecordTriggered_BeforeSave_Rich.flow-meta.xml)
- [Salesforce validation fixture](../test/salesforce-project/force-app/main/default/flows/Golden_RecordTriggered_BeforeSave.flow-meta.xml)
- [CI workflow](../.github/workflows/ci.yml)
- [Wave 2A proof](./WAVE2A_RECORD_TRIGGERED_AFTER_SAVE_PROOF.md)
