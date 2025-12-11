# Phase 4 Plan — Extensions & Visual Tooling

## Goal
Expand Mermaid2SF beyond the CLI by supporting advanced Flow elements, automated test artifacts, a full-featured web visualizer/editor, and reverse-engineering utilities so admins and engineers can move between diagrams, DSL, XML, and UI without friction.

## Deliverables & Tasks
1. **4.0 Advanced Elements**
   - Loop, Wait, Fault connectors, GetRecords fully modeled in types, extractor, DSL builder, XML generator, and schema.
   - Integration tests that cover large (>50 nodes) flows to ensure runtime stays <3s.
2. **4.1 Automatic Test Case Generation**
   - Path analyzer derives test cases per decision path.
   - Data generator produces boundary data for Flow variables.
   - Script generator emits Apex/Flow test harness stubs (conceptual output + docs).
   - CLI command `test-plan` exposes the flow analysis, test data, and script artifacts so QA/automation pipelines can consume them directly.
3. **4.2 Web Visualizer/Editor**
   - Backend server exposes `/api/compile`, `/health`, static assets.
   - Frontend provides drag/drop canvas, node editor, template loader, live XML preview, export to Mermaid/DSL.
   - Advanced nodes (Loop, Wait, Fault) and resilience templates are built in so retries, delays, and fault paths can be modeled visually; DSL/mermaid outputs align with backend metadata expectations.
   - Deployment guide + hosted demo link (http://iotforce.es/flow/).
4. **4.3 Reverse Engineering**
   - XML parser → DSL builder → Mermaid renderer with traversal-based node ordering so Mermaid exhibits sensible layout.
   - CLI command `decompile` with tests ensuring round-trip parity and minimal-diff metadata output (layout+filters/objects included).

## Schedule & Ownership
- **Week 1:** 4.0 completion & tests.
- **Week 2:** 4.1 engine (path analysis + data generator).
- **Week 3:** 4.2 backend/frontend MVP.
- **Week 4:** 4.2 polish + deployment guide + demo rollout.
- **Week 5:** 4.3 XML parser + CLI + regression tests.

## Acceptance Criteria
- CLI handles all new elements deterministically with schema validation.
- Generated tests document each path and integrate into CI artifacts (text output stored under `dist/tests`).
- Web editor compiles diagrams through the existing CLI pipeline and exposes runnable demo + README instructions.
- `decompile` command round-trips official examples with minimal diffs and produces valid Mermaid code.

## Dependencies & Risks
- Node 18+ build (already satisfied); ensure backend bundler reuses compiled CLI.
- Frontend remains vanilla (no React/Vite) per current constraint.
- Hosting requires documented deploy steps (DigitalOcean droplet currently in use).
- Risk: XML parser or advanced elements could diverge from Salesforce metadata; mitigate with golden files and Flow Builder verification.
