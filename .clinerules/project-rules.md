# Project Rules (Cline) — Local-only

## Operating mode
- Default to NON-CODING outputs for Functional / Architecture / PO / QA tasks unless explicitly asked to implement code.
- Always start with a short plan (max 6 bullets).
- If information is missing, list assumptions and open questions; proceed with safest assumptions.

## Repo hygiene
- Do not refactor broadly. Prefer small, reviewable diffs.
- Never invent files, APIs, commands, or outputs. If unsure, inspect the repo.
- Keep outputs in `docs/ai/` unless the repo already has a stronger convention.

## Output standards
- Produce structured Markdown with headings.
- Include: Scope, Assumptions, Decisions, Risks, Open Questions, Next Actions.
- For any recommendation, provide at least one concrete example artifact (user story, ADR skeleton, test cases, etc.).

## Local-only constraint
- Assume models are running locally (e.g., via Ollama). Do not propose OpenRouter or other cloud providers.
- If a task would require web access, clearly state limitations and prefer repository inspection over external lookup.
