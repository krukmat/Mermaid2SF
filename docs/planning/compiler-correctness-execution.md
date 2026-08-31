# Mermaid2SF — Compiler Correctness Execution

## Result

**Execution complete.** This document is the final execution-order record for the compiler-correctness effort.

Canonical pipeline:

```text
Mermaid / Salesforce XML / Web UI
            → FlowIR v2
            → Semantic Validation
            → Salesforce Metadata Adapter
            → Flow XML
            → Golden / semantic round-trip
            → Salesforce deploy validation when authenticated
```

FlowIR is the canonical source of truth. Mermaid is an authoring/view layer; Salesforce XML is an adapter format.

## Completed execution order

1. ✅ M0 — Repository baseline
2. ✅ M1 — Salesforce correctness baseline
3. ✅ M2 — FlowIR v2
4. ✅ M3 — Salesforce semantic validator
5. ✅ M4 — Compiler correctness gates
6. ✅ M5 — Reverse parser and measurable round-trip
7. ✅ M6 — Feature expansion unblocked

## M0 — Repository baseline

Completed:

- canonical validator selected;
- duplicate production implementations removed/isolated;
- public claims aligned with evidence;
- support/fidelity matrix introduced;
- MIT repository/package license normalized.

## M1 — Salesforce correctness baseline

Completed:

- Salesforce API baseline centralized at 67.0;
- FlowKind separated from Salesforce `processType`;
- Screen, Autolaunched and Record-Triggered Start metadata modeled;
- End treated as an IR terminal with no fictitious Salesforce connector;
- baseline Salesforce metadata fixtures added.

## M2 — FlowIR v2

Completed:

- typed FlowValue;
- structured Decision/filter conditions;
- explicit typed variables/resources;
- explicit record-trigger configuration;
- delimiter-safe Mermaid references via `ref:<resource>`;
- supported authoring/import paths normalize to FlowIR v2.

## M3 — Salesforce semantic validator

Completed:

- stable `M2SF-SF-*` diagnostics;
- object/subflow/trigger requirements;
- Flow-family compatibility rules;
- reference/API-name checks;
- Decision condition requirements;
- pre-serialization failure on invalid semantics.

## M4 — Compiler correctness gates

Completed:

- deterministic XML-tree canonicalization;
- normalized golden metadata comparison;
- FlowIR semantic comparator;
- semantic round-trip tests;
- blocking CI for Jest + TypeScript build;
- conditional authenticated `sf project deploy validate` job.

Evidence at closure:

```text
44 / 44 test suites passed
287 / 287 tests passed
TypeScript build passed
Golden metadata tests passed
Guaranteed-subset semantic round-trip passed
```

The authenticated Salesforce job is implemented but currently skips its deployment steps when `SF_AUTH_URL` is absent. Internal green gates are not described as external org acceptance.

## M5 — Reverse parser

Completed for the guaranteed subset:

- regex-era XML extraction replaced by XML-tree parsing;
- Salesforce Metadata XML maps to FlowIR v2;
- typed values and structured conditions preserved for the tested subset;
- basic Screen, Assignment, Decision, Get/Create/Update Records and Subflow paths covered by semantic round-trip tests;
- fidelity claims scoped through `SUPPORTED_FEATURES.md`.

Loop, Wait and Fault remain outside the guaranteed contract.

## M6 — Feature expansion

The correctness freeze is lifted. This milestone means **new feature work is unblocked**, not that every candidate feature has been implemented.

Every future feature must follow:

```text
Authoring/Parser
      → FlowIR
      → Semantic Validator
      → Salesforce Adapter
      → Golden + semantic round-trip tests
```

If a feature is advertised as deployment-compatible, it must additionally pass the authenticated org gate.

## Completion rule for future agents

Do not bypass FlowIR or weaken semantic validation to preserve an old fixture. When an old test conflicts with Salesforce semantics, migrate the fixture or explicitly classify the behavior as unsupported.

Post-hardening priorities are in `docs/planning/post-hardening-backlog.md`.
