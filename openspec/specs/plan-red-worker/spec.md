# plan-red-worker Specification

## Purpose
Defines `sai-2-red-worker`, the dedicated plan RED agent that writes, once for the whole change inside `/sai-2-design`, the interface stubs and the failing tests that the build later turns green.

## Requirements

### Requirement: The plan RED is its own managed worker

`sai-2-red-worker` SHALL be a `worker-matrix` entry of phase `design-red` with its own per-harness model, binding stem `design-red`, and the pinned contract `sai/commands/design/red-worker.md`, accepted by `bin/worker-matrix.js` as a pinned role beside the RED and GREEN roles of `/sai-3-implement`. The installer SHALL materialize its agent file and its routed binding for Claude Code and opencode, and the model customization menu SHALL list it under `/sai-2-design` with `sai-2-design-worker`. It SHALL NOT reuse `sai-3-red-worker`.

#### Scenario: Installed roster

- **WHEN** the installer projects the worker matrix for Claude Code or opencode
- **THEN** it materializes `sai-2-red-worker` as the fourteenth managed worker, with its own model and its `design-red-worker.md` binding

### Requirement: The plan RED card delegates the shared worker rules

`sai/commands/design/red-worker.md` SHALL fetch `sai/commands/implement/worker-common.md` for the shared worker rules, SHALL take its step file through `red-steps@1` (the same `red-step.md` the fix RED follows, under its plan brief), and SHALL report under the `implement` command of `sai/tools/worker-report-validator.js`. One brief SHALL cover every step of `tasks.md` that lists `**Scenarios**`, answered in one report whose `test_command` runs every plan test of the change. A `completed` report of the plan RED SHALL also carry `plan_tests`, a list with one entry per step with tests holding `step`, the `test_command` that runs only that step's tests, and `tests` (each with `path`, `name`, and the boolean `regression_guard`), and MAY carry `modified_tests`, a list of `{path, reason}` entries for the existing tests it modified. The validator SHALL accept `plan_tests` and `modified_tests` only on a `completed` `implement` report and SHALL reject a `plan_tests` entry with an unknown key, a step that is not a positive integer, an empty `test_command`, an empty `tests` list, or a test without a non-empty `path` and `name`. The report SHALL be the only record of the plan test facts: a deterministic tool writes them into `tasks.md` from it.

#### Scenario: Report of a plan brief

- **WHEN** the plan RED finishes its brief
- **THEN** it saves one `implement` report whose `test_command` runs all plan tests of the change and whose `plan_tests` lists every step that lists `**Scenarios**`

#### Scenario: A plan_tests entry without tests is rejected

- **WHEN** a plan RED report carries a `plan_tests` entry whose `tests` list is empty
- **THEN** `worker-report-validator.js` rejects the report

### Requirement: The plan RED writes only tests, fixtures, and stubs

The plan RED SHALL write only new test files for the plan and the fixtures and helpers they need, the interface stubs that the tests import, only at the paths of the `path :: signature` entries of `design.md` `## Target State` (in their production files, with the declared signature, returning a null, empty, or wrong value with no logic that could satisfy an assertion), and existing tests inside this bound: an existing test MAY be modified only when it uses a symbol whose signature `design.md` changes or removes, or when it asserts a scenario that the change's specs MODIFY or REMOVE. It SHALL report each modified existing test in `modified_tests` with its path and a reason that names the signature or the scenario. An existing test outside the bound SHALL stay untouched, and a test that breaks for another reason SHALL be named in `notes`, never edited. The plan RED SHALL NOT write production logic, `design.md`, `tasks.md`, `proposal.md`, or `specs/`, and SHALL NOT skip, disable, or mark a test expected-to-fail. It SHALL write the tests from the specs and `design.md` `## Target State`, never from what it expects the code to do.

#### Scenario: A test needs production logic to compile

- **WHEN** a plan test imports a symbol that does not exist yet
- **THEN** the plan RED writes a stub of that symbol at the path of its `path :: signature` entry, with that signature and no logic that satisfies the assertion

#### Scenario: An existing test breaks outside the bound

- **WHEN** an existing test fails because of a behavior that no changed signature and no modified or removed scenario names
- **THEN** the plan RED leaves the test untouched and names it in `notes`

### Requirement: The plan RED reports an unwritable test as a question

When a test for a scenario that `tasks.md` lists cannot be written as a meaningful assertion, the plan RED SHALL write every other test of its brief and SHALL report `needs_input` naming the step, the scenario, and the reason, with the options `closure` (the step becomes a step without tests, closed by a criterion) and `rewrite` (the plan names another scenario).

#### Scenario: A test cannot be pinned

- **WHEN** the behavior of a scenario a step lists is not observable
- **THEN** the plan RED writes the rest of its brief and reports `needs_input` naming the step and the scenario, with the options `closure` and `rewrite`

### Requirement: Telemetry attributes the plan RED to the design segment

`sai/tools/change-telemetry.js` SHALL attribute `sai-2-red-worker` to the `design` segment of `/sai-plan` and of the explore Plan route, by agent name, and SHALL keep `sai-3-red-worker` and `sai-3-green-worker` in the implement segment.

#### Scenario: Plan run telemetry

- **WHEN** the collector reads a `/sai-plan` execution in which `sai-2-red-worker` ran
- **THEN** that worker's row is counted in the design segment

### Requirement: The plan RED names each test with its scenario title

For every step of `tasks.md` that lists `**Scenarios**`, the plan RED SHALL write one test per scenario whose name contains the scenario's literal title as words separated by spaces (in a description string, display name, or docstring where the language's identifiers cannot carry it), so the scenario coverage check of the design coordinator matches it. A test for an edge behavior of the step SHALL be named by that behavior's title. A test of behavior that already works and must keep passing SHALL be written to pass now and flagged `regression_guard: true` in the report.

#### Scenario: A scenario title in a test name

- **WHEN** a step lists the scenario `Archived tasks are exempt`
- **THEN** the plan RED writes a test whose name contains `Archived tasks are exempt` as words separated by spaces

#### Scenario: A behavior that already holds

- **WHEN** a scenario of a step describes behavior the current code already satisfies
- **THEN** the plan RED writes a passing test for it and flags it `regression_guard: true` in `plan_tests`
