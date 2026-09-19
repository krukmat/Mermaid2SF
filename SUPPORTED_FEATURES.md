# Mermaid2SF — Supported Features

This matrix is the public fidelity contract. `Guaranteed` is reserved for behavior backed by automated semantic round-trip tests. Salesforce deploy compatibility additionally requires the authenticated deployment gate. See [`docs/WAVE1_AUTOLAUNCHED_PROOF.md`](docs/WAVE1_AUTOLAUNCHED_PROOF.md) for Wave 1, [`docs/WAVE2A_RECORD_TRIGGERED_AFTER_SAVE_PROOF.md`](docs/WAVE2A_RECORD_TRIGGERED_AFTER_SAVE_PROOF.md) for Wave 2A, [`docs/WAVE2B_RECORD_TRIGGERED_BEFORE_SAVE_PROOF.md`](docs/WAVE2B_RECORD_TRIGGERED_BEFORE_SAVE_PROOF.md) for Wave 2B, and [`docs/WAVE3_SCHEDULE_TRIGGERED_PROOF.md`](docs/WAVE3_SCHEDULE_TRIGGERED_PROOF.md) for Wave 3. Wave 4 evidence is in [`docs/WAVE4_RECORD_TRIGGERED_BEFORE_DELETE_PROOF.md`](docs/WAVE4_RECORD_TRIGGERED_BEFORE_DELETE_PROOF.md). Wave 5 evidence is in [`docs/WAVE5_PLATFORM_EVENT_TRIGGERED_PROOF.md`](docs/WAVE5_PLATFORM_EVENT_TRIGGERED_PROOF.md). Wave 6 evidence is in [`docs/WAVE6_SCREEN_FLOW_PROOF.md`](docs/WAVE6_SCREEN_FLOW_PROOF.md).

## Flow families

| Flow family | Forward | Reverse | Round-trip | Notes |
|---|---|---|---|---|
| Autolaunched Flow (no trigger) | Guaranteed subset | Guaranteed subset | Guaranteed subset | Wave 1 bidirectional contract: Salesforce XML ⇄ FlowIR ⇄ Mermaid. See scope below. |
| Screen Flow | Guaranteed subset | Guaranteed subset | Guaranteed subset | Wave 6 contract for standard inputs, Display Text, navigation, defaults, simple choices and one-condition visibility. |
| Record-Triggered After Save | Guaranteed subset | Guaranteed subset | Guaranteed subset | Wave 2A bidirectional contract for Create, Update and CreateAndUpdate trigger modes. |
| Record-Triggered Before Save | Guaranteed subset | Guaranteed subset | Guaranteed subset | Wave 2B bidirectional contract with Salesforce-specific element restrictions enforced before XML generation. |
| Record-Triggered Before Delete | Guaranteed subset | Guaranteed subset | Guaranteed subset | Wave 4 contract for `RecordBeforeDelete` + `Delete`, `$Record`, entry criteria and documented background elements. |
| Schedule-Triggered | Guaranteed subset | Guaranteed subset | Guaranteed subset | Wave 3 contract for Once, Daily and Weekly schedules, with optional record context. |
| Platform Event-Triggered | Guaranteed subset | Guaranteed subset | Guaranteed subset | Wave 5 contract for Platform Event Start metadata and event-payload `$Record` semantics. |
| Orchestrated | Unsupported | Partial/unknown | Unsupported | Not part of the current correctness baseline. |

## Wave 1 — Autolaunched bidirectional contract

Wave 1 guarantees semantic preservation for the supported Autolaunched subset across this complete path:

```text
Salesforce Flow XML
        ↓
      FlowIR
        ↓
      Mermaid
        ↓
      FlowIR
        ↓
Salesforce Flow XML
        ↓
      FlowIR
```

The guarantee is semantic rather than byte-for-byte XML identity. Formatting, XML ordering where irrelevant, and the synthetic authoring `End` representation are normalized during comparison.

### Guaranteed Wave 1 subset

- Autolaunched Flow with no trigger.
- Start and terminal paths.
- Explicit Flow variables and typed values.
- Assignment.
- Decision with one structured condition per non-default outcome plus a default outcome.
- Get Records with basic queried fields, sorting, and `EqualTo` filters.
- Create Records with explicit object and field assignments.
- Update Records with explicit object, field assignments, `EqualTo` filters, and filter logic preservation.
- Basic Subflow input/output mappings.
- References between supported resources/elements.
- API version and Flow status needed by the canonical authoring path.

