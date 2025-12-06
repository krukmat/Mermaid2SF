# PLANNING: TASK 2.8 - CI/CD Integration

## Task Overview

**Task ID**: 2.8
**Task Name**: CI/CD Integration
**Status**: Pending
**Priority**: High
**Estimated Effort**: 2-3 days
**Dependencies**: All Phase 2 tasks completed (2.0-2.7)

## Goals

Establish robust CI/CD pipelines to ensure code quality, automated testing, and deployment readiness for the mermaid-flow-compiler project. This task will implement continuous integration workflows that run on every commit and pull request, ensuring that all code changes are validated before merging.

## Objectives

1. Set up GitHub Actions workflow for automated testing and validation
2. Configure pre-commit hooks for local quality checks
3. Add CI status badges to README.md for visibility
4. (Optional) Configure GitLab CI for teams using GitLab
5. Ensure CI pipeline runs efficiently (< 3 minutes total)

## Detailed Subtasks

### 2.8.1: Configure GitHub Actions ✅ PRIORITY

**Goal**: Create a comprehensive CI workflow that runs on every push and pull request.

**Files to Create/Modify**:
- `.github/workflows/ci.yml` (new)

**Implementation Details**:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    name: Lint & Format Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run format -- --check

  test:
    name: Test Suite
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16, 18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v4
        if: matrix.node-version == 18

  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run type-check

  compile-examples:
    name: Compile Example Flows
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - name: Compile all examples
        run: |
          for mmd in examples/**/*.mmd; do
            echo "Compiling $mmd..."
            node dist/cli/index.js compile \
              --input "$mmd" \
              --out-flow .ci-output/flows \
              --out-json .ci-output/dsl \
              --out-docs .ci-output/docs \
              --strict
          done
      - name: Validate generated XMLs
        run: |
          # Check all XMLs are well-formed
          for xml in .ci-output/flows/*.flow-meta.xml; do
            xmllint --noout "$xml" || exit 1
          done
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: compiled-flows
          path: .ci-output/
          retention-days: 7

  validate-examples:
    name: Validate Example Flows
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - name: Lint all examples
        run: |
          node dist/cli/index.js lint --input examples/ --strict
```

**Acceptance Criteria**:
- [ ] Workflow file created and valid YAML
- [ ] Runs on push to main/develop and all PRs
- [ ] Tests run on Node 16, 18, and 20
- [ ] Lint, test, build, and compile jobs all pass
- [ ] Code coverage uploaded to Codecov (optional but recommended)
- [ ] Artifacts (compiled flows) uploaded for inspection
- [ ] Total workflow time < 5 minutes

**Testing**:
- Create a test PR and verify workflow runs
- Introduce intentional lint error and verify failure
- Introduce test failure and verify pipeline fails
- Verify artifacts are downloadable

---

### 2.8.2: Configure Pre-commit Hooks ✅ PRIORITY

**Goal**: Ensure code quality checks run locally before commits are pushed.

**Files to Create/Modify**:
- `.husky/pre-commit` (new)
- `.husky/pre-push` (new)
- `package.json` (add scripts and husky config)

**Implementation Details**:

1. **Install Husky and lint-staged**:
```bash
npm install -D husky lint-staged
```

2. **Initialize Husky**:
```bash
npx husky init
```

3. **Configure lint-staged** in `package.json`:
```json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

4. **Add npm scripts**:
```json
{
  "scripts": {
    "prepare": "husky install",
    "pre-commit": "lint-staged",
    "pre-push": "npm test"
  }
}
```

5. **Create `.husky/pre-commit`**:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run pre-commit
```

6. **Create `.husky/pre-push`**:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run pre-push
```

**Acceptance Criteria**:
- [ ] Husky installed and configured
- [ ] lint-staged configured for TypeScript and config files
- [ ] Pre-commit hook runs lint and format on staged files
- [ ] Pre-push hook runs full test suite
- [ ] Hooks can be bypassed with `--no-verify` if needed
- [ ] Documentation added to README.md

**Testing**:
- Make a code change with lint error, attempt commit (should fail)
- Fix lint error, commit again (should succeed)
- Make a change that breaks tests, attempt push (should fail)

---

### 2.8.3: Add CI Status Badges to README ✅ PRIORITY

**Goal**: Display CI pipeline status and code quality metrics in README.md.

**Files to Modify**:
- `README.md`

**Implementation Details**:

Add badges section at the top of README.md:

```markdown
# Mermaid-to-Salesforce Flow Compiler

[![CI](https://github.com/YOUR_USERNAME/mermaid-flow-compiler/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/mermaid-flow-compiler/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/mermaid-flow-compiler/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/mermaid-flow-compiler)
[![npm version](https://badge.fury.io/js/mermaid-flow-compiler.svg)](https://www.npmjs.com/package/mermaid-flow-compiler)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

CLI tool to compile Mermaid flowcharts into Salesforce Flow metadata.
```

**Acceptance Criteria**:
- [ ] CI status badge added and working
- [ ] Code coverage badge added (if using Codecov)
- [ ] Version badge added (if published to npm)
- [ ] License badge added
- [ ] Badges link to correct resources
- [ ] Badges display correctly on GitHub

**Testing**:
- View README on GitHub and verify badges render
- Click each badge and verify links work
- Trigger CI run and verify badge updates

---

### 2.8.4: Configure GitLab CI (Optional) ⬜ OPTIONAL

**Goal**: Provide GitLab CI configuration for teams using GitLab instead of GitHub.

**Files to Create**:
- `.gitlab-ci.yml` (new)

**Implementation Details**:

```yaml
image: node:18

stages:
  - lint
  - test
  - build
  - compile

cache:
  paths:
    - node_modules/

before_script:
  - npm ci

lint:
  stage: lint
  script:
    - npm run lint
    - npm run format -- --check

test:
  stage: test
  script:
    - npm test -- --coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

build:
  stage: build
  script:
    - npm run build
    - npm run type-check
  artifacts:
    paths:
      - dist/
    expire_in: 1 day

compile-examples:
  stage: compile
  dependencies:
    - build
  script:
    - |
      for mmd in examples/**/*.mmd; do
        echo "Compiling $mmd..."
        node dist/cli/index.js compile \
          --input "$mmd" \
          --out-flow .ci-output/flows \
          --out-json .ci-output/dsl \
          --out-docs .ci-output/docs \
          --strict
      done
  artifacts:
    paths:
      - .ci-output/
    expire_in: 7 days
