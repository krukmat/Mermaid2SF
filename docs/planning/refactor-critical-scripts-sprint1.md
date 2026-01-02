# Sprint 1 Refactor Plan (Critical Scripts)

## Objective
Refactor `flow-xml-generator.ts` and `docs-generator.ts` using the approved design patterns, preserving behavior and public APIs while reducing complexity.

## Scope
- Strategy + Factory patterns for XML generation
- Template Method + separation of rendering/formatting for docs
- Add unit tests for new components without breaking existing tests

## Plan
1. Baseline and scaffolding
   - Review existing generator behavior and outputs.
   - Create new folder structure and interfaces for XML and docs generators.
2. Refactor `flow-xml-generator.ts`
   - Split into header/element/connector/footer components.
   - Implement element strategies and a factory to assemble the generator.
   - Keep `FlowXmlGenerator` as the public facade.
3. Refactor `docs-generator.ts`
   - Introduce template, renderer, and formatter layers.
   - Keep `DocsGenerator` as the public facade.
4. Tests and documentation
   - Add unit tests for new components/patterns.
   - Update `PROJECT_PLAN.md` status and project map.
   - Run lint/tests/coverage per guidelines.

## Acceptance Checks
- Existing CLI/API behavior unchanged.
- New classes remain under 200 LOC each.
- Tests pass and coverage remains >85% for refactored modules.
