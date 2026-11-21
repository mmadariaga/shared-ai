# design-plan-tests Specification

## Purpose
Defines how `/sai-2-design` turns the approved specs into a reduced `design.md` and `tasks.md` plus, in code, the interface stubs and failing tests of the whole change that the build later turns green.

## Requirements

### Requirement: The design segment writes the plan documents and then the plan tests

`/sai-2-design` SHALL run two phases in one run. First `sai-2-design-worker` SHALL write the reduced `design.md` and `tasks.md`; then, when at least one step of `tasks.md` lists `**Tests**`, the plan RED worker `sai-2-red-worker` SHALL write the interface stubs and the failing tests that `tasks.md` names. The design worker SHALL stay alive through the review, because a fix round on the tests may need a plan change. The segment SHALL be done only when `design.md` and `tasks.md` exist and pass the design worker's verification, every step of `tasks.md` carries its tests or its closure criterion, every named plan test exists and is red by assertion or marked as a regression guard, every mechanical check passes, the review rounds have run, and the segment's paths are committed locally or left on disk when the project ignores them.

#### Scenario: A change with testable steps gets plan tests

- **WHEN** `/sai-2-design` runs on a change whose `tasks.md` names tests in at least one step
- **THEN** the design worker writes `design.md` and `tasks.md` first, and the plan RED worker then writes the stubs and the named tests

#### Scenario: A change of closure criteria only gets no plan RED

- **WHEN** every step of the `tasks.md` the design worker wrote carries a `**Closure criterion**` (documentation or prompts only)
- **THEN** the coordinator creates no plan RED worker, writes no plan tests, says so in the closing report, and continues to the review

### Requirement: The coordinator accepts a plan test only when it is red by assertion

After each plan RED report, the design coordinator SHALL run the plan tests through the budget executor with each step's `**Test Command**` from the project root and SHALL check, for every test a `**Tests**` entry names, that the test exists at the named path under the named name and fails by assertion on the behavior under test. A pass SHALL be accepted only for an entry marked `[regression guard]`, or after the coordinator corrects `tasks.md` to mark it, a decision taken from the specs and the code and recorded as an assumption. A test that fails to compile, fails for an import, syntax, or fixture error, passes without being a guard, or is skipped, disabled, or marked expected-to-fail SHALL go back to the plan RED as a corrected instruction counted as an attempt of the obstacle `plan-tests`.

#### Scenario: A plan test fails for an import error

- **WHEN** a named plan test fails because an import does not resolve
- **THEN** the coordinator sends the plan RED a corrected instruction and counts it as an attempt of the obstacle `plan-tests`

#### Scenario: A plan test already passes

- **WHEN** a named plan test passes and its entry carries no `[regression guard]` mark
- **THEN** the coordinator does not accept it as written: it either returns it to the plan RED or, when the specs and the code show the behavior already holds, marks the entry as a regression guard in `tasks.md` and records the assumption

#### Scenario: A plan test is skipped

- **WHEN** the executor reports a named plan test as skipped or expected-to-fail
- **THEN** the coordinator rejects it, because the plan tests are committed failing

### Requirement: An unwritable plan test becomes a closure criterion

When the plan RED reports `needs_input` because a test named in `tasks.md` cannot be written as a meaningful assertion, and the specs and the code agree with it, the design coordinator SHALL answer `closure`, SHALL have `sai-2-design-worker` turn that step's `**Tests**` into a `**Closure criterion**` and fold the manifest again, and SHALL record the change as an assumption with its source in the closing report.

#### Scenario: A named test has no observable behavior

- **WHEN** the plan RED reports that a named test cannot pin observable behavior
- **THEN** the step carries a closure criterion instead of that test and the closing report lists the assumption

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

`design.md` SHALL hold, in order, `## Target State` (the finished shape, naming every new or changed public symbol with its exact signature, followed by the folded `### File Manifest`), `## Decisions` (each with `**Record family**` when the ADR/DDR criteria apply, and follow-ups as "out of scope: X — revisit when Y" bullets), and `## Risks / Trade-offs`. A transient `## Open Questions` section SHALL appear only while a question is open, and `## Learnings Corrections` SHALL be written only by the `/sai-3-implement` close. `design.md` SHALL carry no `## Context`, `## Goals / Non-Goals`, `## Migration Plan`, or `## Manual Verification` section.

#### Scenario: A finished design

- **WHEN** the design step finishes `design.md`
- **THEN** it holds Target State with its File Manifest, Decisions, and Risks / Trade-offs, and none of the retired sections

#### Scenario: A manual check is a risk

- **WHEN** the change needs a check that no automated test and no review covers
- **THEN** `design.md` records it as a risk whose mitigation names the manual check and its expected result

### Requirement: Each tasks.md step names its plan tests or its closure criterion

Every `## Step N` of a `tasks.md` written by `/sai-2-design` SHALL carry, in order, the progress checkbox, `**Routing**`, `**Files Affected**`, `**What Will Be Done**`, exactly one of `**Tests**` and `**Closure criterion**`, `**Existing Tests Broken**`, and `**Test Command**`. Each `**Tests**` entry SHALL read `- <repository-relative test path> :: <test name>`, with the title of the spec scenario it covers in the test name and ` [regression guard]` appended to an entry whose behavior already works. A `**Closure criterion**` SHALL be one checkable sentence. `**Test Command**` SHALL run only the step's tests, or read `None — closure criterion` when no command checks the criterion. `**Files Affected**` SHALL list tests and stubs too, with change-type tokens taken at the change base, before `/sai-2-design` writes any test or stub.

#### Scenario: A testable step

- **WHEN** a step changes behavior that a test can pin
- **THEN** it lists its tests under `**Tests**` and the command that runs only them under `**Test Command**`

#### Scenario: A documentation step

- **WHEN** a step changes only documentation or prompts
- **THEN** it carries a `**Closure criterion**` and no `**Tests**`
