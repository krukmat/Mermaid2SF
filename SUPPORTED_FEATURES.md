# Mermaid2SF — Supported Features

This matrix is the public fidelity contract. `Guaranteed` is reserved for behavior backed by automated semantic round-trip tests. Salesforce deploy compatibility additionally requires the authenticated deployment gate.

## Flow families

| Flow family | Forward | Reverse | Round-trip | Notes |
|---|---|---|---|---|
| Autolaunched Flow (no trigger) | Guaranteed subset | Guaranteed subset | Guaranteed subset | Wave 1 bidirectional contract: Salesforce XML ⇄ FlowIR ⇄ Mermaid. See scope below. |
| Screen Flow | Baseline | Partial | Partial | Correct `processType` mapping exists; advanced Screen metadata is not part of Wave 1. |
| Record-Triggered Flow | Baseline | Partial | Partial | Requires explicit trigger configuration; not part of the Wave 1 guarantee. |
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
- Salesforce-org acceptance unless the authenticated deployment gate has actually run.

Unsupported Wave 1 metadata must not be described as lossless simply because the XML parser can read part of it.

## Elements

| Element | Forward | Reverse | Round-trip | Fidelity notes |
|---|---|---|---|---|
| Start | Supported | Supported | Guaranteed in Wave 1 Autolaunched | Record-trigger configuration remains feature-scoped. |
| End / Terminal | Supported | Synthetic | Guaranteed in Wave 1 Autolaunched | End is an authoring/IR concept; Salesforce termination is represented by no connector. |
| Assignment | Supported | Supported | Guaranteed in Wave 1 Autolaunched | Typed values are preserved in the guaranteed subset. |
| Decision | Supported | Supported subset | Guaranteed subset in Wave 1 Autolaunched | One structured condition per non-default Mermaid outcome; default outcome preserved. |
| Get Records | Basic | Supported subset | Guaranteed subset in Wave 1 Autolaunched | Basic queried fields/sort and `EqualTo` filters. |
| Create Records | Basic | Supported subset | Guaranteed subset in Wave 1 Autolaunched | Explicit object and typed field values; advanced output metadata excluded. |
| Update Records | Basic | Supported subset | Guaranteed subset in Wave 1 Autolaunched | Explicit object, typed field values, `EqualTo` filters and filter logic. |
| Subflow | Basic | Supported subset | Guaranteed subset in Wave 1 Autolaunched | Explicit child Flow API name and basic input/output mappings. |
| Screen | Basic | Partial | Partial | Basic input/display fields only; advanced components unsupported. |
| Loop | Experimental | Partial | Unsupported | Outside the Wave 1 fidelity contract. |
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

Internal tests validate Mermaid2SF behavior and the Wave 1 semantic round-trip contract. They do not independently prove Salesforce acceptance.

The final external compatibility check is:

```text
FlowIR -> Flow XML -> sf project deploy validate -> SUCCESS
```

The repository includes an optional deployment-validation CI job that runs only when an authenticated Salesforce URL is configured as a repository secret. Without that credential, documentation must not describe deployment compatibility as externally verified.
