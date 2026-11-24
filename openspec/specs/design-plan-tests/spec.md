# design-plan-tests Specification

## Purpose
Defines how `/sai-2-design` turns the approved specs into a reduced `design.md` and `tasks.md` plus, in code, the interface stubs and failing tests of the whole change that the build later turns green.

## Requirements

### Requirement: The design segment writes the plan documents and then the plan tests

`/sai-2-design` SHALL run two phases in one run. First `sai-2-design-worker` SHALL write the reduced `design.md` and `tasks.md`, which record only what the code of the plan tests does not express; then, when at least one step of `tasks.md` lists `**Scenarios**`, the plan RED worker `sai-2-red-worker` SHALL write the interface stubs for the `path :: signature` entries of `design.md` and the failing tests for the scenarios `tasks.md` lists per step. The design worker SHALL stay alive through the review, because a fix round on the tests may need a plan change. The segment SHALL be done only when `design.md` and `tasks.md` exist and pass the design worker's verification, every step of `tasks.md` carries its scenarios with their tests or its closure criterion, every plan test exists, carries its scenario's title, and is red by assertion or marked as a regression guard, every mechanical check passes, the review rounds have run, and the segment's paths are committed locally or left on disk when the project ignores them.

#### Scenario: A change with testable steps gets plan tests

- **WHEN** `/sai-2-design` runs on a change whose `tasks.md` lists `**Scenarios**` in at least one step
- **THEN** the design worker writes `design.md` and `tasks.md` first, and the plan RED worker then writes the stubs and one test per listed scenario

#### Scenario: A change of closure criteria only gets no plan RED

- **WHEN** every step of the `tasks.md` the design worker wrote carries a `**Closure criterion**` (documentation or prompts only)
- **THEN** the coordinator creates no plan RED worker, writes no plan tests, runs no write-back, says so in the closing report, and continues to the review, and the File Manifest folds every step

### Requirement: The coordinator accepts a plan test only when it is red by assertion

After each plan RED report, the design coordinator SHALL run the plan tests through the budget executor with the `test_command` that the report's `plan_tests` gives for each step, from the project root, and SHALL check, for every test the report lists, that the test exists at the listed path under the listed name, that the name contains the literal title of a scenario the step lists, and that it fails by assertion on the behavior under test. A pass SHALL be accepted only for a test the report flags `regression_guard`, or when the coordinator decides from the specs and the code that it is a regression guard, records that as an assumption, and passes it to the write-back with `--guard`; only the write-back writes the `[regression guard]` mark. A test that fails to compile, fails for an import, syntax, or fixture error, passes without being flagged, or is skipped, disabled, or marked expected-to-fail SHALL go back to the plan RED as a corrected instruction counted as an attempt of the obstacle `plan-tests`.

#### Scenario: A plan test fails for an import error

- **WHEN** a reported plan test fails because an import does not resolve
- **THEN** the coordinator sends the plan RED a corrected instruction and counts it as an attempt of the obstacle `plan-tests`

#### Scenario: A plan test already passes

- **WHEN** a reported plan test passes and the report does not flag it `regression_guard`
- **THEN** the coordinator does not accept it as written: it either returns it to the plan RED or, when the specs and the code show the behavior already holds, records the assumption and passes the test to the write-back with `--guard`

#### Scenario: A plan test is skipped

- **WHEN** the executor reports a plan test as skipped or expected-to-fail
- **THEN** the coordinator rejects it, because the plan tests are committed failing

### Requirement: An unwritable plan test becomes a closure criterion

When the plan RED reports `needs_input` because a test for a scenario that `tasks.md` lists cannot be written as a meaningful assertion, and the specs and the code agree with it, the design coordinator SHALL answer `closure` and SHALL have `sai-2-design-worker` turn that step into a step without tests: its `**Scenarios**`, `**Tests**`, and `**Test Command**` are replaced with `**Files Affected**` (the paths its GREEN work will write, each with its `A`/`M`/`D`/`R` token), `**What Changes**`, and a `**Closure criterion**`, keeping its title, checkbox, and `**Routing**` line, and the manifest is folded again. The coordinator SHALL record the change as an assumption with its source in the closing report.

#### Scenario: A named test has no observable behavior

- **WHEN** the plan RED reports that the test for a listed scenario cannot pin observable behavior
- **THEN** the step becomes a step without tests with `**Files Affected**`, `**What Changes**`, and a closure criterion, the File Manifest is folded again, and the closing report lists the assumption

### Requirement: The design segment commits documents and plan code separately

