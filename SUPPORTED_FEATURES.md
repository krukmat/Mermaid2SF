# Mermaid2SF — Supported Features

This matrix is the public fidelity contract. `Guaranteed` is reserved for behavior backed by automated semantic tests; Salesforce deploy compatibility additionally requires the authenticated deployment gate.

## Flow families

| Flow family | Forward | Reverse | Round-trip | Notes |
|---|---|---|---|---|
| Screen Flow | Baseline | Partial | Partial | Correct `processType` mapping is part of compiler hardening. |
| Autolaunched Flow | Baseline | Partial | Partial | No trigger metadata. |
| Record-Triggered Flow | Baseline | Partial | Partial | Requires explicit trigger configuration. |
| Scheduled / Platform Event / Orchestrated | Unsupported | Partial/unknown | Unsupported | Not part of the current correctness baseline. |

## Elements

| Element | Forward | Reverse | Round-trip | Fidelity notes |
|---|---|---|---|---|
| Start | Supported | Supported | Supported | Record-trigger configuration is feature-scoped. |
| End / Terminal | Supported | Synthetic | Supported | End is an authoring/IR concept; Salesforce termination is represented by no connector. |
| Assignment | Supported | Supported | Partial | Typed value hardening required for Guarantee. |
| Decision | Supported | Partial | Partial | Structured conditions required; labels are not conditions. |
| Screen | Basic | Partial | Partial | Basic input/display fields only; advanced components unsupported. |
| Get Records | Basic | Partial | Partial | Automatic storage baseline; advanced output mapping partial. |
| Create Records | Basic | Partial | Partial | Explicit object and typed field values required. |
| Update Records | Basic | Partial | Partial | Explicit object, filters and typed values required. |
| Subflow | Basic | Partial | Partial | Explicit child Flow API name required. |
| Loop | Experimental | Partial | Unsupported | Frozen until correctness baseline is stable. |
| Wait | Experimental | Partial | Unsupported | Frozen until correctness baseline is stable. |
| Fault paths | Experimental | Partial | Unsupported | Connector semantics still being hardened. |
| Apex Action | Unsupported | Unsupported | Unsupported | Post-core expansion candidate. |
| HTTP Callout | Unsupported | Unsupported | Unsupported | Post-core expansion candidate. |

## Fidelity vocabulary

- **Supported** — intended compiler path exists and is covered by internal tests.
- **Basic / Baseline** — intentionally narrow supported subset.
- **Partial** — metadata may be imported/exported but some properties are not preserved.
- **Experimental** — available for demos but not part of the correctness contract.
- **Guaranteed** — semantic round-trip tests prove the feature contract.
- **Unsupported** — intentionally rejected or not modeled.

## External Salesforce gate

Internal tests validate Mermaid2SF behavior. They do not independently prove Salesforce acceptance.

The final compatibility check is:

```text
FlowIR -> Flow XML -> sf project deploy validate -> SUCCESS
```

The repository includes an optional deployment-validation CI job that runs only when an authenticated Salesforce URL is configured as a repository secret. Without that credential, documentation must not describe deployment compatibility as externally verified.
