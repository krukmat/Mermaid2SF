# Mermaid2SF — Project Plan

## Current objective

Harden the compiler core so that Mermaid2SF can make narrow, evidence-backed Salesforce compatibility claims instead of broad PoC claims.

Canonical architecture:

```text
Authoring / Import
      ↓
Canonical FlowIR
      ↓
Salesforce Semantic Validator
      ↓
Salesforce Metadata Adapter
      ↓
Golden / Round-trip / Deploy Validation
```

Detailed execution order: `docs/planning/compiler-correctness-execution.md`.

## Milestones

### M0 — Repository baseline — Complete

- [x] Canonical validator selected (`src/validator/FlowValidator`).
- [x] Legacy visual validation retained only as a compatibility facade.
- [x] Duplicate extractor/validator/reverse-parser source copies removed from production paths.
- [x] README rewritten around actual PoC/correctness status.
- [x] MIT license normalized.
- [x] `SUPPORTED_FEATURES.md` introduced.
- [x] Blanket zero-loss/full-deployability claims removed from the primary documentation.

### M1 — Salesforce correctness baseline — In progress

- [ ] Canonical Salesforce fixtures for Screen, Autolaunched and Record-Triggered flows.
- [ ] Internal FlowKind -> Salesforce `processType` mapping.
- [ ] Correct Start metadata for record-triggered flows.
- [ ] End/Terminal never emits a dangling connector.
- [ ] Salesforce API version centralized/configurable; baseline v67.0.
- [ ] Supported element serializers aligned to canonical fixtures.

Gate: generated fixtures pass internal golden tests; authenticated org validation is the external release gate.

### M2 — FlowIR v2 — Planned

- [ ] Typed FlowValue.
- [ ] Structured conditions.
- [ ] Explicit typed resources.
- [ ] Semantic connectors/terminal behavior.
- [ ] Supported authoring/import paths normalized into the canonical model.

### M3 — Salesforce semantic validator — Planned

- [ ] Required Salesforce metadata checks.
- [ ] Stable `M2SF-SF-*` error codes.
- [ ] Flow-kind/element compatibility rules.
- [ ] Resource/reference checks.
- [ ] XML generation fails before serialization when semantic validation fails.

### M4 — Correctness tests — Planned

- [ ] Golden normalized Salesforce metadata tests.
- [ ] Semantic FlowIR comparator.
- [ ] Semantic round-trip tests for guaranteed features.
- [ ] GitHub Actions CI for lint/test/build.
- [ ] Optional authenticated Salesforce deployment-validation job.

### M5 — Reverse parser — Planned

- [ ] Replace regex/string parsing with an XML tree parser.
- [ ] Map Salesforce XML AST into canonical FlowIR.
- [ ] Enforce a feature-scoped fidelity matrix.

### M6 — Product expansion — Frozen until core gates stabilize

Candidate work after M0-M5:

- Loop/Wait maturation.
- Advanced Screen components.
- Apex Actions / HTTP Callouts.
- Additional Flow families.
- Web visualizer polish.
- AI-assisted authoring.

## Release definition

The phrase **Salesforce-correct compiler core** is reserved for a release where:

- supported Mermaid -> FlowIR is deterministic,
- supported FlowIR -> XML is deterministic,
- values and decision conditions are semantic/typed,
- terminal paths do not serialize fictitious End targets,
- invalid Salesforce semantics fail before serialization,
- canonical fixtures and golden tests are green,
- and representative metadata has passed a real `sf project deploy validate` against an authenticated org.

Until the last external gate is available, the project remains a correctness-hardened demo/PoC.
