# Sprint 1 Plan — Landing + Basic Improvements

## Goal

Deliver a compelling first impression and reduce time-to-first-flow without backend changes.

## Scope

- Hero landing: headline/subheadline, CTAs (“Try Live Demo”, “Start Building”), light hero animation (CSS/JS, no heavy libs), gradient background, responsive + accessible.
- Templates gallery: at least 3 presets (Onboarding, Lead Routing, Case Escalation) with Preview/Use actions that load into canvas/state.
- Theme switcher: light/dark via CSS variables, persisted in localStorage, contrast-checked.
- Better icons: replace pills with icon+label per type (Start, Screen, Decision, Assignment, GetRecords, Loop, Wait, End, Fault) using Lucide/Heroicons.

## Development Tasks (status)

- [x] Wireframe landing; pick icon set; define theme tokens (CSS vars).
- [x] Hero section + animation; hook CTAs to builder/scroll/demo.
- [x] Templates gallery (presets + preview/use).
- [x] Theme switcher + persistence; contrast check.
- [x] Icons/labels per node type; spacing/alignment polish.
- [ ] Responsive QA (desktop/tablet/mobile).
- [ ] Accessibility pass (focus-visible done; pending ARIA audit).
- [ ] Lighthouse sanity check (blocked: local server not running; needs http://localhost:4000/flow up).

## Risks & Mitigations

- Performance: keep animations CSS-only (transform/opacity); avoid heavy canvases.
- Accessibility: ensure focus-visible, ARIA labels, contrast on both themes.
- Responsive: test key breakpoints before close.

## Definition of Done

- Landing renders with hero and working CTAs.
- Templates load into the editor without errors.
- Theme toggle switches and persists; contrast acceptable.
- Icons visible and aligned; responsive passes sanity checks.
- No backend changes; build passes and app loads without regressions.