### Explicit Wave 1 boundaries

The following are not covered by the Autolaunched bidirectional guarantee yet:

- multiple conditions on a single Decision outcome in Mermaid authoring,
- non-`EqualTo` Get/Update record filters in Mermaid authoring,
- advanced Record Create output/store metadata,
- Loop, Wait, and Fault-path fidelity,
- Apex Actions and HTTP Callouts,
- formulas, constants, collection processors, transforms, and other Salesforce Flow metadata outside the documented FlowIR contracts,
- full layout/visual fidelity as a deployment guarantee,
- Salesforce-org acceptance beyond the explicitly validated Wave 1 Autolaunched fixture and supported subset.

Unsupported Wave 1 metadata must not be described as lossless simply because the XML parser can read part of it.


## Wave 2A — Record-Triggered After Save bidirectional contract

Wave 2A extends the same canonical contract to Record-Triggered After Save Flows:

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

### Guaranteed Wave 2A trigger subset

- Record-Triggered Flow with `triggerType = RecordAfterSave`.
- Standard trigger object metadata.
- Record trigger modes: `Create`, `Update`, and `CreateAndUpdate`.
- Entry filters using the current canonical `EqualTo` filter subset.
- `filterLogic`.
- `doesRequireRecordChangedToMeetCriteria`.
- `$Record` references through supported values and conditions.
- The Wave 1 business-element subset where valid for After Save: Assignment, Decision, Get Records, Create Records, Update Records and basic Subflow mappings.

The rich Wave 2A fixture is checked with semantic equality across Salesforce XML → FlowIR → Mermaid → FlowIR → Salesforce XML → FlowIR. A separate org-safe fixture is validated by Salesforce Metadata API in CI.

### Explicit Wave 2A boundaries

Wave 2A does not claim:

- Before Save restrictions or fidelity (Wave 2B),
- Before Delete,
- scheduled paths,
- non-`EqualTo` trigger filters in canonical Mermaid authoring,
- Apex Actions or HTTP Callouts,
- universal support for all Record-Triggered metadata,
- lossless preservation of Salesforce metadata that is not modeled by FlowIR.

## Wave 2B — Record-Triggered Before Save bidirectional contract

Wave 2B extends the canonical contract to Record-Triggered Before Save (Fast Field Updates) Flows:

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

### Guaranteed Wave 2B subset

- `triggerType = RecordBeforeSave`.
- Trigger object metadata.
- Record trigger modes: `Create`, `Update`, and `CreateAndUpdate`.
- Entry filters using the current canonical `EqualTo` subset.
- `filterLogic` and supported trigger metadata already covered by the canonical Record-Triggered Start.
- `$Record.Field` references in supported conditions and Assignment targets/values.
- Assignment.
- Decision with the canonical structured-condition subset.
- Get Records with the existing basic fidelity subset.
- Start and terminal semantics.

Salesforce currently permits only Assignment, Decision, Get Records, and Loop in Before Save flows. Mermaid2SF enforces this before XML generation through `M2SF-SF-008`. Loop is Salesforce-valid but remains outside the guaranteed Mermaid2SF round-trip subset because Loop fidelity is still experimental.

### Explicit Wave 2B boundaries

Wave 2B does not claim:

- Loop round-trip fidelity,
- Before Delete,
- formula resources or custom validation-error features not represented by FlowIR,
- non-`EqualTo` canonical Mermaid filters,
- every Salesforce Before Save metadata feature.

Create Records, Update Records, Subflow, Screen, Wait, Fault and other unsupported element families are rejected for `RecordBeforeSave` before serialization.

## Wave 3 — Schedule-Triggered bidirectional contract

Wave 3 introduces a new Start strategy while keeping the canonical compiler architecture unchanged:

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

### Guaranteed Wave 3 subset

