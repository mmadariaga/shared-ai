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

`sai/commands/design/red-worker.md` SHALL fetch `sai/commands/implement/worker-common.md` for the shared worker rules, SHALL take its step file through `red-steps@1` (the same `red-step.md` the fix RED follows, under its plan brief), and SHALL report under the `implement` command of `sai/tools/worker-report-validator.js`. One brief SHALL cover every step of `tasks.md` that carries tests, answered in one report whose `test_command` runs every plan test of the change.

#### Scenario: Report of a plan brief

- **WHEN** the plan RED finishes its brief
- **THEN** it saves one `implement` report whose `test_command` runs all plan tests of the change

### Requirement: The plan RED writes only tests, fixtures, and stubs

The plan RED SHALL write only the plan's test files and the fixtures and helpers they need, the interface stubs that the tests import (in their production files, returning a null, empty, or wrong value with no logic that could satisfy an assertion), and the existing tests a step's `**Existing Tests Broken**` names, updated to the behavior the change produces. It SHALL NOT write production logic, `design.md`, `tasks.md`, `proposal.md`, or `specs/`, and SHALL NOT skip, disable, or mark a test expected-to-fail. It SHALL write the tests from the specs and `design.md` `## Target State`, never from what it expects the code to do.

#### Scenario: A test needs production logic to compile

- **WHEN** a named test imports a symbol that does not exist yet
- **THEN** the plan RED writes a stub of that symbol with the signature of `## Target State` and no logic that satisfies the assertion

### Requirement: The plan RED reports an unwritable test as a question

When a test named in `tasks.md` cannot be written as a meaningful assertion, the plan RED SHALL write every other test of its brief and SHALL report `needs_input` naming the step, the test, and the reason, with the options `closure` and `rewrite`.

#### Scenario: A test cannot be pinned

- **WHEN** a named test's behavior is not observable
- **THEN** the plan RED writes the rest of its brief and reports `needs_input` with the options `closure` and `rewrite`

### Requirement: Telemetry attributes the plan RED to the design segment

`sai/tools/change-telemetry.js` SHALL attribute `sai-2-red-worker` to the `design` segment of `/sai-plan` and of the explore Plan route, by agent name, and SHALL keep `sai-3-red-worker` and `sai-3-green-worker` in the implement segment.

#### Scenario: Plan run telemetry

- **WHEN** the collector reads a `/sai-plan` execution in which `sai-2-red-worker` ran
- **THEN** that worker's row is counted in the design segment
