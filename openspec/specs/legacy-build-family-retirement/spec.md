# legacy-build-family-retirement Specification

## Purpose
Keep one build pipeline: the legacy build, implement-planning, apply, and review commands are retired and the former experimental family answers to the stable command names.

## Requirements

### Requirement: The legacy build family is not installed

The repository SHALL NOT ship `/sai-4-apply`, `/sai-5-review`, `/sai-review`, `/sai-build-new`, `/sai-3-implement-new`, or `/sai-4-review-new` wrappers under `commands/claude/` or `commands/opencode/`, nor their `docs/commands/` pages. It SHALL NOT ship the `sai/commands/apply/`, `sai/commands/meta-build/`, `sai/commands/implement-new/`, `sai/commands/review-new/`, or `sai/commands/meta-review/` directories, the `apply-standalone`, `implement-standalone`, or `review-new-steps` machines, `sai/tools/apply-step.js`, or the `sai-3-implementation-worker`, `sai-4-red-worker`, `sai-4-green-worker`, `sai-5-review-worker`, and `sai-review-fix-worker` agents.

#### Scenario: Retired command files are absent

- **WHEN** the repository tree is inspected after the change
- **THEN** none of the retired wrappers, docs pages, command directories, machines, tool, or agents listed above exists

### Requirement: The new family answers to the stable names

`/sai-3-implement` SHALL run the implement contract formerly named `/sai-3-implement-new` from `sai/commands/implement/coordinator.md`, `/sai-4-review` SHALL run the review contract formerly named `/sai-4-review-new` from `sai/commands/review/coordinator.md`, and `/sai-build` SHALL run the composition formerly named `/sai-build-new` from `sai/commands/build/coordinator.md`. The promoted review directory SHALL keep `review-report.template.md` and `options.md`.

#### Scenario: Stable name runs the promoted contract

- **WHEN** a user invokes `/sai-3-implement`, `/sai-4-review`, or `/sai-build`
- **THEN** the wrapper loads the promoted coordinator under `sai/commands/implement/`, `sai/commands/review/`, or `sai/commands/build/`

### Requirement: Worker, machine, and session identifiers carry no -new suffix

The promoted family SHALL use the workers `sai-3-red-worker`, `sai-3-green-worker`, and `sai-4-review-worker`, the machines `implement-run@1`, `red-steps@1`, `green-steps@1`, and `review-steps@1`, and the implement session key `implement-{name}`. Every registry that names them (`sai/install-manifest.json`, `bin/worker-matrix.js`, `bin/model-customization.js`, `bin/orchestration-source-audit.js`, `bin/install-flow.js`, `sai-state/registry.js`, `sai/tools/lint.js`, and `fixtures/thin-command-wrappers-baseline.json`) SHALL use these identifiers.

#### Scenario: Interrupted pre-rename run does not resume

- **WHEN** `/sai-3-implement {name}` runs after an interrupted `/sai-3-implement-new` run left a session under the key `implement-new-{name}`
- **THEN** the run opens the session `implement-{name}`, starts fresh, and leaves the old `.tmp/{name}/run-*` directory in place

### Requirement: The implement command declares its own grants

In `sai/install-manifest.json` the implement command profile SHALL declare its write, shell, skill, and delegate grants itself instead of extending `apply-coordinator`, and the review, build, and deep-review command profiles SHALL extend the implement command profile.

#### Scenario: No profile extends apply-coordinator

- **WHEN** the install manifest capability profiles are read
- **THEN** no `apply-coordinator` profile exists and the implement command profile carries `write: true` and its own shell grant

### Requirement: Reinstall retires the removed wrappers and agents

The install manifest `retirements` section SHALL list, for both harnesses, every removed or renamed command wrapper (`sai-4-apply`, `sai-5-review`, `sai-review`, and every `-new` command), every deleted or renamed agent and worker binding, and the retired capability and command-card files, so that reinstalling over an existing install removes them while `sai-build` and `sai-3-implement` are overwritten in place.

#### Scenario: Reinstall over a legacy install

- **WHEN** the installer runs over an install that still holds the legacy wrappers and agents
- **THEN** the retired wrappers and agents are removed through the manifest `retirements` and `sai-build.md` and `sai-3-implement.md` are replaced with the promoted wrappers

### Requirement: Surviving references name the surviving commands

Every surviving reference outside `openspec/changes/archive/` and the ADR/DDR files SHALL name `/sai-4-review`, `/sai-3-implement`, or `/sai-deep-review` where it named `/sai-5-review`, `/sai-4-apply`, or `/sai-review`, and `/sai-6-security`, `/sai-7-performance`, and `/sai-8-accessibility` SHALL keep their numbers.

#### Scenario: Audit workers name the deep-review command

- **WHEN** the security, performance, and accessibility worker descriptions in the install manifest are read
- **THEN** each names its own numbered command and `/sai-deep-review`, not `/sai-review`