- `flowKind = ScheduleTriggered`.
- Salesforce `triggerType = Scheduled`.
- Schedule frequencies `Once`, `Daily`, and `Weekly`.
- Exact preservation of `startDate` and `startTime`.
- Optional Salesforce object context.
- Entry filters using the current canonical `EqualTo` subset.
- `filterLogic`.
- `$Record` references when an object context is present.
- Assignment, Decision, basic Get Records, and Update Records demonstrated by the rich semantic round-trip fixture.
- Start and terminal semantics.

Canonical Mermaid Start metadata is:

```text
flow: schedule-triggered
frequency: daily
start-date: 2030-01-01
start-time: 02:00:00.000Z
object: Account
filter: Industry = Technology
```

The object, filters, and filter logic are optional. Without an object context, `$Record` is rejected by semantic validation.

### Explicit Wave 3 boundaries

Wave 3 does not claim:

- monthly, hourly, cron, or custom schedule cadences,
- Scheduled Paths on Record-Triggered Flows,
- Screen/user-interaction semantics,
- non-`EqualTo` trigger filters in canonical Mermaid authoring,
- every Salesforce Schedule-Triggered metadata feature,
- universal support for every Flow element inside a Scheduled Flow.

## Wave 4 — Record-Triggered Before Delete bidirectional contract

Wave 4 adds the delete-trigger variant to the canonical Record-Triggered contract:

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

### Guaranteed Wave 4 subset

- `triggerType = RecordBeforeDelete`.
- `recordTriggerType = Delete`.
- Trigger object metadata.
- Entry filters using the current canonical `EqualTo` subset.
- `filterLogic`.
- `$Record` references.
- Assignment.
- Decision with the canonical structured-condition subset.
- Basic Get Records.
- Update Records on related records.
- Start and terminal semantics.

Mermaid2SF enforces the trigger pair before XML generation:

- `M2SF-SF-017`: `RecordBeforeDelete` requires `Delete`.
- `M2SF-SF-018`: `Delete` requires `RecordBeforeDelete`.

Canonical Mermaid Start metadata:

```text
flow: record-triggered
object: Account
trigger: before-delete
record-trigger: delete
```

The canonical Salesforce fixture also contains a related-record Update Records operation using `$Record.Id`, and the complete fixture passed the authenticated Salesforce dry-run.

### Explicit Wave 4 boundaries

Wave 4 does not claim Custom Error fidelity, advanced action families, non-`EqualTo` canonical trigger filters, or universal support for all Before Delete metadata.

## Wave 5 — Platform Event-Triggered bidirectional contract

Wave 5 adds an event-driven Start strategy:

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

### Guaranteed Wave 5 subset

- `flowKind = PlatformEventTriggered`.
- Salesforce `triggerType = PlatformEvent`.
- Platform Event API name represented independently in `PlatformEventTriggerConfig`.
- Custom Platform Events (for example `Something__e`) and standard Platform Event API names are representable.
- `$Record` references represent the Platform Event message payload.
- Assignment.
- Decision with the canonical structured-condition subset.
- Basic Get Records.
- Update Records driven by event payload values.
- Start and terminal semantics.

Canonical Mermaid Start metadata:

```text
flow: platform-event-triggered
event: M2SF_Validation_Event__e
```

The rich semantic fixture uses a custom-event-shaped payload to exercise `$Record.Status__c`, `$Record.Account_Id__c`, and `$Record.Message__c`. The external org gate intentionally uses the standard `BatchApexErrorEvent` so validation does not depend on spare custom-object capacity in the target org.

### Validation boundaries

Mermaid2SF validates that the Platform Event API name is syntactically valid, but it does not attempt to infer locally whether an arbitrary API name is actually a Platform Event. That semantic existence/type check belongs to Salesforce Metadata API.

Wave 5 does not claim:

- arbitrary Platform Event field-schema validation offline,
- Apex Action or HTTP Callout fidelity,
- replay/subscription configuration outside Flow metadata,
- every background-flow element supported by Salesforce,
- Orchestration support.

## Wave 6 — Screen Flow bidirectional fidelity contract

Wave 6 promotes Screen Flow from partial/baseline support to a tested bidirectional subset:

```text
Salesforce Screen Flow XML
           ↓
         FlowIR
           ↓
         Mermaid
           ↓
         FlowIR
           ↓
Salesforce Screen Flow XML
           ↓
         FlowIR
```

### Guaranteed Wave 6 subset

