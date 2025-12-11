# Sprint 3 Plan — Onboarding & UX

## Goal
Polish the builder experience with clear states, resilient error handling, and visual feedback so new users can understand flow compilation without guesswork.

## Tasks & Status
- [ ] Interactive onboarding tutorial (stepper overlay with contextual hints and progressing indicators)
- [ ] Empty/error/loading states polish (dedicated overlays, status card, and spinner states)
- [ ] Advanced node guidance & UX cues (highlight helpers, tooltip guidance tied to Loop/Wait/Fault nodes)

## Implementation Outline
- **Onboarding tutorial**: Render an overlay with steps that call out the hero CTA, toolbox, canvas, advanced nodes, and compile action. Provide next/previous controls, skip handling, and highlight the targeted elements plus a progress indicator so newcomers can follow along.
- **State polish**: Show a dedicated empty-state banner within the canvas when no nodes exist, a status card listing compile errors/warnings, and a loading backdrop with spinner/messages whenever compile/download/template actions are pending.
- **Advanced guidance**: Extend the existing advanced node helpers with contextual tooltips, clickable pills that highlight Loop/Wait/Fault nodes on the canvas, and quick help copy near the status/details area so the UX reinforces what those nodes do.

## Notes
- Keep implementation DRY with shared helpers for banners/spinners.
- No new frameworks; leverage existing vanilla page.
- Update documentation/readme if UX changes need explanation.
  - ✅ README updated with guided feedback notes.
