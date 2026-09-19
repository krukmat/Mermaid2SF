# Wave 6 Proof — Screen Flow Bidirectional Fidelity

**Status:** PASS  
**Validated:** 2026-09-19  
**Scope:** Screen Flow — standard component fidelity subset  
**Contract:** Salesforce XML ⇄ FlowIR ⇄ Mermaid

## What Wave 6 proves

Wave 6 moves Screen Flow from baseline/partial handling into a documented semantic round-trip contract:

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

Correctness is semantic rather than pixel-perfect Flow Builder layout equivalence.

## Guaranteed Screen metadata

Screen-level properties:

- `allowBack`,
- `allowFinish`,
- `allowPause`,
- `showFooter`,
- `showHeader`,
- Screen connectors and terminal behavior.

Guaranteed component types:

- `InputField`,
- `LargeTextArea`,
- `DisplayText`,
- `RadioButtons`,
- `DropdownBox`.

For those components the canonical model preserves:

- component API name,
- data type,
- label/display text,
- required flag,
- typed default value,
- static choice references,
- one structured visibility condition.

Static Flow Choice resources are represented explicitly in FlowIR.

## Canonical Mermaid contract

Example:

```text
flow: screen

choice: HighPriority (String) = High | High Priority
choice: LowPriority (String) = Low | Low Priority
```

Screen metadata:

```text
SCREEN: Collect Details
allow-back: true
allow-finish: true
allow-pause: true
show-footer: true
show-header: true

input: CustomerName (String) [InputField] | Customer Name
default: Acme
required: true

input: Priority (String) [DropdownBox] | Priority
choices: HighPriority,LowPriority
required: true

display: EmailHint | Email updates are enabled.
visible-if: ref:WantsEmail = true
```

Mermaid escaping may encode delimiter characters such as parentheses/brackets in the serialized node label; the parser decodes them back before metadata extraction.

## Internal semantic proof

Rich fixture:

```text
test/fixtures/Golden_Screen_Wave6_Rich.flow-meta.xml
```

It exercises:

- two Screens,
- Back / Finish / Pause behavior,
- header/footer visibility,
- String and Boolean typed inputs,
- typed String and Boolean defaults,
- required flags,
- DropdownBox,
- static Choice resources,
- Display Text,
- one-condition component visibility,
- Screen-to-Screen navigation.

The automated test executes:

```text
Salesforce XML
  → FlowIR A
  → canonical Mermaid
  → FlowIR B
  → Salesforce XML
  → FlowIR C
```

and requires semantic equality between A/B and A/C.

A second direct FlowIR → Mermaid → FlowIR test verifies Screen navigation, typed defaults, Radio Buttons, choice references and visibility without relying on XML import.

## Semantic validation

Wave 6 adds stable diagnostics:

- `M2SF-SF-026`: Previous and Finish cannot both be disabled.
- `M2SF-SF-027`: invalid or duplicate Screen component API name.
- `M2SF-SF-028`: missing or unresolved choice reference.
- `M2SF-SF-029`: missing required input metadata.
- `M2SF-SF-032`: Screen component family outside the guaranteed Wave 6 subset.
- `M2SF-SF-033`: Display Text without content.
- `M2SF-SF-034`: multiple visibility conditions outside the Wave 6 canonical contract.

Known-invalid Screen metadata is rejected before Salesforce XML generation.

## Canonical compiler-output proof

External validation fixture:

```text
test/salesforce-project/force-app/main/default/flows/
Golden_Screen_Wave6.flow-meta.xml
```

The golden test parses that fixture into FlowIR, regenerates it with `FlowXmlGenerator`, and requires canonical XML equality.

The external fixture deliberately stays dependency-free while still containing:

- two Screens,
- String InputField with a typed default,
- Boolean InputField,
- required flags,
- Display Text,
- Screen navigation connector,
- Back / Finish / Pause,
- header/footer metadata.

## Real Salesforce Metadata API proof

Authenticated CI executes:

```bash
sf project deploy start \
  --dry-run \
  --source-dir force-app/main/default/flows/Golden_Screen_Wave6.flow-meta.xml \
  --target-org m2sf-ci \
  --wait 20
```

Observed result:

```text
Component: Golden_Screen_Wave6
Type: Flow
Components: 1/1
Status: Succeeded
Deploy ID: 0Afd200000Tu9BBCAZ
Dry-run complete.
```

No metadata was persisted to the validation org.

## CI evidence

- Repository: `krukmat/Mermaid2SF`
- Branch: `main`
- Functional closure commit: `073e7125f872877f71e43587e5daf5ce693b4b6f`
- GitHub Actions workflow: `CI`
- Run: `#199`
- Run URL: https://github.com/krukmat/Mermaid2SF/actions/runs/35437737000
- `compiler-core`: success
- `salesforce-org-gate`: success

Observed internal result:

```text
Test Suites: 44 passed, 44 total
Tests:       349 passed, 349 total
TypeScript:  build passed
```

## What is proven vs not claimed

| Claim | Evidence | Status |
|---|---|---|
| Screen Salesforce XML parses into FlowIR | automated tests | PASS |
| Canonical Screen FlowIR serializes to Mermaid and reconstructs equivalent FlowIR | semantic tests | PASS |
| Back / Finish / Pause / header / footer survive the documented round-trip | rich fixture | PASS |
| String/Boolean inputs and typed defaults survive | rich fixture | PASS |
| Static choices and choice references survive | rich fixture | PASS |
| One-condition visibility survives | rich fixture | PASS |
| Display Text survives | rich + external fixtures | PASS |
| External Screen fixture is canonical compiler output | golden compiler-output test | PASS |
| Canonical Screen metadata is accepted by a real Salesforce org | Metadata API dry-run | PASS |
| Custom Lightning Screen Components | future work | NOT IN SCOPE |
| Dynamic/Record Choice Sets | future work | NOT IN SCOPE |
| Multiple-condition visibility | future work | NOT IN SCOPE |
| Advanced sections/regions/layout | future work | NOT IN SCOPE |
| Pixel-perfect Flow Builder layout | not claimed | NOT IN SCOPE |

## Closure statement

> Mermaid2SF supports a tested bidirectional Screen Flow pipeline through FlowIR for the documented Wave 6 subset, including standard typed inputs, Display Text, Screen navigation, typed defaults, static choices and one-condition visibility, with canonical Screen metadata accepted by Salesforce Metadata API v67.0.

## Related files

- [Supported feature contract](../SUPPORTED_FEATURES.md)
- [Golden Salesforce tests](../src/__tests__/golden-salesforce.test.ts)
- [Semantic validator tests](../src/__tests__/salesforce-semantic-validator.test.ts)
- [Rich Screen fixture](../test/fixtures/Golden_Screen_Wave6_Rich.flow-meta.xml)
- [Salesforce validation fixture](../test/salesforce-project/force-app/main/default/flows/Golden_Screen_Wave6.flow-meta.xml)
- [Screen XML strategy](../src/generators/xml/strategies/screen-strategy.ts)
- [FlowIR v2 schema](../schemas/flow-ir-v2.schema.json)
- [CI workflow](../.github/workflows/ci.yml)
- [Wave 5 proof](./WAVE5_PLATFORM_EVENT_TRIGGERED_PROOF.md)