Screen-level semantics:

- `allowBack`,
- `allowFinish`,
- `allowPause`,
- `showFooter`,
- `showHeader`,
- Screen connectors and terminal navigation.

Guaranteed standard Screen component subset:

- `InputField`,
- `LargeTextArea`,
- `DisplayText`,
- `RadioButtons`,
- `DropdownBox`.

The contract preserves:

- component API name,
- input data type,
- input/display label or text,
- `isRequired`,
- typed default values,
- static Choice resources,
- choice references,
- one structured visibility condition per component.

Canonical Mermaid authoring uses metadata such as:

```text
allow-back: true
allow-finish: true
allow-pause: false
show-footer: true
show-header: true

input: CustomerName (String) [InputField] | Customer Name
default: Acme
required: true

input: Priority (String) [DropdownBox] | Priority
choices: HighPriority,LowPriority

display: EmailHint | Email updates are enabled.
visible-if: ref:WantsEmail = true
```

Choice resources are declared canonically on Start metadata:

```text
choice: HighPriority (String) = High | High Priority
choice: LowPriority (String) = Low | Low Priority
```

### Wave 6 semantic validation

The semantic validator rejects known-invalid or out-of-contract Screen metadata before XML generation:

- `M2SF-SF-026` — Previous and Finish cannot both be disabled.
- `M2SF-SF-027` — invalid or duplicate Screen component API name.
- `M2SF-SF-028` — missing/unknown choice resource.
- `M2SF-SF-029` — missing required input metadata.
- `M2SF-SF-032` — component type outside the Wave 6 guaranteed subset.
- `M2SF-SF-033` — empty Display Text.
- `M2SF-SF-034` — more than one visibility condition in canonical Wave 6 authoring.

### Explicit Wave 6 boundaries

Wave 6 does not claim:

- custom Lightning Screen Components,
- sections/regions and advanced responsive layout metadata,
- record-field components and advanced lookup/address/file-upload components,
- dynamic Choice Sets or Record Choice Sets,
- multiple-condition visibility expressions,
- advanced input validation/error-message metadata,
- pixel-perfect Salesforce Flow Builder layout fidelity,
- every Salesforce Screen component type.

## Elements

| Element | Forward | Reverse | Round-trip | Fidelity notes |
|---|---|---|---|---|
| Start | Supported | Supported | Guaranteed in Wave 1, Wave 2A, Wave 2B, Wave 3, Wave 4, Wave 5 and Wave 6 subsets | Includes Autolaunched, Record-Triggered, Schedule-Triggered, Platform Event-Triggered and Screen Flow starts. |
| End / Terminal | Supported | Synthetic | Guaranteed in Wave 1 Autolaunched | End is an authoring/IR concept; Salesforce termination is represented by no connector. |
| Assignment | Supported | Supported | Guaranteed in Wave 1, Wave 2B, Wave 3 and Wave 5 subsets | Wave 5 covers event-payload `$Record` values. |
| Decision | Supported | Supported subset | Guaranteed subset in Wave 1, Wave 2B, Wave 3, Wave 4 and Wave 5 | One structured condition per non-default Mermaid outcome; default outcome preserved. |
| Get Records | Basic | Supported subset | Guaranteed subset in Wave 1, Wave 2B, Wave 3, Wave 4 and Wave 5 | Basic queried fields/sort and `EqualTo` filters. |
| Create Records | Basic | Supported subset | Guaranteed subset in Wave 1 Autolaunched | Explicit object and typed field values; advanced output metadata excluded. |
| Update Records | Basic | Supported subset | Guaranteed subset in Wave 1, Wave 3, Wave 4 and Wave 5 | Wave 5 rich proof uses event payload values to select/update records. |
| Subflow | Basic | Supported subset | Guaranteed subset in Wave 1 Autolaunched | Explicit child Flow API name and basic input/output mappings. |
| Screen | Supported subset | Supported subset | Guaranteed subset in Wave 6 | Standard inputs, Display Text, navigation, typed defaults, static choices and one-condition visibility. |
| Loop | Experimental | Partial | Unsupported | Salesforce permits Loop in Before Save, but Mermaid2SF Loop fidelity is still outside the guaranteed contract. |
| Wait | Experimental | Partial | Unsupported | Outside the Wave 1 fidelity contract. |
| Fault paths | Experimental | Partial | Unsupported | Connector semantics are not part of the Wave 1 guarantee. |
| Apex Action | Unsupported | Unsupported | Unsupported | Post-core expansion candidate. |
| HTTP Callout | Unsupported | Unsupported | Unsupported | Post-core expansion candidate. |

