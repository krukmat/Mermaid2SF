## CI/CD Guide

This project uses GitHub Actions + Husky to ensure quality at every commit. Key elements:

### GitHub Actions Workflow (`.github/workflows/ci.yml`)
- Runs on `push` to `main`/`develop` and on every PR against those branches.
- Jobs:
  1. **Lint & Format Check** (Ubuntu, Node 18): `npm run lint` and `npm run format:check`.
  2. **Test Matrix** (Node 16, 18, 20): `npm ci`, `npm test`, `npm run test:coverage`, `npx codecov` (only on Node 18 to avoid duplicates).
  3. **Build** (Node 18): `npm ci`, `npm run build`.
  4. **Compile Examples** (Node 18): `npm ci`, `npm run build`, `npm run compile-examples`. Uploads `.ci-output` as artifact.
  5. **Validate Examples** (Node 18): `npm ci`, `npm run build`, `npm run validate-examples`.
- Artifacts: compiled flows/dsl/docs stored under `.ci-output` for download.
- Cache: node modules cached by `actions/cache` keyed per Node version + `package-lock`.

### Husky + lint-staged
- Husky hooks live in `.husky/pre-commit` (`npx lint-staged && npm run lint`) and `.husky/pre-push` (`npm test`).
- `lint-staged` applies `prettier --write` and `eslint` to staged `*.ts`, `*.js`, `*.json`, and `*.md` files.
- `npm run format:check` ensures formatting matches the committed output.

### Scripts
- `npm run ci` runs lint, format check, tests, and build.
- `npm run compile-examples` builds all sample `.mmd` files (strict mode) and writes artifacts to `.ci-output`.
- `npm run validate-examples` runs the CLI lint over `examples/v1`.
- `npm run coverage-upload` publishes coverage to Codecov (Node 18 in CI job).

### Troubleshooting
- If the workflow fails on `npm ci`, check for cached artifacts in `.github/workflows`.
- Coverage upload requires public repo (no CODECOV_TOKEN) or configure one via secrets.
- Use `npm run lint` or `npm run format` locally before pushing to avoid Husky rejections.
