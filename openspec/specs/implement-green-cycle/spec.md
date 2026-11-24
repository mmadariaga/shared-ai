# implement-green-cycle Specification

## Purpose
Defines how `/sai-3-implement` and `/sai-build` turn the plan tests that `/sai-2-design` left red into green tests, one GREEN step at a time, with RED kept only for review and audit findings.

## Requirements

### Requirement: Implement starts only from a plan with plan tests

The implement coordinator SHALL run the OpenSpec prerequisite check first, SHALL drop an explicit `--fast-track` token, and SHALL take the only active change with a `tasks.md` when no name is given (printing `Cannot start /sai-3-implement: name the change ({candidates, or none}).` otherwise). It SHALL start a change only when `openspec/changes/{name}/` has `proposal.md`, `tasks.md`, and at least one file under `specs/` or a `.openspec.yaml` that sets `skip_specs: true`, and otherwise SHALL print `Cannot start /sai-3-implement for {name}: missing {list of the absent items}.`. It SHALL then check the format of `tasks.md` with `file-manifest.js format {name} --json --cwd <project-root>`; when the tool answers `earlier` (the plan has `## Required Documentation`, `**What Will Be Done**`, `**Existing Tests Broken**`, or `**Files Affected**` on a step with tests), the coordinator SHALL print `Cannot start /sai-3-implement for {name}: its plan is in the earlier format. Run /sai-2-design {name} again.` and end the run before any worker or run directory exists, without escalating and without writing. A `tasks.md` whose steps carry neither `**Tests**` nor `**Closure criterion**` was planned with the interfaces format: the coordinator SHALL print `Cannot start /sai-3-implement for {name}: its plan has no plan tests. Run /sai-2-design {name} again.` and end the run without escalating and without writing. A missing `design.md` SHALL be a deviation, not a stop.

#### Scenario: A change planned with interfaces.md

- **WHEN** `/sai-3-implement` starts on a change whose `tasks.md` steps carry neither `**Tests**` nor `**Closure criterion**`
- **THEN** it prints the no-plan-tests message asking for `/sai-2-design` again and ends without writing

#### Scenario: Change lacks its task list

- **WHEN** the named change has no `tasks.md`
- **THEN** the coordinator prints the fixed precondition message naming `tasks.md` and ends the run without escalation and without writing

#### Scenario: A change planned in the earlier format

- **WHEN** `/sai-3-implement` starts on a change whose `tasks.md` still has `## Required Documentation`
- **THEN** it prints `Cannot start /sai-3-implement for {name}: its plan is in the earlier format. Run /sai-2-design {name} again.` and ends before creating any worker, without writing

### Requirement: Implement checks that the plan tests are still red

Before the first step, after the failure baseline, the coordinator SHALL run each unclosed step's `**Test Command**` through the executor and SHALL check that every plan test is still red by assertion and every `[regression guard]` passes. A test that now fails to compile, or already passes without being a guard, SHALL be the obstacle `plan-tests`, whose approach is the fix RED realigning the test to the spec, recorded as a deviation. The still-red plan tests SHALL be part of the failure baseline and SHALL be green at Close.

#### Scenario: The branch changed after the plan

- **WHEN** a plan test fails to compile at the start of the build
- **THEN** the coordinator treats it as the obstacle `plan-tests`, has the fix RED realign it, and records a deviation

### Requirement: Each step is a GREEN, review, and commit cycle over its plan tests

Each step SHALL be one GREEN, review, and commit cycle, normally one `## Step N` of `tasks.md`. Its brief SHALL carry the goal, the task ids, the step's scenarios, the step's tests and `**Test Command**` or its closure criterion, `**Files Affected**`, and `**What Changes**`, the `path :: signature` entries of `design.md` `## Target State` that the step's tests exercise or that its files touch, the spec files the step's scenarios belong to, and the production paths GREEN may write: for a step with tests, the paths of those `path :: signature` entries and any other production file the step's behavior needs; for a step without tests, its `**Files Affected**`. The brief SHALL never name a test path among the writable paths and SHALL carry no `## Required Documentation` entries. GREEN SHALL be closed when the step's tests pass, the tests of earlier steps stay green, and no test file and no stub signature the tests depend on changed since the step began; tests of later steps MAY stay red or turn green early. A step with a closure criterion SHALL be closed when the review confirms the criterion holds. The run SHALL end with every test of the change green.

#### Scenario: Earlier tests stay green

- **WHEN** GREEN finishes step 3
- **THEN** the coordinator runs the tests of steps 1 to 3, and closes the step only when all of them pass

#### Scenario: A later step's test turns green early

- **WHEN** GREEN's work for step 2 makes a test of step 4 pass
- **THEN** the step still closes, and step 4's test stays part of the final check

#### Scenario: GREEN modifies a test file

- **WHEN** the step's tests pass after GREEN but a test file or a stub signature the tests depend on changed since the step began
- **THEN** the coordinator restores it and counts the change as an attempt of the step

#### Scenario: The writable paths of a step with tests

- **WHEN** the coordinator writes the brief of a step with tests whose tests exercise a symbol of a `path :: signature` entry
- **THEN** the brief names that entry's path among the writable paths and names no test path

### Requirement: GREEN escalates a wrong test instead of changing it

When GREEN needs to change a test or a stub signature the tests depend on, it SHALL change neither and SHALL report `needs_input`. The coordinator SHALL decide from the spec and the code, SHALL have the fix RED correct a test it judges wrong and record the deviation, and SHALL ask the user only when neither the spec nor the code settles it.

#### Scenario: The spec settles a disputed test

- **WHEN** GREEN reports a plan test it cannot pass without changing it, and the spec shows the test is wrong
- **THEN** the coordinator has the fix RED correct the test, records a deviation, and continues without asking the user

### Requirement: The fix RED serves only findings and corrected plan tests

The fix RED (`sai-3-red-worker`) SHALL be created only when a review or audit finding needs a new test or a plan test must be corrected, so a run over the plan tests alone creates no fix RED. A finding that needs a new test SHALL go through the fix RED and then GREEN; a finding that needs no test SHALL go straight to GREEN. `red-steps@1` SHALL serve only the plan RED and the fix RED.

#### Scenario: A finding that needs a test

- **WHEN** a review finding describes behavior that no test pins
- **THEN** the fix RED writes a test that fails by assertion on the current code before GREEN fixes the finding

#### Scenario: A run with no findings

- **WHEN** a build runs over the plan tests and the review leaves no finding that needs a test
- **THEN** no fix RED worker is created
