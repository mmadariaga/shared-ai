# direct-build-command Specification

## Purpose
TBD - created by archiving change sai-direct-build-command. Update Purpose after archive.

## Requirements

### Requirement: Mirrored non-interactive Direct Build command

SAI SHALL ship a `/sai-direct-build` command on Claude Code and opencode whose wrappers fetch the harness fetch skill and `sai/commands/direct-build/coordinator.md`, and forward an invocation envelope with `command_name: direct-build` and `arguments_value: $ARGUMENTS`. The two wrappers SHALL stay mirrored, and the Claude Code wrapper SHALL declare the argument hint `--block-file <path> --block-hash <sha256>`. The command SHALL run the Direct Build route with no route picker and SHALL NOT be `/sai-build`: it plans nothing and does not use the RED and GREEN workers.

#### Scenario: Both wrappers fetch the same coordinator card

- **WHEN** the Claude Code and opencode wrappers of `/sai-direct-build` are read
- **THEN** each fetches its harness fetch skill and then `sai/commands/direct-build/coordinator.md`, forwarding `command_name: direct-build`

### Requirement: Block reference arguments

The command SHALL drop every `--fast-track` and `--supervised` token silently, with no banner. It SHALL then require exactly one `--block-file <path>` and exactly one `--block-hash <sha256>`, on separate lines or in either order, and nothing else. When either is missing or repeated, or the arguments hold anything else, the command SHALL print `Cannot start /sai-direct-build: pass --block-file <path> and --block-hash <sha256> (the pair that sai-state block --export returns).` and end the run, writing nothing.

#### Scenario: Pasted block instead of a reference

- **WHEN** `/sai-direct-build` receives a pasted block or a change name instead of the `--block-file` and `--block-hash` pair
- **THEN** it prints the usage stop line and ends the run without writing anything

### Requirement: Block verification before any work

Before any dispatch or write, the command SHALL verify the block file against the hash with `ready-to-propose.js verify-file --block-file <path> --block-hash <hash>`. A file that is missing, unreadable, unsafe, or does not match the hash SHALL end the run with `Cannot start /sai-direct-build: the block file does not verify against --block-hash ({problem}).`, naming the tool's problem, writing nothing and dispatching nothing. The command SHALL never rebuild the block from chat. A verified block without a `Change name` line SHALL end the run the same way, naming the missing line. The verified block file SHALL be the only substantive input of the run.

#### Scenario: Mismatched hash writes nothing

- **WHEN** `/sai-direct-build` receives a `--block-file` whose content does not match `--block-hash`
- **THEN** it prints the verification stop line with the problem, writes nothing, and starts no worker

### Requirement: Explore Direct Build card as the run

After verification the command SHALL follow `sai/commands/explore/direct-build-coordinator.md` as its run, acting as that card's block provider: the verified pair SHALL serve every dispatch of the card, the backfill preparation and any replacement worker included, and the command SHALL neither export a block nor close or remove the block file. The card's `sai-state` store, route entries, slice machine, idea list, intent events, and Resume SHALL NOT apply; a new invocation starts from the beginning, and the active change is the block's change name. The command SHALL skip the backlog implementation start and perform no remote operation, keeping the block's `Backlog origin` as provenance for the backfill and the archive. The Direct Build route of `/sai-explore` SHALL keep its behavior.

#### Scenario: Explore route unchanged

- **WHEN** the Direct Build route runs from `/sai-explore`
- **THEN** it still exports the block from the `sai-state` store and keeps its grant of two local commits

### Requirement: Single local commit authorization

Invoking the command SHALL consent to the delegated writes of the Direct Build route and SHALL pre-authorize exactly one local commit, the archived change. The command SHALL record no change telemetry, make no second commit, and never push.

#### Scenario: No telemetry commit

- **WHEN** a `/sai-direct-build` run archives its change and commits it
- **THEN** no change telemetry is recorded, no second commit is made, and the report says that no telemetry was recorded

### Requirement: Closing literal only on completion

The command SHALL dispose every worker and helper still alive before its closing report, in every outcome, and close with the card's terminal report. It SHALL print `Direct build done.` as the last line of the output, alone on its line, only when the archive worker returned a clean `completed` result and the archive commit is confirmed. An escalation SHALL go through the native picker; a stopped, cancelled, or unanswered run, or one whose escalation was dismissed, SHALL print its report and end without the closing literal, so a headless caller reads the missing line as an escalation.

#### Scenario: Unanswered escalation omits the literal

- **WHEN** a `/sai-direct-build` run escalates and no user answers
- **THEN** the stop report is printed and `Direct build done.` is not

### Requirement: Direct Build command capability profile

`sai/install-manifest.json` SHALL assign `sai-direct-build` the `direct-build-command` capability profile: a mutation coordinator with temp-only native writes, task stop, the `safe-operations` and `fetch` skills, shell access including `transfer.js`, and delegation limited to the executor, the explorer, `sai-direct-build-worker`, `sai-backfill-worker`, and `sai-archive-worker`, translated for both Claude Code and opencode.

#### Scenario: Delegation limited to the Direct Build workers

- **WHEN** the `direct-build-command` profile is resolved
- **THEN** its delegates are exactly the executor, the explorer, `sai-direct-build-worker`, `sai-backfill-worker`, and `sai-archive-worker`

### Requirement: Model customization for the command

The model customization menu SHALL list `command:sai-direct-build` with context `Large` and difficulty `↑↑↑`, ordered after `sai-build` in the implementation group, and every default preset under `sai/presets/` SHALL carry a `command:sai-direct-build` entry equal to its `command:sai-build` entry.

#### Scenario: Default preset entry matches sai-build

- **WHEN** a default preset is read
- **THEN** its `command:sai-direct-build` entry equals its `command:sai-build` entry
