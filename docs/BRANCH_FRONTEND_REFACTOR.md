# Branch Instructions – `frontend-refactor`

This branch focuses on the advanced web visualizer refresh documented in `docs/SPRINT_4_PLAN.md`. Before doing any work:

- Read `PROJECT_PLAN.md` plus the current sprint/phase sections (the AGENTS guide also calls out that plan-first workflow).
- Review `web/frontend/index.html` to understand how tabs, history, and shortcuts interact with `flowBuffers`.
- Confirm any related review doc (such as `docs/TASK_3.1_REVIEW.md`) is still valid before coding.

## Key responsibilities on this branch

1. **History snapshots** – Keep the history modal, dirty indicators, and localStorage persistence in sync. Use `npm run build` and `npm test` after editing files to ensure the CLI and server still compile.
2. **Keyboard shortcuts** – Validate combos (Cmd/Ctrl+S/T/L/P/Z/Y, Delete, arrows) and keep the toggle/guide modal documented in the sidebar card.
3. **Documentation** – Update `README.md`, `docs/SPRINT_4_PLAN.md`, and `DEPLOY_STEPS.md` with anything new so the hosted demo instructions stay accurate.
4. **Testing** – Always run `npm test` (with coverage if feasible) and confirm `web/frontend/index.html` works locally in the browser (use `npm run build` + `node web/server/index.js` or open the file directly for proof-of-concept view).

## Verification before merging

- Run `npm test` and confirm every suite passes.
- Launch the frontend (`web/server/index.js`) and manually trigger “Save snapshot”, restore/compare entries, then try the shortcut buttons/guide to ensure they behave as expected.
- Follow the deployment steps (`DEPLOY_STEPS.md`) if you must refresh the hosted demo; mention the commands used in the commit message for traceability.

## Branch housekeeping

- Use a descriptive Conventional Commit message (e.g., `feat: add history snapshots and shortcuts`).
- Commit only the files relevant to the change; run `git status` before and after `git add`.
- When closing this branch, clean up generated docs (keep README) and delete any temporary artifacts as the AGENTS guide requires.
