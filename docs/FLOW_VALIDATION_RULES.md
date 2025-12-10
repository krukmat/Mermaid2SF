# Flow Validation Rule Inventory

This document captures the Salesforce Flow constraints the visual builder and CLI must enforce before generating metadata. These rules should be shared between the web canvas and the compiler (`validateFlow(nodes)`).

## Mandatory Flow Structure

- **Single entry point** – Exactly one `Start` element in every flow (Salesforce rejects multiple start nodes).
- **At least one terminal** – Minimum one `End` element. Auto-added today, but validation must still verify.
- **Reachability** – Every node (apart from Start) must have at least one inbound connector; Start must have none. Nodes that are never referenced become unreachable metadata and should error.
- **Unique API names** – `node.apiName` must be unique and match `^[A-Za-z_][A-Za-z0-9_]*$`.

## Connector Integrity

- **Linear nodes (`Screen`, `Assignment`, `GetRecords`, `Wait`, `Fault`, `Subflow`, etc.)** require a populated `next` that references an existing node unless the node type is `End`.
- **Decision nodes** must define at least one outgoing path and identify a default outcome (Salesforce requires a fallback branch). Validator should confirm `yesNext` and `noNext` target valid nodes.
- **Loop nodes** need a `next` target for the body and an automatic exit (the node that runs after the loop completes). We currently infer the next array element; the validator must ensure an explicit `next` or resolvable successor.
- **Wait/Fault nodes** should route to a valid `next`. Waits typically transition after the condition fires; faults should hand off to recovery nodes.
- **No dangling connectors** – every referenced target must exist. Missing nodes should be flagged immediately instead of producing Flow XML with dangling references.

## Metadata Completeness

- **Loop metadata** – `loopCondition` and `iterationCount` must be present (or defaulted) to avoid infinite loops.
- **Wait metadata** – `waitFor` and `waitDuration` (or explicit strategy) must be provided.
- **Fault metadata** – require `faultSource` and `faultMessage`.
- **Decision outcomes** – label/default state should map to DSL so Flow XML renders friendly labels.

## Validation Flow

1. Builder mutates nodes → run `validateFlow` → surface errors in “Status & Issues” card (blocking compile).
2. CLI `compile`, `lint`, `interactive`, and reverse commands run the same validator to prevent invalid DSL from emitting XML.
3. Tests cover each rule (valid/invalid cases) to keep UI and CLI aligned.