## Fidelity vocabulary

- **Supported** — intended compiler path exists and is covered by internal tests.
- **Basic / Baseline** — intentionally narrow supported subset.
- **Partial** — metadata may be imported/exported but some properties are not preserved.
- **Experimental** — available for demos but not part of the correctness contract.
- **Guaranteed subset** — automated semantic tests prove the explicitly documented subset across the stated path.
- **Unsupported** — intentionally rejected or not modeled.

## External Salesforce gate

Wave 1 Autolaunched, Wave 2A Record-Triggered After Save, Wave 2B Record-Triggered Before Save, Wave 3 Schedule-Triggered, Wave 4 Record-Triggered Before Delete, Wave 5 Platform Event-Triggered, and Wave 6 Screen Flow compatibility have been externally verified against a real Salesforce org.

The CI gate authenticates with the configured `SF_AUTH_URL` and performs a non-destructive Metadata API dry-run of the canonical Autolaunched fixture:

```text
FlowIR -> Flow XML -> sf project deploy start --dry-run -> SUCCESS
```

Verified on 2026-09-19 with Salesforce Metadata API v67.0:

- `Golden_Autolaunched` validated as a Salesforce `Flow`.
- Components validated: 1/1.
- Dry-run status: `Succeeded`.
- No metadata was persisted to the validation org.

Wave 2A was additionally verified on 2026-09-19 with Salesforce Metadata API v67.0:

- `Golden_RecordTriggered_AfterSave` validated as a Salesforce `Flow`.
- Components validated: 1/1.
- Dry-run status: `Succeeded`.
- No metadata was persisted to the validation org.

Wave 2B was additionally verified on 2026-09-19 with Salesforce Metadata API v67.0:

- `Golden_RecordTriggered_BeforeSave` validated as a Salesforce `Flow`.
- Components validated: 1/1.
- Dry-run status: `Succeeded`.
- No metadata was persisted to the validation org.

Wave 3 was additionally verified on 2026-09-19 with Salesforce Metadata API v67.0:

- `Golden_ScheduleTriggered` validated as a Salesforce `Flow`.
- Components validated: 1/1.
- Dry-run status: `Succeeded`.
- No metadata was persisted to the validation org.

Wave 4 was additionally verified on 2026-09-19 with Salesforce Metadata API v67.0:

- `Golden_RecordTriggered_BeforeDelete` validated as a Salesforce `Flow`.
- Components validated: 1/1.
- Dry-run status: `Succeeded`.
- No metadata was persisted to the validation org.

Wave 5 was additionally verified on 2026-09-19 with Salesforce Metadata API v67.0:

- `Golden_PlatformEventTriggered` validated as a Salesforce `Flow`.
- External trigger target: standard `BatchApexErrorEvent`.
- Components validated: 1/1.
- Dry-run status: `Succeeded`.
- No metadata was persisted to the validation org.

The rich Wave 5 custom-event payload is separately proven by semantic round-trip tests and does not require that custom Platform Event to exist in the validation org.

Wave 6 was additionally verified on 2026-09-19 with Salesforce Metadata API v67.0:

- `Golden_Screen_Wave6` validated as a Salesforce `Flow`.
- The external fixture contains two Screens, typed String/Boolean inputs, a typed default, Display Text, Screen-to-Screen navigation, and Back/Finish/Pause/header/footer metadata.
- Components validated: 1/1.
- Dry-run status: `Succeeded`.
- No metadata was persisted to the validation org.

Static choices and one-condition visibility are separately proven by the rich Wave 6 semantic round-trip fixture.

These external gates prove Salesforce acceptance for the canonical Wave 1, Wave 2A, Wave 2B, Wave 3, Wave 4, Wave 5 and Wave 6 validation fixtures. Their richer documented subsets are separately proven by semantic round-trip tests. They do not extend the guarantee to unsupported Flow families or metadata outside the documented subsets.
