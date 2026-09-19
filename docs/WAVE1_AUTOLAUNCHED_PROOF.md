# Wave 1 Proof — Autolaunched Flow Bidirectionality

**Status:** PASS  
**Validated:** 2026-09-19  
**Scope:** Autolaunched Flow (no trigger)  
**Contract:** Salesforce XML ⇄ FlowIR ⇄ Mermaid

## What Wave 1 proves

Wave 1 establishes FlowIR as the canonical intermediate representation between Salesforce Flow metadata and Mermaid.

The supported path is:

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

Correctness is defined as **semantic equivalence**, not byte-for-byte XML identity. XML formatting, irrelevant ordering, and the synthetic FlowIR/Mermaid terminal `End` representation are normalized when comparing results.

## Evidence

Wave 1 uses two complementary proof layers.

### 1. Internal semantic round-trip proof

The automated test suite contains a complete bidirectional test in:

- `src/__tests__/golden-salesforce.test.ts`
- `test/fixtures/Golden_Autolaunched_Rich.flow-meta.xml`

The rich fixture exercises:

- Flow variables and typed values
- Assignment
- Decision with default path
- Get Records
- Create Records
- Update Records
- Subflow input/output mappings
- references between resources
- Start and terminal paths

The test executes:

```text
Salesforce XML
  → FlowIR A
  → canonical Mermaid
  → FlowIR B
  → regenerated Salesforce XML
  → FlowIR C
```

and requires:

```text
semanticDiff(FlowIR A, FlowIR B) == 0
semanticDiff(FlowIR A, FlowIR C) == 0
```

The same CI run also requires the full `compiler-core` test and TypeScript build jobs to succeed.

### 2. Real Salesforce Metadata API proof

The canonical Wave 1 Salesforce fixture is:

```text
test/salesforce-project/force-app/main/default/flows/Golden_Autolaunched.flow-meta.xml
```

GitHub Actions authenticates to a validation org using the repository secret `SF_AUTH_URL` and executes a non-destructive dry-run:

```bash
sf project deploy start \
  --dry-run \
  --source-dir force-app/main/default/flows/Golden_Autolaunched.flow-meta.xml \
  --target-org m2sf-ci \
  --wait 20
```

Observed Salesforce result:

```text
Metadata API: v67.0
Component: Golden_Autolaunched
Type: Flow
Components: 1/1
Status: Succeeded
Dry-run complete.
```

No metadata was persisted to the validation org.

## Traceability

External validation was executed from:

- Repository: `krukmat/Mermaid2SF`
- Branch: `main`
- Commit: `d82e55810d4da4f11697a4f019c861a5d1ccd484`
- Workflow: `CI`
- Run: `#91`
- Run URL: https://github.com/krukmat/Mermaid2SF/actions/runs/35431420160
- Job: `salesforce-org-gate`
- Result: `success`

The proof documentation itself was added after that successful validation and does not alter compiler behavior.

## What is externally proven vs internally proven

| Claim | Evidence | Status |
|---|---|---|
| Salesforce XML can be parsed into FlowIR | automated tests | PASS |
| FlowIR can be serialized into canonical Mermaid | automated tests | PASS |
| Canonical Mermaid can be parsed back into equivalent FlowIR | automated semantic diff | PASS |
| FlowIR can regenerate equivalent Salesforce XML | automated semantic diff / golden comparison | PASS |
| Rich Autolaunched subset preserves business semantics across the complete internal round-trip | rich fixture + automated tests | PASS |
| Canonical generated Autolaunched Flow metadata is accepted by a real Salesforce org | Metadata API dry-run | PASS |
| Every possible Autolaunched Flow metadata feature is lossless | not claimed | NOT IN SCOPE |
| Screen / Record-Triggered / Scheduled / Platform Event bidirectionality | future waves | NOT IN SCOPE |

## Important boundary

The real-org dry-run validates the canonical `Golden_Autolaunched` fixture. The richer Wave 1 feature set is proven through semantic round-trip tests inside the compiler.

Therefore the correct Wave 1 claim is:

> Mermaid2SF has a tested bidirectional Autolaunched Flow pipeline through FlowIR, and its canonical generated Autolaunched Flow metadata has been independently accepted by Salesforce Metadata API v67.0.

It is **not** a claim that all Salesforce Autolaunched metadata is already modeled or lossless.

## CI gate

The persistent external gate is defined in:

```text
.github/workflows/ci.yml
```

For authenticated runs it must complete:

```text
Authenticate validation org  → PASS
Validate Wave 1 Autolaunched Flow in Salesforce → PASS
```

A failure in the Salesforce dry-run is a Wave 1 compatibility regression and should block claims of external Salesforce acceptance.

## Related files

- [Supported feature contract](../SUPPORTED_FEATURES.md)
- [Golden Salesforce tests](../src/__tests__/golden-salesforce.test.ts)
- [Rich Autolaunched fixture](../test/fixtures/Golden_Autolaunched_Rich.flow-meta.xml)
- [Salesforce validation fixture](../test/salesforce-project/force-app/main/default/flows/Golden_Autolaunched.flow-meta.xml)
- [CI workflow](../.github/workflows/ci.yml)
