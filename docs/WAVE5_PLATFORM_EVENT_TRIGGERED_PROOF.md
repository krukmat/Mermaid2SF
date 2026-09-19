# Wave 5 Proof — Platform Event-Triggered Flow Bidirectionality

**Status:** PASS  
**Validated:** 2026-09-19  
**Scope:** Platform Event-Triggered Flow  
**Contract:** Salesforce XML ⇄ FlowIR ⇄ Mermaid

## What Wave 5 proves

Wave 5 adds an event-driven Flow Start strategy:

```text
Salesforce Platform Event-Triggered Flow XML
                   ↓
                 FlowIR
                   ↓
                 Mermaid
                   ↓
                 FlowIR
                   ↓
Salesforce Platform Event-Triggered Flow XML
                   ↓
                 FlowIR
```

Correctness is defined as semantic equivalence rather than byte-for-byte XML identity.

## Salesforce trigger contract represented

Salesforce Flow metadata represents a Platform Event-triggered Start with:

```xml
<object>SomePlatformEvent</object>
<triggerType>PlatformEvent</triggerType>
```

FlowIR represents that separately from Record-Triggered and Schedule-Triggered metadata:

```text
PlatformEventTriggerConfig
└── eventApiName
```

Canonical Mermaid:

```text
flow: platform-event-triggered
event: M2SF_Validation_Event__e
```

The event message payload is exposed to the Flow body through `$Record`.

## Guaranteed Wave 5 subset

The canonical round-trip preserves:

- `PlatformEventTriggered` Flow family,
- Salesforce `PlatformEvent` trigger type,
- Platform Event API name,
- event payload `$Record` references,
- Assignment,
- Decision,
- basic Get Records,
- Update Records,
- Start and terminal semantics.

## Internal semantic proof

Rich fixture:

```text
test/fixtures/Golden_PlatformEventTriggered_Rich.flow-meta.xml
```

It uses a custom-event-shaped payload:

```text
M2SF_Validation_Event__e
├── Status__c
├── Account_Id__c
└── Message__c
```

and exercises:

- Assignment from `$Record.Status__c`,
- Decision on event status,
- Get Account using `$Record.Account_Id__c`,
- Update Account Description from `$Record.Message__c`,
- terminal/default behavior.

The automated test executes:

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

## Validation semantics

Mermaid2SF enforces:

- `M2SF-SF-019`: Platform Event-Triggered Flow requires platform-event metadata.
- `M2SF-SF-023`: event API name must be syntactically valid.
- `M2SF-SF-025`: Platform Event Start metadata cannot be mixed with Record-Triggered or Schedule-Triggered metadata.
- `$Record` is valid in Platform Event-Triggered context.

The compiler deliberately does not guess whether a syntactically valid API name is actually a Platform Event. Salesforce Metadata API is the authoritative semantic existence/type gate.

## Canonical compiler-output proof

External validation fixture:

```text
test/salesforce-project/force-app/main/default/flows/
Golden_PlatformEventTriggered.flow-meta.xml
```

It targets the standard Platform Event:

```text
BatchApexErrorEvent
```

The automated golden test parses the fixture into FlowIR, regenerates it with `FlowXmlGenerator`, and requires canonical XML equality.

### Why the external fixture uses a standard event

The first validation attempt bundled a custom Platform Event definition with the Flow. The target validation org rejected creation of that event because the org had reached its custom-object limit. The Flow then failed only because the event object could not be created.

To make the external compatibility proof independent of org custom-object capacity, the canonical external fixture was changed to the standard `BatchApexErrorEvent`. The rich custom-event payload remains an internal semantic fixture.

## Real Salesforce Metadata API proof

Authenticated CI executes:

```bash
sf project deploy start \
  --dry-run \
  --source-dir force-app/main/default/flows/Golden_PlatformEventTriggered.flow-meta.xml \
  --target-org m2sf-ci \
  --wait 20
```

Observed result:

```text
Component: Golden_PlatformEventTriggered
Type: Flow
Components: 1/1
Status: Succeeded
Deploy ID: 0Afd200000Tu7ZBCAZ
Dry-run complete.
```

No metadata was persisted to the validation org.

## CI evidence

- Repository: `krukmat/Mermaid2SF`
- Branch: `main`
- Implementation/final gate commit: `3c6cd8d7f9003cfcb011315ecc709c79c31c3811`
- GitHub Actions workflow: `CI`
- Run: `#174`
- Run URL: https://github.com/krukmat/Mermaid2SF/actions/runs/35436866322
- `compiler-core`: success
- `salesforce-org-gate`: success

Observed internal result:

```text
Test Suites: 44 passed, 44 total
Tests:       338 passed, 338 total
TypeScript:  build passed
```

CI also enables branch/workflow concurrency with `cancel-in-progress` so rapid sequential changes do not queue redundant authenticated org validations.

## What is proven vs not claimed

| Claim | Evidence | Status |
|---|---|---|
| Platform Event Salesforce XML parses into FlowIR | automated tests | PASS |
| FlowIR serializes Platform Event Start metadata into canonical Mermaid | automated tests | PASS |
| Mermaid reconstructs equivalent event trigger semantics | semantic round-trip tests | PASS |
| Event payload `$Record` survives the documented round-trip | rich fixture | PASS |
| Assignment / Decision / Get / Update preserve documented payload-driven semantics | rich fixture | PASS |
| Mixed trigger-family metadata is rejected | semantic validator tests | PASS |
| Salesforce validation fixture is canonical compiler output | golden compiler-output test | PASS |
| Standard Platform Event-triggered canonical metadata is accepted by a real Salesforce org | Metadata API dry-run | PASS |
| Offline verification that an arbitrary API name is an actual Platform Event | delegated to Salesforce | NOT CLAIMED |
| Apex Action / HTTP Callout fidelity | future work | NOT IN SCOPE |
| Platform Event replay/subscription configuration outside Flow metadata | future work | NOT IN SCOPE |
| Orchestration | future work | NOT IN SCOPE |

## Closure statement

> Mermaid2SF supports a tested bidirectional Platform Event-Triggered Flow pipeline through FlowIR for the documented subset, preserves event-payload `$Record` semantics, and its canonical Platform Event Start metadata has been accepted by Salesforce Metadata API v67.0.

## Related files

- [Supported feature contract](../SUPPORTED_FEATURES.md)
- [Golden Salesforce tests](../src/__tests__/golden-salesforce.test.ts)
- [Semantic validator tests](../src/__tests__/salesforce-semantic-validator.test.ts)
- [Rich Platform Event fixture](../test/fixtures/Golden_PlatformEventTriggered_Rich.flow-meta.xml)
- [Salesforce validation fixture](../test/salesforce-project/force-app/main/default/flows/Golden_PlatformEventTriggered.flow-meta.xml)
- [FlowIR v2 schema](../schemas/flow-ir-v2.schema.json)
- [CI workflow](../.github/workflows/ci.yml)
- [Wave 4 proof](./WAVE4_RECORD_TRIGGERED_BEFORE_DELETE_PROOF.md)
