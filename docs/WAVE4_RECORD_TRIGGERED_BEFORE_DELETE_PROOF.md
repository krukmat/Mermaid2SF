# Wave 4 Proof — Record-Triggered Before Delete Bidirectionality

**Status:** PASS  
**Validated:** 2026-09-19  
**Scope:** Record-Triggered Flow — Before Delete  
**Contract:** Salesforce XML ⇄ FlowIR ⇄ Mermaid

## What Wave 4 proves

Wave 4 completes the documented Record-Triggered trigger variants by adding the Salesforce Before Delete start contract:

```text
Salesforce Record-Triggered Before Delete XML
                   ↓
                 FlowIR
                   ↓
                 Mermaid
                   ↓
                 FlowIR
                   ↓
Salesforce Record-Triggered Before Delete XML
                   ↓
                 FlowIR
```

Correctness is defined as semantic equivalence rather than byte-for-byte XML identity.

## Salesforce trigger contract represented

Salesforce Metadata API represents this trigger with the required pair:

```xml
<recordTriggerType>Delete</recordTriggerType>
<triggerType>RecordBeforeDelete</triggerType>
```

Mermaid2SF models the pair in `RecordTriggerConfig` and validates it before XML generation:

- `M2SF-SF-017`: `RecordBeforeDelete` requires `Delete`.
- `M2SF-SF-018`: `Delete` requires `RecordBeforeDelete`.

Salesforce references used for the contract:

- https://resources.docs.salesforce.com/latest/latest/en-us/sfdc/pdf/api_meta.pdf
- https://help.salesforce.com/s/articleView?id=sf.flow_concepts_type.htm&language=en_US&type=5

## Canonical Mermaid contract

```text
flow: record-triggered
object: Account
trigger: before-delete
record-trigger: delete
filter-logic: and
filter: Industry = Technology
```

## Guaranteed Wave 4 subset

The canonical round-trip preserves:

- `RecordBeforeDelete`,
- `Delete`,
- trigger object,
- supported entry criteria,
- filter logic,
- `$Record` references,
- Assignment,
- Decision,
- basic Get Records,
- Update Records on related records,
- Start and terminal semantics.

## Internal semantic proof

Rich fixture:

```text
test/fixtures/Golden_RecordTriggered_BeforeDelete_Rich.flow-meta.xml
```

It exercises:

- Account Before Delete Start,
- entry criteria,
- `$Record.Id` and `$Record.Industry`,
- Assignment,
- Decision,
- Get Records on Contact,
- Update Records on Contact,
- default/terminal behavior.

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

Additional negative tests verify invalid trigger pairs are rejected before serialization.

CI evidence:

```text
Test Suites: 44 passed, 44 total
Tests:       328 passed, 328 total
TypeScript:  build passed
```

## Canonical compiler-output proof

The external validation fixture is:

```text
test/salesforce-project/force-app/main/default/flows/
Golden_RecordTriggered_BeforeDelete.flow-meta.xml
```

The automated golden test parses that fixture into FlowIR, regenerates it with `FlowXmlGenerator`, and requires canonical XML equality.

The fixture includes an Update Records operation on related `Contact` records selected through `$Record.Id`.

## Real Salesforce Metadata API proof

Authenticated CI executes:

```bash
sf project deploy start \
  --dry-run \
  --source-dir force-app/main/default/flows/Golden_RecordTriggered_BeforeDelete.flow-meta.xml \
  --target-org m2sf-ci \
  --wait 20
```

Observed result:

```text
Component: Golden_RecordTriggered_BeforeDelete
Type: Flow
Components: 1/1
Status: Succeeded
Deploy ID: 0Afd200000TtzBqCAJ
Dry-run complete.
```

No metadata was persisted to the validation org.

## Traceability

- Repository: `krukmat/Mermaid2SF`
- Branch: `main`
- Implementation/gate commit: `27a112ee49dd6a4771e64cfb40dba128b13f5f7c`
- GitHub Actions workflow: `CI`
- Run: `#150`
- Run URL: https://github.com/krukmat/Mermaid2SF/actions/runs/35434997120
- `compiler-core`: success
- `salesforce-org-gate`: success

## What is proven vs not claimed

| Claim | Evidence | Status |
|---|---|---|
| Before Delete Salesforce XML parses into FlowIR | automated tests | PASS |
| FlowIR serializes the trigger pair into canonical Mermaid | automated tests | PASS |
| Mermaid reconstructs equivalent Before Delete semantics | semantic round-trip tests | PASS |
| `$Record` survives the documented Before Delete round-trip | rich fixture | PASS |
| Assignment / Decision / Get / related-record Update preserve documented semantics | rich fixture | PASS |
| Invalid Before Delete trigger pairs are rejected before XML generation | semantic validator tests | PASS |
| Salesforce validation fixture is canonical compiler output | golden compiler-output test | PASS |
| Canonical Before Delete metadata is accepted by a real Salesforce org | Metadata API dry-run | PASS |
| Custom Error element fidelity | future work | NOT IN SCOPE |
| Additional element families outside the documented subset | not claimed | NOT IN SCOPE |
| Every Salesforce Before Delete metadata feature | not claimed | NOT IN SCOPE |

## Closure statement

> Mermaid2SF supports a tested bidirectional Record-Triggered Before Delete pipeline through FlowIR for the documented subset, enforces the required `RecordBeforeDelete + Delete` trigger pairing, and its canonical Before Delete metadata has been accepted by Salesforce Metadata API v67.0.

## Related files

- [Supported feature contract](../SUPPORTED_FEATURES.md)
- [Golden Salesforce tests](../src/__tests__/golden-salesforce.test.ts)
- [Semantic validator tests](../src/__tests__/salesforce-semantic-validator.test.ts)
- [Rich Before Delete fixture](../test/fixtures/Golden_RecordTriggered_BeforeDelete_Rich.flow-meta.xml)
- [Salesforce validation fixture](../test/salesforce-project/force-app/main/default/flows/Golden_RecordTriggered_BeforeDelete.flow-meta.xml)
- [CI workflow](../.github/workflows/ci.yml)
- [Wave 3 proof](./WAVE3_SCHEDULE_TRIGGERED_PROOF.md)
