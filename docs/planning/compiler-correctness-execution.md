# Mermaid2SF — Compiler Correctness Execution

## Objective

Turn Mermaid2SF from a feature-rich PoC into a Salesforce-correct compiler for an explicitly supported subset of Salesforce Flow.

Canonical pipeline:

```text
Mermaid / Salesforce XML / Web UI
            -> FlowIR
            -> Semantic Validation
            -> Salesforce Metadata Adapter
            -> Flow XML
            -> Salesforce deploy validation
```

FlowIR is the canonical source of truth. Mermaid is an authoring/view layer and Salesforce XML is an adapter format.

## Execution order

1. M0 — Repository baseline
2. M1 — Salesforce correctness baseline
3. M2 — FlowIR v2
4. M3 — Salesforce semantic validator
5. M4 — Compiler correctness tests
6. M5 — Reverse parser and measurable round-trip
7. M6 — Re-enable feature expansion

## M0 — Repository baseline

- Consolidate duplicate validator implementations.
- Remove inactive extractor copies from production paths.
- Synchronize README/spec/project status with real behavior.
- Resolve license inconsistency.
- Publish an explicit support/fidelity matrix.
- Remove unverified full-fidelity/deployability claims.

Gate: one active implementation per compiler responsibility and documentation reflects current code.

## M1 — Salesforce correctness baseline

- Add canonical Salesforce metadata fixtures for Screen, Autolaunched and Record-Triggered flows and the supported element subset.
- Separate internal FlowKind from Salesforce processType/start serialization.
- Treat End as an authoring/IR terminal; never serialize connectors to fictitious End nodes.
- Centralize the Salesforce API version and make it overrideable.
- Correct serializer output for the supported baseline.

Gate: generated baseline metadata is structurally equivalent to canonical fixtures; real org deployment validation remains the external release gate.

## M2 — FlowIR v2

- Introduce typed FlowValue: String, Boolean, Number, Date, DateTime, Reference and Null.
- Replace free-text decision conditions with structured conditions.
- Make variables/resources explicit and typed.
- Represent semantic connector kinds (normal, decision, fault, loop, terminal).
- Migrate supported parser/generator paths to the canonical model.

Gate: canonical fixtures can be represented without value type guessing or decision-label-as-condition behavior.

## M3 — Salesforce semantic validator

Reject invalid semantics before XML generation, including:

- missing object on record operations,
- missing subflow name,
- duplicate API names,
- missing targets,
- Screen in incompatible flow kinds,
- terminal target references,
- invalid/unknown references,
- non-default decision outcomes without real conditions,
- incomplete record-trigger configuration.

Use stable `M2SF-SF-*` error codes.

Gate: known-invalid models fail deterministically before serialization.

## M4 — Compiler correctness tests

Testing layers:

1. unit tests,
2. canonical/golden Salesforce metadata tests,
3. semantic FlowIR comparison,
4. semantic round-trip for guaranteed features,
5. optional authenticated Salesforce deploy-validation CI.

A green unit suite alone must never be described as proof of Salesforce compatibility.

## M5 — Reverse parser

- Replace regex/string XML parsing with a real XML parser.
- Map Salesforce metadata AST into canonical FlowIR.
- Publish a feature-scoped fidelity matrix: Forward / Reverse / Round-trip.
- Only mark round-trip `Guaranteed` when semantic tests prove it.

## M6 — Feature expansion

Only after the correctness gates are stable, resume Web UI/AI work, Loop/Wait maturation, advanced screens, Apex actions, HTTP callouts and additional flow families.

Every new feature must follow:

```text
Authoring/Parser -> FlowIR -> Semantic Validator -> Salesforce Adapter -> Golden Tests
```

## Current execution status

- [x] Plan established.
- [ ] M0
- [ ] M1
- [ ] M2
- [ ] M3
- [ ] M4
- [ ] M5
- [ ] M6

This file is intentionally concise and is the execution-order reference for agents working on the compiler-correctness effort.
