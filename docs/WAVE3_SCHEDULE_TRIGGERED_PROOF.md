# Wave 3 Proof — Schedule-Triggered Flow Bidirectionality

**Status:** PASS  
**Validated:** 2026-09-19  
**Scope:** Schedule-Triggered Flow  
**Contract:** Salesforce XML ⇄ FlowIR ⇄ Mermaid

## What Wave 3 proves

Wave 3 adds a new Start strategy without changing the canonical compiler architecture:

```text
Salesforce Schedule-Triggered Flow XML
                 ↓
               FlowIR
                 ↓
               Mermaid
                 ↓
               FlowIR
                 ↓
Salesforce Schedule-Triggered Flow XML
                 ↓
               FlowIR
```

Correctness is defined as semantic equivalence rather than byte-for-byte XML identity.

## Salesforce schedule model represented

FlowIR now represents Schedule-Triggered metadata independently from Record-Triggered metadata:

```text
ScheduleTriggerConfig
├── frequency: Once | Daily | Weekly
├── startDate
├── startTime
├── object? 
├── filters?
└── filterLogic?
```

Salesforce metadata is emitted with:

```xml
<schedule>
    <frequency>Daily</frequency>
    <startDate>2030-01-01</startDate>
    <startTime>02:00:00.000Z</startTime>
</schedule>
<triggerType>Scheduled</triggerType>
```

An object context is optional. When it is present, Start filters can select records and the Flow body can use `$Record`. Mermaid2SF rejects `$Record` in Schedule-Triggered Flows that have no object context.

Salesforce references used when defining this contract:

- https://help.salesforce.com/s/articleView?id=sf.flow_concepts_trigger_schedule.htm&language=en_US&type=5
- https://help.salesforce.com/s/articleView?id=sf.flow_concepts_type.htm&language=en_US&type=5

## Canonical Mermaid contract

Example:

```text
START: Start
flow: schedule-triggered
frequency: daily
start-date: 2030-01-01
start-time: 02:00:00.000Z
object: Account
filter-logic: and
filter: Industry = Technology
```

The object/filter block is optional.

## Guaranteed Wave 3 subset

The canonical round-trip preserves:

- `ScheduleTriggered` Flow family,
- Salesforce `Scheduled` trigger type,
- `Once`, `Daily`, and `Weekly` frequencies,
- start date,
- start time,
- optional object context,
- supported entry filters,
- filter logic,
- supported `$Record` references when object context exists,
- Assignment,
- Decision,
- basic Get Records,
- Update Records,
- Start and terminal semantics.

## Internal semantic proof

Rich fixture:

```text
test/fixtures/Golden_ScheduleTriggered_Rich.flow-meta.xml
```

It exercises:

- Weekly schedule,
- exact start date/time,
- Account object context,
- entry filter,
- Assignment from `$Record.Name`,
- Decision on `$Record.Name`,
- Get Records using `$Record.Id`,
- Update Records,
- terminal/default paths.

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

Parameterized tests additionally prove canonical Mermaid preservation for:

```text
Once
Daily
Weekly
```

Semantic validation tests cover:

- required schedule metadata,
- accepted date format,
- accepted time format,
- valid schedule frequencies,
- entry filters requiring object context,
- `$Record` requiring object context.

## Canonical compiler-output proof

The external validation fixture is:

```text
test/salesforce-project/force-app/main/default/flows/
Golden_ScheduleTriggered.flow-meta.xml
```

The golden test parses the fixture into FlowIR, regenerates it with `FlowXmlGenerator`, and requires canonical XML equality.

Therefore the metadata accepted by Salesforce is bound directly to canonical compiler output rather than to an unrelated hand-maintained example.

## Real Salesforce Metadata API proof

Authenticated CI executes:

```bash
sf project deploy start \
  --dry-run \
  --source-dir force-app/main/default/flows/Golden_ScheduleTriggered.flow-meta.xml \
  --target-org m2sf-ci \
  --wait 20
```

Observed result on the implementation validation run:

```text
Component: Golden_ScheduleTriggered
Type: Flow
Components: 1/1
Status: Succeeded
Deploy ID: 0Afd200000Tu10jCAB
Dry-run complete.
```

No metadata was persisted to the validation org.

## CI evidence

Implementation validation:

- Repository: `krukmat/Mermaid2SF`
- Branch: `main`
- Implementation/schema commit: `929c9a42a354490ebccccb12406d6879dfad74c6`
- GitHub Actions workflow: `CI`
- Run: `#136`
- Run URL: https://github.com/krukmat/Mermaid2SF/actions/runs/35433671270
- `compiler-core`: success
- `salesforce-org-gate`: success

Observed internal result:

```text
Test Suites: 44 passed, 44 total
Tests:       320 passed, 320 total
TypeScript:  build passed
```

The persistent authenticated Salesforce gate now validates Wave 1, Wave 2A, Wave 2B and Wave 3 canonical fixtures.

## What is proven vs not claimed

| Claim | Evidence | Status |
|---|---|---|
| Scheduled Salesforce XML parses into ScheduleTriggered FlowIR | automated tests | PASS |
| FlowIR serializes schedule metadata into canonical Mermaid | automated tests | PASS |
| Mermaid reconstructs equivalent schedule semantics | semantic round-trip tests | PASS |
| Once / Daily / Weekly survive canonical round-trip | parameterized tests | PASS |
| Object/filter context survives round-trip | rich fixture | PASS |
| `$Record` works when scheduled object context exists | rich fixture + semantic validator tests | PASS |
| `$Record` without object context is rejected | semantic validator test | PASS |
| Assignment / Decision / Get / Update preserve documented semantics | rich fixture | PASS |
| Salesforce validation fixture is canonical compiler output | golden compiler-output test | PASS |
| Canonical Schedule-Triggered metadata is accepted by a real Salesforce org | Metadata API dry-run | PASS |
| Scheduled Paths on Record-Triggered Flows | separate Salesforce feature | NOT IN SCOPE |
| Monthly / hourly / cron cadence | not represented by current Salesforce schedule contract | NOT IN SCOPE |
| Screen/user interaction | incompatible with the Wave 3 background-flow contract | NOT IN SCOPE |
| Every Schedule-Triggered Flow metadata feature | not claimed | NOT IN SCOPE |

## Closure statement

> Mermaid2SF supports a tested bidirectional Schedule-Triggered Flow pipeline through FlowIR for the documented subset, including Once, Daily and Weekly schedules, optional record context, and canonical schedule metadata accepted by Salesforce Metadata API v67.0.

## Related files

- [Supported feature contract](../SUPPORTED_FEATURES.md)
- [Golden Salesforce tests](../src/__tests__/golden-salesforce.test.ts)
- [Semantic validator tests](../src/__tests__/salesforce-semantic-validator.test.ts)
- [Rich Schedule-Triggered fixture](../test/fixtures/Golden_ScheduleTriggered_Rich.flow-meta.xml)
- [Salesforce validation fixture](../test/salesforce-project/force-app/main/default/flows/Golden_ScheduleTriggered.flow-meta.xml)
- [FlowIR v2 schema](../schemas/flow-ir-v2.schema.json)
- [CI workflow](../.github/workflows/ci.yml)
- [Wave 2B proof](./WAVE2B_RECORD_TRIGGERED_BEFORE_SAVE_PROOF.md)