The design segment SHALL make two local commits, in this order, each restricted to its paths and each path checked with `git check-ignore` before staging: first the plan documents (`design.md`, `tasks.md`, `.openspec.yaml`, and the `proposal.md` and `specs/` files the design worker amended), then the plan code (every path the plan RED reports in `changed_files`: tests, fixtures, helpers, and stubs). A segment without plan tests SHALL make the first commit only. The plan tests SHALL be committed failing, never skipped, so the continuous integration of the plan branch stays red until the build.

#### Scenario: First draft with plan tests

- **WHEN** a first-draft design segment completes with plan tests
- **THEN** it commits the plan documents first and the tests and stubs second, and pushes nothing

### Requirement: A rerun updates the plan in place

Running `/sai-2-design` again on a change that already has `design.md` SHALL update the plan tests, the stubs, `design.md`, and `tasks.md` in place, in new local commits. Within `/sai-plan`, a recorded `yes` publication answer SHALL update the existing draft pull request; a standalone `/sai-2-design` rerun SHALL publish nothing.

#### Scenario: Rerun on a planned change

- **WHEN** `/sai-2-design` runs on a change that already has plan tests
- **THEN** it updates the tests, the stubs, `design.md`, and `tasks.md` in place and commits them as new commits

### Requirement: The design command rejects unknown options

`/sai-2-design` SHALL accept and ignore `--fast-track` and `--supervised`. Any other token that starts with `--`, `--overview-lang` included, SHALL print `Cannot start /sai-2-design: unknown option {token}.` and end the run before anything is written.

#### Scenario: The retired overview option is passed

- **WHEN** `/sai-2-design` is invoked with `--overview-lang Spanish`
- **THEN** it prints `Cannot start /sai-2-design: unknown option --overview-lang.` and writes nothing

### Requirement: design.md is reduced to the sections that have a consumer

`design.md` SHALL hold, in order, `## Target State` (one `- <path> :: <signature>` bullet per new or changed public symbol, with no function body, or the resulting document structure for a prose change, followed by the folded `### File Manifest`), `## Decisions` (each with `**Record family**` when the ADR/DDR criteria apply, and follow-ups as "out of scope: X — revisit when Y" bullets), and `## Risks / Trade-offs`. A transient `## Open Questions` section SHALL appear only while a question is open, and `## Learnings Corrections` SHALL be written only by the `/sai-3-implement` close. `design.md` SHALL carry no `## Context`, `## Goals / Non-Goals`, `## Migration Plan`, or `## Manual Verification` section, and no restatement of what a test or a stub says.

#### Scenario: A finished design

- **WHEN** the design step finishes `design.md`
- **THEN** it holds Target State with its `path :: signature` entries and its File Manifest, Decisions, and Risks / Trade-offs, with no function body and none of the retired sections

#### Scenario: A manual check is a risk

- **WHEN** the change needs a check that no automated test and no review covers
- **THEN** `design.md` records it as a risk whose mitigation names the manual check and its expected result

### Requirement: Each tasks.md step names its plan tests or its closure criterion

