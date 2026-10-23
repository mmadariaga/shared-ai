# plan-command Specification

## Purpose
The `/sai-plan` command turns a crystallized Ready to Propose block into the full plan of a change in one unattended run, by chaining the `/sai-1-spec` and `/sai-2-design` segments.

## Requirements

### Requirement: /sai-plan chains the spec and design segments in one session

`/sai-plan` SHALL follow `sai/commands/spec/coordinator.md` and then `sai/commands/design/coordinator.md` as segments in one session, in the shape `/sai-build` uses for implement and review, without loading `composition.md` or `command-runner.md`. It SHALL accept a pasted Ready to Propose block, a `--block-file <path> --block-hash <sha256>` reference, or the name of a change, plus the optional `--overview-lang <language>`, which it passes to the design segment. No wrapper SHALL be entered again and no approval SHALL be asked between segments; the artifacts on disk SHALL be the only interface between the segments. Invoking `/sai-plan` SHALL approve the specs. The Claude Code wrapper `commands/claude/sai-plan.md` and the opencode wrapper `commands/opencode/sai-plan.md` SHALL load the harness `fetch` skill and `sai/commands/plan/coordinator.md` directly, with no boot adapter and no `command-bootstrap.md`.

#### Scenario: a block runs both segments

- **WHEN** `/sai-plan` receives a dispatchable block for a change with no `proposal.md` and no specs
- **THEN** the spec segment runs first and the design segment starts only after the spec segment completed

#### Scenario: both harness wrappers load the coordinator directly

- **WHEN** `commands/claude/sai-plan.md` or `commands/opencode/sai-plan.md` is read
- **THEN** it fetches the harness `fetch` skill and `@sai/commands/plan/coordinator.md` and fetches no boot adapter and no `command-bootstrap.md`

### Requirement: Existing proposal and specs win over a block

`/sai-plan` SHALL decide which segments run from what `openspec/changes/{name}/` holds. When both `proposal.md` and a file under `specs/` exist, the spec segment SHALL count as done, a supplied block SHALL NOT rewrite them, and the report SHALL say so. When neither exists and the input is a change name, `/sai-plan` SHALL print `Cannot start /sai-plan for {name}: missing proposal.md and specs/. Pass the Ready to Propose block to create them.` and end writing nothing. When only one of them exists, it SHALL print `Cannot start /sai-plan for {name}: missing {the absent item}. Complete it with /sai-1-spec {name} followed by your feedback, then run /sai-plan {name}.` and end writing nothing. When the input holds neither a block nor a name, it SHALL print `Cannot start /sai-plan: pass a Ready to Propose block (paste it, or use --block-file and --block-hash), or the name of a change that already has proposal.md and specs/.` and end writing nothing.

#### Scenario: specs on disk count as a done spec segment

- **WHEN** `/sai-plan` receives a block for a change that already has `proposal.md` and a spec file
- **THEN** the spec segment counts as done, the specs are not rewritten, and the design segment runs

#### Scenario: a partly present change stops before any dispatch

- **WHEN** `/sai-plan {name}` runs on a change that has `proposal.md` but no file under `specs/`
- **THEN** it prints the partly-present startup literal naming `/sai-1-spec {name}` and dispatches no worker

### Requirement: A segment that does not complete stops the plan run

When the spec segment fails, is stopped, or ends on an escalation the user did not resolve, `/sai-plan` SHALL print that segment's report, SHALL NOT start the design segment, and SHALL end with no closing line. Review findings still pending after the third review round SHALL NOT stop the run: the design segment SHALL start over the specs with those findings listed in the closing report. A change left with specs and no design SHALL continue with `/sai-2-design {name}` or another `/sai-plan {name}`.

#### Scenario: a stopped spec segment does not start design

- **WHEN** the spec segment of a `/sai-plan` run ends stopped
- **THEN** the design segment does not start and the run ends with the spec report and no closing line

#### Scenario: pending spec findings do not stop design

- **WHEN** the spec segment completes with findings still pending after its third review round
- **THEN** the design segment starts and the closing report lists the pending findings

### Requirement: /sai-plan closes with its own line

When both segments completed, or the spec segment counted as done and the design segment completed, `/sai-plan` SHALL replace each segment's closing line with its own, say which artifacts were created, and end with exactly ``Plan done in openspec/changes/{name}/. Review it and run `/sai-build {name}` in a new chat when ready.`` The command SHALL stop before implementation.

#### Scenario: a completed plan prints the plan closing line

- **WHEN** both segments of a `/sai-plan` run complete
- **THEN** the run ends with the `Plan done in openspec/changes/{name}/.` closing line naming `/sai-build {name}` and dispatches no implementation

### Requirement: Plan commands accept and ignore fast-track and supervised

`/sai-1-spec`, `/sai-2-design`, and `/sai-plan` SHALL drop every `--fast-track` and `--supervised` token from their invocation, activate nothing from them, and print no fast-track banner. `/sai-2-design` SHALL NOT be listed among the commands that parse `--fast-track` in `sai/policies/fast-track-flag.md`.

#### Scenario: fast-track is ignored

- **WHEN** `/sai-2-design {name} --fast-track` is invoked
- **THEN** the token is dropped, no `> FAST-TRACK MODE ACTIVE` banner is printed, and the run behaves as without the token