```

**Acceptance Criteria**:
- [ ] GitLab CI config file created
- [ ] Stages defined: lint, test, build, compile
- [ ] Code coverage reporting configured
- [ ] Artifacts configured for build and compile stages
- [ ] Cache configured for node_modules
- [ ] Documentation added to README.md

**Testing**:
- Push to GitLab and verify pipeline runs
- Check coverage report in GitLab UI
- Download and inspect artifacts

---

### 2.8.5: CI Pipeline Testing and Optimization ✅ PRIORITY

**Goal**: Ensure CI pipeline is reliable, fast, and provides clear feedback.

**Files to Modify**:
- `.github/workflows/ci.yml`
- `package.json` (optimize scripts if needed)

**Implementation Details**:

1. **Performance Optimization**:
   - Use `npm ci` instead of `npm install` (faster, deterministic)
   - Cache node_modules between runs
   - Run jobs in parallel where possible
   - Use matrix strategy for multi-version testing

2. **Failure Reporting**:
   - Add clear job names
   - Use step summaries for errors
   - Annotate code with lint/test failures
   - Send notifications on failure (optional)

3. **Branch Protection Rules** (GitHub settings):
   - Require CI checks to pass before merge
   - Require code review
   - Require branches to be up to date before merge

4. **Test Reliability**:
   - Ensure tests are deterministic
   - No flaky tests
   - Clear error messages
   - Timeout protection (max 10 minutes per job)

**Acceptance Criteria**:
- [ ] CI completes in < 5 minutes for typical PR
- [ ] Jobs run in parallel efficiently
- [ ] Clear failure messages when tests fail
- [ ] Branch protection rules configured (if using GitHub)
- [ ] No flaky tests in CI
- [ ] Documentation updated with CI info

**Testing**:
- Measure CI duration for multiple PRs
- Introduce various failures and verify clear feedback
- Test with large example files
- Verify branch protection works

---

## Architecture Alignment

This task aligns with the architecture specification:

1. **Deterministic Behavior** (Section 5.1):
   - CI ensures reproducible builds
   - Same code always produces same results
   - Critical for Git-based workflows

2. **Development & CI Workflow** (Section 8.2):
   - Implements automated compilation in CI
   - Validates flows before deployment
   - Integrates with SFDX/Hardis pipelines

3. **Validation & Test Strategy** (Section 9):
   - Automates unit, integration, and example tests
   - Ensures quality gates before merge
   - Validates against golden files

## Testing Requirements

### Pre-Implementation Tests
- [ ] All existing tests pass (102/102)
- [ ] No TypeScript errors
- [ ] No linting errors

### Post-Implementation Tests
- [ ] GitHub Actions workflow runs successfully
- [ ] Pre-commit hooks work locally
- [ ] Pre-push hooks prevent bad pushes
- [ ] Badges display correctly
- [ ] CI completes in < 5 minutes
- [ ] All 102 tests still pass in CI
- [ ] Examples compile successfully in CI

### Integration Tests
- [ ] Create test PR and verify full workflow
- [ ] Intentionally break tests and verify CI fails
- [ ] Intentionally introduce lint error and verify failure
- [ ] Verify artifacts are generated and downloadable

## Dependencies on Other Modules

- **All Phase 2 tasks** (2.0-2.7): Must be complete for stable CI
- **Testing Framework** (Task 1.0.3): Jest must be configured
- **Linting/Formatting** (Task 1.0.2): ESLint and Prettier must work
- **CLI Commands** (Tasks 1.7, 2.5, 3.1): `compile`, `lint`, `explain` must be functional

## Expected Files Created/Modified

### New Files
```
.github/
  workflows/
    ci.yml              # Main GitHub Actions workflow (100-150 lines)

