# Sprint 2 Plan — Interactive Builder (Vanilla + React Flow Exploration)

## Objective
Deliver a more interactive Web Visualizer that makes flow relationships tangible: real drag/drop canvas, intentional visual connectors, and a modal editor so metadata can be tweaked in context. Explore a React Flow migration while keeping the existing vanilla UI as a fallback.

## Scope
- Build an interactive canvas with node dragging, snapping, and pan/zoom controls that reflect the Flow DSL.
- Wire connections (edges) with visual styling and hover state so outcomes, loops, waits, and fault paths read clearly.
- Introduce a modal node editor that surfaces metadata pulls from the DSL and writes edits back into the canvas/state.
- Prototype React Flow hooks in a separate branch/local build to evaluate the upgrade path without breaking the current vanilla experience.

## Workstreams

1. **Canvas & Dragging**
   - Refactor `web/frontend/index.html` structure into declarative node/edge rendering.
   - Implement DOM-based drag/drop with hit-testing and constrained panning/zoom.
   - Add node snapping to grid and connected edge updates for immediate visual feedback.

2. **Visual Connections**
   - Render dynamic SVG edges with labels (Yes/No, loop counts, fault markers).
   - Highlight active routes and provide inline tooltips for advanced nodes.
   - Keep the Mermaid preview & DSL exports in sync with canvas edits.

3. **Modal Node Editor**
   - Build a reusable modal that surfaces metadata fields (API name, assignments, loop conditions, wait settings) with grouped sections for general, connectors, and advanced metadata.
   - Validate inputs (required label/API, Salesforce-safe API pattern) and let decisions, loops, waits, and faults choose their next connectors from the current node list so the canvas state can update directly.
   - Persist all edits back into `nodes` (and trigger `renderAll`) while showing contextual help copy for Loop/Wait/Fault variations inside the modal so users understand each field.

4. **React Flow Exploration**
   - Scaffold a `web/app` React + React Flow proof-of-concept (dev-only) that consumes the same node metadata as the vanilla builder so we can compare layouts side-by-side.
   - Compare integration effort, rendering performance, and bundling needs; document conclusions for future migrations, highlighting how the DSL maps to React Flow nodes/edges and how Vite keeps this bundle isolated.

## Timeline (2 weeks)
- **Week 1**: Canvas refactor + SVG visual connections + Mermaid/DSL sync.
- **Week 2**: Modal editor + React Flow exploration + documentation updates + QA pass.

## Acceptance Criteria
- Users can drag nodes, pan/zoom, and see connectors update in real time with visible labels.
- Modal editor writes metadata back to the canvas/DSL and prevents invalid connections.
- React Flow POC demonstrates how the current data model maps to nodes/edges (even if not yet shipped).
- README/docs capture how the interactive builder differs from the vanilla fallback and how to trigger the React Flow prototype locally.

## Risks & Mitigations
- **Scope creep**: Keep React Flow in a separate branch/POC; don’t ship until the new stack proves itself.
- **Performance**: Use requestAnimationFrame for drag updates and limit DOM node count; offload complex calculations to helpers.
- **State drift**: Centralize node data to avoid duplicate sources of truth; always derive Mermaid/DSL exports from a single state object.

## React Flow POC findings
- **Location**: `web/app` stands apart from the vanilla builder; a dedicated Vite project keeps React-specific dependencies isolated while still living in the repo for reference.
- **Mapping**: React Flow nodes reuse the same `id/apiName` and `x/y` coordinates as the builder’s `nodes` array, while edges come from `next`, `yesNext`, `noNext` and advanced connectors so the DSL stays in sync with the canvas.
- **Bundle notes**: Vite compiles the POC as a small dev bundle (≈70 KB gzipped), React Flow loads lazily, and we can import shared DSL helpers later once we tidy up the vanilla explorer.
