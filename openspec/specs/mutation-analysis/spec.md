# mutation-analysis Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements
### Requirement: Mutation Analysis Pass Exists In The Review Workflow

The review step library SHALL include a Mutation Analysis pass, designated Pass 12, that runs after review passes 1–11 from `sai/commands/review/steps/resolve-mutation-analysis.md`. The pass MUST perform mutation testing scoped to the diff against the parent branch and emit surviving mutants as findings in `review.md`.

#### Scenario: Pass 12 documented after passes 1–11

- **WHEN** a reader inspects the review step library
- **THEN** a Mutation Analysis pass numbered 12 is present in `steps/resolve-mutation-analysis.md`, ordered after passes 1–11 in `steps/resolve-review-analysis.md`

### Requirement: Activation Gate

Pass 12 SHALL run only when BOTH conditions hold: the diff against the parent branch contains testable production code, AND the repository contains at least one test file. When either condition is false, the pass MUST be skipped silently (no finding, no Mutation Analysis section content beyond a skipped note).

#### Scenario: Diff has production code and repo has tests

- **WHEN** the diff against the parent branch contains testable production code
- **AND** the repository contains at least one test file
- **THEN** Pass 12 executes

#### Scenario: No test files in the repository

- **WHEN** the repository contains no test file
- **THEN** Pass 12 is skipped silently and emits no mutation findings

#### Scenario: Diff contains no testable production code

- **WHEN** the diff against the parent branch contains no testable production code (e.g. docs or config only)
- **THEN** Pass 12 is skipped silently and emits no mutation findings

### Requirement: Mutation Scope Limited To The Diff

The set of files eligible for mutation SHALL be exactly the production-code files changed in the diff against the parent branch. Pass 12 MUST NOT mutate files outside that diff.

#### Scenario: Only diff files are mutated

- **WHEN** Pass 12 selects mutation targets
- **THEN** every mutated file is a production-code file present in the diff against the parent branch
- **AND** no file outside that diff is mutated

### Requirement: Deterministic mutation engine execution

The review mutation-analysis pass MUST execute a declared deterministic mutation engine using the checked-in project configuration and SHALL restrict mutations to production-code files eligible in the review diff. The review worker MUST NOT select, apply, or infer mutations itself.

#### Scenario:

- **WHEN** a review includes testable production code and a declared mutation tool
- **THEN** Pass 12 runs the configured engine against only the eligible diff files and reports the engine's actual results.

### Requirement: Explicit unavailable mutation states

When no deterministic mutation tool is declared, the deterministic baseline fails, tool execution fails, or the deterministic report cannot be parsed, review SHALL report the applicable unavailable state, emit no mutation findings, and continue without model-generated evidence.

#### Scenario:

- **WHEN** a deterministic mutation prerequisite or execution result is unavailable
- **THEN** review reports the concrete unavailable state and continues without replacing it with inferred mutation evidence.

### Requirement: Native mutation outcome reporting

The review report SHALL classify every engine-native status onto the canonical statuses `Killed`, `Survived`, `Timeout`, `NoCoverage`, `CompileError`, `RuntimeError`, and `Ignored` by meaning, for any supported engine, and SHALL keep the native status beside it. `Killed` MUST remain internal; `Survived`, `Timeout`, and `NoCoverage` SHALL produce High mutation findings; `CompileError`, `RuntimeError`, and `Ignored` SHALL be recorded as engine impediments without inferred findings or severity. A native status whose meaning matches no canonical status makes the report unparseable. Canonical status counts MUST reconcile to the engine-reported mutation total.

#### Scenario: Stryker statuses map one to one

- **WHEN** the deterministic engine is Stryker and returns recognized mutation statuses
- **THEN** the report preserves those statuses and applies only the specified finding and severity mapping.

#### Scenario: A non-Stryker engine maps by meaning

- **WHEN** a declared engine such as PIT or cargo-mutants reports `SURVIVED`, `NO_COVERAGE`, `missed`, or `unviable`
- **THEN** each result is classified onto its canonical status by meaning, the native status is kept beside it, and the report is not treated as unparseable

### Requirement: Reproducible Stryker workflow

The project SHALL declare Stryker as a development dependency, SHALL provide a `test:mutation` script invoking `stryker run`, and SHALL package a checked-in configuration that runs `node --test`, defaults to `bin/install.js`, accepts an explicit mutation scope, writes JSON and clear-text reports, uses a 60-second timeout with serial execution, and cleans temporary output. The project SHALL also provide the focused `npm run test:mutation:smoke` workflow, which MUST execute the checked-in fixture configuration against an explicit mutation target and preserve engine-native statuses.

#### Scenario:

- **WHEN** `npm run test:mutation` is executed
- **THEN** Stryker uses the checked-in deterministic configuration and produces engine-owned mutation results for the configured scope.

#### Scenario: Focused mutation workflow executes real mutations

- **WHEN** `npm run test:mutation:smoke` is executed
- **THEN** the runner invokes Stryker against `test/fixtures/mutation-target.js`, produces at least one mutation including a `Killed` result, and accepts only recognized engine-native statuses.

### Requirement: Empty eligible mutation sets are reported explicitly

Pass 12 SHALL report `Mutation Analysis (Pass 12): skipped — no eligible mutation targets. No mutation findings.` when the activation gate passes but no diff-scoped production-code mutation target is eligible.

#### Scenario: No eligible target exists

- **WHEN** Pass 12 has testable production code and repository tests but its eligible mutation-target set is empty
- **THEN** the review records the exact no-eligible-target skip and continues without treating the empty set as positive mutation evidence.

### Requirement: Surviving Mutant Finding Row Format

When Pass 12 emits a finding for a surviving mutation, the finding row in `review.md` SHALL be identified `mMUT-N` (where N is a 1-based counter scoped to the surviving mutations in this review) and MUST contain the following fields in this order:

- **Location** — `path/to/file.ext:LINE` or `path/to/file.ext:LINE-LINE`
- **Mutation class** — one of `NegatedCondition`, `ChangedOperator`, `RemovedCall`, `ChangedReturn`, `NegatedBoolean`, `InvertedBranch`, `OffByOne`, or another concise label chosen by the agent
- **Original** — the unmutated code (or its essence) at the location
- **Applied** — the mutated code that was applied and reverted
- **Result** — a one-line statement that the mutation survived the test suite
- **Why it survives** — a one-sentence explanation referencing the missing test or untested branch
- **Suggested fix** — a concrete test the developer can add to catch this mutation

#### Scenario: Surviving mutant row contains all required fields

- **WHEN** Pass 12 emits an `mMUT-N` finding
- **THEN** the row contains Location, Mutation class, Original, Applied, Result, Why it survives, and Suggested fix in that order