.gitlab-ci.yml          # GitLab CI config (optional, 80-100 lines)

.husky/
  pre-commit            # Pre-commit hook (5 lines)
  pre-push              # Pre-push hook (5 lines)

docs/
  CI_CD_GUIDE.md        # Documentation (optional, 200-300 lines)
```

### Modified Files
```
package.json            # Add husky, lint-staged, scripts
README.md               # Add badges and CI documentation
.gitignore              # Add .husky, .ci-output
```

## Reference to Architecture Spec

- **Section 8.2**: CI/CD Integration - Hardis/SFDX workflows
- **Section 9**: Validation & Test Strategy - Automated testing levels
- **Section 10**: Roadmap Phase 2 - CI pipeline integration

## Success Criteria

### Functional Requirements
- [ ] CI workflow runs on every push and PR
- [ ] All quality checks (lint, test, build, compile) pass
- [ ] Pre-commit hooks prevent bad commits
- [ ] Pre-push hooks prevent broken pushes
- [ ] CI provides clear feedback on failures

### Quality Requirements
- [ ] CI completes in < 5 minutes
- [ ] No flaky tests
- [ ] Clear error messages
- [ ] Code coverage maintained (80%+)
- [ ] Zero TypeScript errors

### Documentation Requirements
- [ ] CI badges in README
- [ ] CI workflow documented
- [ ] Pre-commit hooks documented
- [ ] Troubleshooting guide for CI failures
- [ ] Examples of CI integration

## Risk Assessment

### Low Risk
- GitHub Actions is well-documented and stable
- Husky is battle-tested for pre-commit hooks
- No external dependencies or API calls

### Medium Risk
- CI might be slow initially (needs optimization)
- Pre-commit hooks might be too strict (can bypass with --no-verify)
- Team might not be familiar with workflow

### Mitigation Strategies
- Start with basic workflow, optimize iteratively
- Document how to bypass hooks when needed
- Provide clear error messages and troubleshooting guide
- Test thoroughly before requiring CI for merges

## Estimated Breakdown

| Subtask | Estimated Time | Priority |
|---------|----------------|----------|
| 2.8.1: GitHub Actions | 4-6 hours | HIGH |
| 2.8.2: Pre-commit Hooks | 2-3 hours | HIGH |
| 2.8.3: CI Badges | 1 hour | HIGH |
| 2.8.4: GitLab CI | 3-4 hours | OPTIONAL |
| 2.8.5: Testing & Optimization | 2-3 hours | HIGH |
| **TOTAL** | **12-17 hours** | |

## Notes

### Best Practices
- Use `npm ci` instead of `npm install` in CI
- Cache node_modules to speed up builds
- Run independent jobs in parallel
- Use matrix strategy for multi-version testing
- Keep workflow files DRY (Don't Repeat Yourself)
- Add timeouts to prevent hanging jobs
- Use artifacts for compiled outputs

### Common Pitfalls to Avoid
- Don't run full test suite on pre-commit (too slow)
- Don't make hooks too strict (frustrates developers)
- Don't forget to update .gitignore
- Don't hardcode secrets in workflow files
- Don't run unnecessary steps in every job

### Optional Enhancements
- Codecov integration for coverage reporting
- Dependabot for automated dependency updates
- Release workflow for npm publishing
- Performance benchmarking in CI
- Visual regression testing (if web UI exists)

## Next Steps After Completion

1. Monitor CI for first few weeks
2. Optimize based on real-world usage
3. Add more sophisticated checks if needed
4. Consider adding:
   - Release automation (TASK 4.x)
   - Deployment to scratch org (TASK 2.7.6)
   - Performance benchmarking
   - Security scanning

## Related Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)
- Project: `mermaid-flow-compiler-architecture.md` Section 8.2
- Project: `PROJECT_PLAN.md` Lines 867-900

---

**Document Status**: Ready for Implementation
**Created**: 2025-12-06
**Last Updated**: 2025-12-06
**Approved By**: Project Reviewer Agent
