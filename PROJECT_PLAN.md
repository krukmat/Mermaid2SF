# Mermaid2SF — Project Plan

## Status

**Compiler-correctness hardening plan: COMPLETE.**

The implementation now has a canonical FlowIR v2, Salesforce semantic validation, deterministic Salesforce XML generation, normalized golden fixtures, semantic round-trip gates, and an XML-tree reverse adapter for the guaranteed subset.

The project remains a **correctness-hardened demo/PoC**, not an org-verified Salesforce compiler, until the authenticated `sf project deploy validate` job runs with `SF_AUTH_URL` configured.

Canonical architecture:

```text
Mermaid / Salesforce XML / Web UI
            ↓
      Canonical FlowIR v2
            ↓
 Salesforce Semantic Validator
            ↓
 Salesforce Metadata Adapter
            ↓
       Flow Metadata XML
            ↓
 Golden + semantic round-trip gates
            ↓
 sf project deploy validate (when authenticated)
```

Detailed execution record: `docs/planning/compiler-correctness-execution.md`.

## Milestones

### M0 — Repository baseline — ✅ Complete

- Canonical validator selected and legacy facade isolated.
- Duplicate production copies removed.
- README and fidelity contract aligned with actual behavior.
- MIT license normalized at the package/repository level.
- Blanket lossless/deployability claims removed.

### M1 — Salesforce correctness baseline — ✅ Complete

- API baseline centralized at `67.0` and overrideable.
- Internal `FlowKind` separated from Salesforce `processType`.
- Screen, Autolaunched and Record-Triggered Start semantics modeled explicitly.
- End is an authoring/IR terminal and never serializes as a fictitious target.
- Canonical Salesforce golden fixtures exist for the three baseline Flow families.
- Supported serializers are exercised against normalized fixtures.

### M2 — FlowIR v2 — ✅ Complete

- Typed `FlowValue`: String, Boolean, Number, Date, DateTime, Reference and Null.
- Structured conditions with typed operands/operators.
- Explicit typed variables/resources.
- Record-trigger configuration represented in the canonical model.
- Supported Mermaid and Salesforce XML paths normalize into FlowIR v2.
- Mermaid authoring supports delimiter-safe references through `ref:<resource>`.

### M3 — Salesforce semantic validator — ✅ Complete

- Stable `M2SF-SF-*` errors.
- Required object/subflow/trigger metadata checks.
- Flow-family compatibility checks.
- API-name and resource/reference validation.
- Non-default Decision outcomes require real conditions.
- XML generation fails before serialization on semantic errors.

### M4 — Correctness gates — ✅ Complete

- Normalized XML tree comparison.
- Golden Salesforce metadata tests.
- Canonical FlowIR semantic comparator.
- Semantic round-trip tests for the guaranteed subset.
- Blocking GitHub Actions `compiler-core` gate: tests + TypeScript build.
- Conditional authenticated Salesforce org gate implemented.

Current evidence at plan close:

```text
Test suites: 44 / 44 passed
Tests:       287 / 287 passed
TypeScript:  build passed
Golden XML:  passed
Round-trip:  passed for guaranteed subset
Org deploy:  gate ready; skipped until SF_AUTH_URL is configured
```

### M5 — Reverse parser and fidelity — ✅ Complete for guaranteed subset

- Regex/string extraction replaced by an XML-tree parser/adapter.
- Salesforce XML maps into FlowIR v2.
- Typed Assignment values, Decision conditions, Screen basics, record operations, Get Records and Subflow metadata are covered by semantic tests.
- Fidelity is feature-scoped; unsupported metadata is not advertised as lossless.

Loop, Wait and Fault remain experimental and are intentionally outside the guaranteed round-trip contract.

### M6 — Product expansion — ✅ Unblocked

The correctness freeze is lifted. Future product work may resume, but every feature must traverse the same compiler contract:

```text
Authoring/Parser
      → FlowIR
      → Semantic Validator
      → Salesforce Adapter
      → Golden / Round-trip tests
      → authenticated org gate when claiming deploy compatibility
```

Prioritized post-hardening work is documented in `docs/planning/post-hardening-backlog.md`.

## Release definition

### What can be claimed now

- deterministic compiler core for the documented subset,
- typed/structured Salesforce semantics,
- normalized golden equivalence,
- semantic round-trip guarantees for the documented subset,
- pre-serialization rejection of known-invalid semantics.

### What must NOT be claimed yet

Do not describe the project as **Salesforce deployment verified** or universally **Salesforce-correct** until representative generated metadata passes the authenticated CI org gate:

```text
FlowIR → Flow XML → sf project deploy validate → SUCCESS
```

## Known residual debt

These items are intentionally outside the completed hardening plan and must remain visible:

- authenticated org evidence is pending `SF_AUTH_URL` configuration;
- legacy repository lint/format backlog is non-blocking and still red;
- dependency audit currently reports legacy vulnerabilities and requires a separate modernization pass;
- `package-lock.json` still carries stale ISC root-license metadata although `package.json`/`LICENSE` are MIT;
- Loop, Wait, Fault, advanced Screens, Apex Actions, HTTP Callouts and additional Flow families are not guaranteed.
