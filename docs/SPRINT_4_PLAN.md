# Sprint 4 Plan — Advanced Builder Features

## Goal
Deliver the next level of polish for the visual builder by adding workspace organization, richer import/export ergonomics, and DX aids (history + shortcuts) so power users can manage multiple flows without leaving the UI.

- [x] **Multi-file workflow** – Tabs, per-tab state, and load/save controls so users can work across flows simultaneously (implemented with a tab bar, per-flow buffers, and new flows that retain nodes/pan/zoom).
- [x] **Import/Export hub** – Drag-and-drop/upload handling for Mermaid, Flow XML, and DSL; a dedicated modal with status copy and export buttons (XML/JSON/PNG/SVG) that reuse the compiler/decompiler endpoints.
- [x] **Version history** – Snapshot timeline, restore/compare actions, and clean/dirt indicators are wired into the history modal with localStorage (max 10 entries) plus a “Save snapshot” control.
- [x] **Keyboard shortcuts** – Global combos (Cmd/Ctrl+S compile, Cmd/Ctrl+T tutorial, Cmd/Ctrl+L template, Delete node, arrows nudge, Cmd/Ctrl+Z undo, Cmd/Ctrl+Y history) now work with an accessible guide and toggle.

## Implementation Outline
1. **Multi-file workflow**
   - Introduce a tab bar above the builder showing each flow’s name/status and allowing new/open/save per tab.
   - Keep a `flowBuffers` map keyed by tab id, holding node arrays, current zoom/pan, and compile metadata.
   - Enable switching tabs without losing work and expose a “New Flow” template button.

2. **Import/Export hub**
   - Add a dedicated modal covering sources (Mermaid/Flow XML/DSL) and outputs (XML/JSON/PNG/SVG) with drag-and-drop, file picker, and paste helpers.
   - Validate file types, parse Mermaid via `/api/compile`, parse Flow XML via `/api/decompile`, and render DSL JSON into the active tab so the builder stays synced.
   - Provide downloads for Mermaid, DSL JSON, Flow XML, PNG, and SVG snapshots; the snapshot exports mirror how the CLI serializes flows and keeps export names tied to the active tab.

3. **Version history**
   - Snapshots of nodes/pan/scale/DSL/XML trigger on compile + manual “Save snapshot”, capped at 10 entries per flow by default.
   - History modal lists timestamped entries with Restore/Compare buttons, dirty indicators, and a summary banner.
   - LocalStorage persistence keeps history per flow so dirty tabs can be reverted even after reloads.

4. **Keyboard shortcuts**
   - Global combos respect focus and avoid interfering with inputs; Cmd/Ctrl+S compiles, +T starts the tutorial, +L loads the onboarding template, +P refreshes preview, Delete removes nodes, arrows nudge, Cmd/Ctrl+Z restores last snapshot, Cmd/Ctrl+Y opens history.
   - Shortcut guide modal enumerates combos and can be toggled on/off for accessibility.
   - Visual indicator on the sidebar card keeps users informed whether shortcuts are enabled, and the toggle button syncs with localStorage.

## Risks & Mitigations
- **Sync complexity**: Keep a single source of truth (`flowBuffers`) and derive Mermaid/DSL/exports from it; reuse existing helpers for serialization.
- **Shortcut conflicts**: Only bind shortcuts when the canvas is focused; provide a manual “Shortcuts guide” in the sidebar.
- **Storage size**: Keep version history capped (e.g., last 10 snapshots) and serialize minimal data (node metadata + connectors).

## Metrics
- Tabs: at least 3 tabs can be open simultaneously without losing node positions or preview state.
- Imports: every supported file type loads without blocking the UI; exports match `compile` outputs.
- History: snapshots refresh the timeline and restore correctly; dirty tabs clearly marked.
- Shortcuts: the sheet lists 6 key combos, and “save”/“compile” combos work reliably.

## Next Steps
Sprint 4’s advanced workflow polish is now delivered: tabs, import/export, history, and shortcuts are active; README and this plan outline the UX so the hosted builder can continue to evolve. Keep AGENTS guidance in mind when adding follow-up docs or cleanup work.