Every `## Step N` of a `tasks.md` written by `/sai-2-design` SHALL be a step with tests or a step without tests. A step with tests SHALL carry, in order, the progress checkbox, `**Routing**`, and `**Scenarios**` (one bullet per spec scenario title it covers, plus one short title per edge behavior it must prove), and, after the write-back, `**Tests**` (each entry `- <repository-relative test path> :: <test name>`, with ` [regression guard]` appended to a test whose behavior already works) and `**Test Command**` (the command that runs only the step's tests). A step without tests SHALL carry, in order, the progress checkbox, `**Routing**`, `**Files Affected**` (with change-type tokens), `**What Changes**`, and `**Closure criterion**` (one checkable sentence), and no test field. No step SHALL carry `**What Will Be Done**` or `**Existing Tests Broken**`, and `tasks.md` SHALL carry no `## Required Documentation` section.

#### Scenario: A testable step

- **WHEN** a step changes behavior that a test can pin
- **THEN** the design worker lists its scenarios under `**Scenarios**`, and after the plan RED the write-back adds its tests under `**Tests**` and the command that runs only them under `**Test Command**`

#### Scenario: A documentation step

- **WHEN** a step changes only documentation or prompts
- **THEN** it carries `**Files Affected**`, `**What Changes**`, and a `**Closure criterion**`, and no `**Scenarios**` or `**Tests**`

### Requirement: The coordinator accepts modified existing tests only within the bound

After each plan RED report, the design coordinator SHALL read its `modified_tests` and SHALL accept each entry only when its reason names a signature that `design.md` changes or removes, or a scenario that the specs MODIFY or REMOVE, and the named symbol or scenario is there. An existing test modified outside that bound, or a modified existing test that `git status --porcelain` shows and the report does not list, SHALL go back to the plan RED as a corrected instruction (restore it, or report it in `notes` instead), counted as an attempt of the obstacle `plan-tests`. The closing report SHALL list the existing tests the plan RED modified with their reasons.

#### Scenario: A modified test outside the bound

- **WHEN** the plan RED reports a modified existing test whose reason names no changed signature and no modified or removed scenario
- **THEN** the coordinator returns it to the plan RED as a corrected instruction and counts an attempt of the obstacle `plan-tests`

#### Scenario: An unreported modified test

- **WHEN** `git status --porcelain` shows a modified existing test that the report's `modified_tests` does not list
- **THEN** the coordinator returns it to the plan RED as a corrected instruction

### Requirement: The design segment checks scenario coverage after the plan RED

After the plan tests are accepted, the design coordinator SHALL run `scenario-coverage.js change {name} --cwd <project-root>` through the budget executor. `clean` and `n/a` (a change with `skip_specs: true`) SHALL pass. `missing` and `ambiguous` SHALL go back to the plan RED as a corrected instruction that names each scenario title, counted as an attempt of the obstacle `plan-tests`. A tool error SHALL be an obstacle of its own (`scenario-coverage`), never a finding. The check SHALL run again before each review round and before the segment closes.

#### Scenario: A scenario without a test

- **WHEN** the coverage check answers `missing` for a scenario the change adds
- **THEN** the coordinator sends the plan RED a corrected instruction naming that scenario title and counts an attempt of the obstacle `plan-tests`

#### Scenario: A change without specs

- **WHEN** the change's `.openspec.yaml` sets `skip_specs: true` and the coverage check answers `n/a`
- **THEN** the check passes and no scenario title is required

### Requirement: A deterministic write-back records the plan test facts in tasks.md

When the plan tests, the modified tests, and the scenario coverage are accepted, the design coordinator SHALL run `file-manifest.js writeback {name} --input-file <accepted report file> --json --cwd <project-root>`, with one `--guard "<test path> :: <test name>"` for each test it decided to accept as a guard, so `**Tests**`, `**Test Command**`, and the `[regression guard]` marks of every step that lists `**Scenarios**` are written from the plan RED's report. It SHALL run the write-back again, with the last accepted report and the same `--guard` list, after every later plan RED report and after any design fix that changes a step. A non-zero exit SHALL be an obstacle of `plan-tests`: a step the report omits or names wrongly goes back to the plan RED, and a `tasks.md` the tool calls earlier-format goes to the design worker as a rewrite. The coordinator SHALL never write those fields or marks by hand. The design mechanical checks SHALL also run `file-manifest.js format {name} --json --cwd <project-root>`, which must answer `current`.

#### Scenario: Write-back after acceptance

- **WHEN** the coordinator accepts the plan tests, the modified tests, and the scenario coverage
- **THEN** it runs the write-back with the accepted report, and each step with tests gains `**Tests**` and `**Test Command**` in `tasks.md`

#### Scenario: Write-back after a fix round

- **WHEN** a review fix round changes a plan test and the plan RED sends a new report
- **THEN** the coordinator runs the write-back again with that last accepted report and the same `--guard` list

#### Scenario: The format check fails

- **WHEN** `file-manifest.js format` answers `earlier` during the mechanical checks
- **THEN** the failing check is the obstacle `checks` and the segment does not close

### Requirement: A rerun rewrites a plan in the earlier format

Running `/sai-2-design` again on a change whose `tasks.md` has `**What Will Be Done**`, `## Required Documentation`, `**Existing Tests Broken**`, or `**Files Affected**` on a step with tests SHALL rewrite `design.md` and `tasks.md` in the current format and SHALL leave no earlier section or field behind. When the change already has plan tests, a rerun SHALL keep a step's number, title, and scenarios when the feedback leaves its behavior alone, and SHALL name in `notes` the steps that changed their scenarios.

#### Scenario: Rerun on an earlier-format plan

- **WHEN** `/sai-2-design` runs on a change whose `tasks.md` ends with `## Required Documentation`
- **THEN** the rewritten `tasks.md` has no `## Required Documentation`, `**What Will Be Done**`, or `**Existing Tests Broken**`, and its steps follow the two current step kinds
