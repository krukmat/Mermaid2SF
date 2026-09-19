# Mermaid2SF — Supported Features

This matrix is the public fidelity contract. `Guaranteed` is reserved for behavior backed by automated semantic round-trip tests. Salesforce deploy compatibility additionally requires the authenticated deployment gate. See [`docs/WAVE1_AUTOLAUNCHED_PROOF.md`](docs/WAVE1_AUTOLAUNCHED_PROOF.md) for Wave 1, [`docs/WAVE2A_RECORD_TRIGGERED_AFTER_SAVE_PROOF.md`](docs/WAVE2A_RECORD_TRIGGERED_AFTER_SAVE_PROOF.md) for Wave 2A, and [`docs/WAVE2B_RECORD_TRIGGERED_BEFORE_SAVE_PROOF.md`](docs/WAVE2B_RECORD_TRIGGERED_BEFORE_SAVE_PROOF.md) for Wave 2B.

## Flow families

| Flow family | Forward | Reverse | Round-trip | Notes |
|---|---|---|---|---|
| Autolaunched Flow (no trigger) | Guaranteed subset | Guaranteed subset | Guaranteed subset | Wave 1 bidirectional contract: Salesforce XML ⇄ FlowIR ⇄ Mermaid. See scope below. |
| Screen Flow | Baseline | Partial | Partial | Correct `processType` mapping exists; advanced Screen metadata is not part of Wave 1. |
| Record-Triggered After Save | Guaranteed subset | Guaranteed subset | Guaranteed subset | Wave 2A bidirectional contract for Create, Update and CreateAndUpdate trigger modes. |
| Record-Triggered Before Save | Guaranteed subset | Guaranteed subset | Guaranteed subset | Wave 2B bidirectional contract with Salesforce-specific element restrictions enforced before XML generation. |
| Scheduled / Platform Event / Orchestrated | Unsupported | Partial/unknown | Unsupported | Not part of the current correctness baseline. |

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
- formulas, constants, choices, collection processors, transforms, and other Salesforce Flow metadata not represented by the current FlowIR subset,
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

## Elements

| Element | Forward | Reverse | Round-trip | Fidelity notes |
|---|---|---|---|---|
| Start | Supported | Supported | Guaranteed in Wave 1, Wave 2A and Wave 2B subsets | Record-Triggered Start preserves object, execution mode, trigger mode and documented filter metadata. |
| End / Terminal | Supported | Synthetic | Guaranteed in Wave 1 Autolaunched | End is an authoring/IR concept; Salesforce termination is represented by no connector. |
| Assignment | Supported | Supported | Guaranteed in Wave 1 and Wave 2B subsets | Wave 2B includes `$Record.Field` Assignment targets. |
| Decision | Supported | Supported subset | Guaranteed subset in Wave 1 and Wave 2B | One structured condition per non-default Mermaid outcome; default outcome preserved. |
| Get Records | Basic | Supported subset | Guaranteed subset in Wave 1 and Wave 2B | Basic queried fields/sort and `EqualTo` filters. Salesforce allows Get Records in Before Save. |
| Create Records | Basic | Supported subset | Guaranteed subset in Wave 1 Autolaunched | Explicit object and typed field values; advanced output metadata excluded. |
| Update Records | Basic | Supported subset | Guaranteed subset in Wave 1 Autolaunched | Explicit object, typed field values, `EqualTo` filters and filter logic. |
| Subflow | Basic | Supported subset | Guaranteed subset in Wave 1 Autolaunched | Explicit child Flow API name and basic input/output mappings. |
| Screen | Basic | Partial | Partial | Basic input/display fields only; advanced components unsupported. |
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

Wave 1 Autolaunched, Wave 2A Record-Triggered After Save, and Wave 2B Record-Triggered Before Save compatibility have been externally verified against a real Salesforce org.

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

These external gates prove Salesforce acceptance for the canonical Wave 1, Wave 2A and Wave 2B validation fixtures. Their richer documented subsets are separately proven by semantic round-trip tests. They do not extend the guarantee to unsupported Flow families or metadata outside the documented subsets.
