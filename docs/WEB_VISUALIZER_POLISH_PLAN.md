# Advanced Web Visualizer Polish — Plan

## Objective
Elevate the hosted Flow Visualizer (http://iotforce.es/flow/) from MVP to a demo-ready experience that communicates reliability, onboarding guidance, and deployment repeatability. Focus is polish; no new frameworks or architectural changes.

## Scope
1. **UX/Visual Polish**
   - Refine hero/header text, CTA hierarchy, and state copy (status banners, inline instructions).
   - Improve responsive behavior for ≤768px (sidebar collapse, banner stack reposition, button wrapping).
   - Add consistent iconography (hero chips, toolbox, node list) and ensure accessible contrast in light/dark themes.

2. **State & Feedback Enhancements**
   - Extend status-banners to cover template load success/error, download completion, and theme persistence.
   - Better inline hints in Mermaid/XML previews (e.g., empty states mention templates).
   - Guard rails for advanced nodes (Loop/Wait/Fault) with quick tips in tooltips or inline badges.

3. **Documentation & Deployability**
   - README section “Web Visualizer Deployment” with prerequisites (Node 18+, pm2, nginx/apache reverse proxy snippet).
   - Dedicated `DEPLOY_STEPS.md` for DigitalOcean droplet setup (nvm, Node 18, pm2 service, apache proxy config, health check).
   - Link screenshot/capture in README so visitors can see the UI without running commands.

4. **Quality Checks**
   - Manual responsive QA (desktop/tablet/mobile).
   - Accessibility audit: focus outlines, keyboard access for modals/toolbox, ARIA roles on banners/modals, color contrast check (WCAG AA).
   - Lighthouse sanity run (Performance ≥80, Accessibility ≥90, Best Practices ≥90).

## Deliverables
- Updated `web/frontend/index.html` (copy, layout tweaks, icons, responsive CSS).
- Updated screenshots (store under `docs/images/`).
- README additions describing latest polish + deployment steps.
- `DEPLOY_STEPS.md` refreshed with the exact script/commands for DigitalOcean setup.
- QA notes appended to `docs/FRONTEND_IMPROVEMENT_PLAN.md` (sprint 3/4 sections).

## Timeline (2–3 focused days)
1. **Day 1 – Copy & Layout**
   - Adjust hero text, add badges/CTA explanation.
   - Improve responsive grid + status banner stack behavior on mobile.
2. **Day 2 – Feedback + Docs**
   - Enhance status messages, inline hints, advanced-node guidance.
   - Update README + capture screenshot + refresh deploy steps.
3. **Day 3 – QA & Lighthouse**
   - Run manual QA across breakpoints.
   - Execute Lighthouse + AXE (chrome devtools).
   - Document findings + follow-up tweaks.

## Risks & Mitigations
- **Scope creep**: Keep to polish; no new features beyond copy/UX, icons, and documentation.
- **Accessibility regressions**: Re-test after CSS/JS changes; rely on AXE/Lighthouse.
- **Deploy drift**: Re-validate DigitalOcean script before publishing; note OS/Node assumptions.
