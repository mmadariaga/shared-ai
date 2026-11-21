# sai-status-progress-panel Specification

## Purpose

The sai-status-progress-panel capability defines the read-only progress panel that `/sai-status` renders for a single OpenSpec change. It reports the presence state of each of the 11 sai-workflow artifacts, the specs approval state read from `.openspec.yaml`, the change-overview state, implementation progress as a checked-vs-total count, and a `Next:` hint naming the appropriate next `/sai-N-...` command.

## Requirements

### Requirement: sai-status command and wrappers exist for both harnesses

A `sai-status` command SHALL exist as a body file at `sai/commands/status/body.md` with one wrapper per harness: `commands/claude/sai-status.md` and `commands/opencode/sai-status.md`. The body and both wrappers SHALL be edited together in a single commit (mirror discipline). The body file now dispatches to the deterministic status tool rather than containing an inline prose algorithm.

#### Scenario: body file present
- **WHEN** `sai/commands/status/` is listed
- **THEN** `body.md` is present

#### Scenario: both wrappers present
- **WHEN** `commands/claude/` and `commands/opencode/` are listed
- **THEN** each contains `sai-status.md`

### Requirement: Not Applicable audits are surfaced as present

For the audit artifacts (`review`, `security`, `performance`, `accessibility`), the panel SHALL treat an artifact whose body contains a `## Not Applicable` heading as present, mirroring the Classification Check in `sai-archive.md` so the two commands share semantics.

#### Scenario: N/A audit counted as present
- **WHEN** an audit artifact file exists and contains a `## Not Applicable` heading
- **THEN** the panel shows that audit as present, not as missing

### Requirement: specs approval state is shown from .openspec.yaml

The panel SHALL read the specs approval state from `.openspec.yaml` (the approval key) and display it, and SHALL NOT write to `.openspec.yaml`. The three-state specs cell renders approved, present-but-unapproved, or absent, enabling the Next hint algorithm to distinguish whether an approved specification exists.

#### Scenario: approval state displayed
- **WHEN** `.openspec.yaml` records the specs approval key for the change
- **THEN** the panel displays the specs approval state read from that key as approved

#### Scenario: approval key absent
- **WHEN** `.openspec.yaml` has no recorded specs approval key for the change
- **THEN** the panel renders the specs approval state as not approved

#### Scenario: approval key absent with specs present
- **WHEN** `.openspec.yaml` has no recorded specs approval key but the specs artifact is present
- **THEN** the panel renders the specs state as present-but-unapproved, not absent

#### Scenario: approval key and specs both absent
- **WHEN** `.openspec.yaml` has no recorded specs approval key and the specs artifact is absent
- **THEN** the panel renders the specs state as absent

### Requirement: implementation progress is shown as checked-vs-total

The panel SHALL display implementation progress as a checked-vs-total count derived from the `- [x]` and `- [ ]` task lines in `tasks.md`. This checked-vs-total rendering SHALL be the only checkbox interpretation in the panel.

#### Scenario: progress count rendered

- **WHEN** `tasks.md` exists with a mix of `- [x]` and `- [ ]` task lines
- **THEN** the panel shows the count of checked tasks over the total task count

#### Scenario: no implementation.md
- **WHEN** the status panel reads a change
- **THEN** it never reads `implementation.md`, shows progress only from `tasks.md`, and does not error

#### Scenario: no checkbox in tasks.md

- **WHEN** `tasks.md` does not exist or holds no checkbox lines
- **THEN** the panel shows no progress count and does not error

### Requirement: panel prints a Next hint

The panel SHALL include a `Next:` line that suggests the appropriate `/sai-N-...` command for the change's current state. `/to-pr` MAY appear as a candidate `Next:` hint when the relevant gates are met, but SHALL NOT appear as a panel checkbox. Next hint resolution uses a deterministic first-match decision table reading the panel's derived cells. With design and tasks present, a change with any unchecked or no checkbox in `tasks.md` SHALL route to `/sai-3-implement`, and a change with every task checked and no `review.md` SHALL route to `/sai-4-review`.

#### Scenario: next command suggested

- **WHEN** `/sai-status <change-name>` runs on an in-progress change
- **THEN** the panel prints a `Next:` line naming the appropriate next `/sai-N-...` command

#### Scenario: specs present but not approved

- **WHEN** the change has `specs` present but no recorded specs approval key
- **THEN** the `Next:` line points to `/sai-2-design` (which carries the specs approval gate)

#### Scenario: archived change has no next command

- **WHEN** the change is archived
- **THEN** the panel prints no `/sai-N-...` next command, reflecting that the change is closed

#### Scenario: unchecked tasks route to implement

- **WHEN** design and tasks are present and `tasks.md` has an unchecked task
- **THEN** the `Next:` line points to `/sai-3-implement`

#### Scenario: all tasks checked and no review

- **WHEN** every task in `tasks.md` is checked and `review.md` is absent
- **THEN** the `Next:` line points to `/sai-4-review`

### Requirement: sai-status is read-only

The `sai-status` command SHALL NOT write, create, or delete any file — including anything under `openspec/changes/{name}/`, `openspec/specs/`, and `.openspec.yaml`. Each wrapper SHALL restrict itself to read-only tools via its harness's mechanism: Claude Code via `allowed-tools`, and opencode via model-discipline only (opencode has no per-command tool-restriction frontmatter, matching `sai-explore`'s current state). The deterministic tool is read-only and creates no state mutations.

#### Scenario: no writes performed
- **WHEN** `/sai-status <change-name>` runs to completion
- **THEN** no file under `openspec/changes/<change-name>/`, `openspec/specs/`, or `.openspec.yaml` is created, modified, or deleted

#### Scenario: Claude wrapper declares read-only tools
- **WHEN** the frontmatter of `commands/claude/sai-status.md` is read
- **THEN** the declared tool set excludes file-writing tools

### Requirement: sai-status performs no subagent dispatch and has no fast-track flag

The `sai-status` command SHALL run entirely in the main session with no `budget-explorer` / `budget-executor` subagent dispatch, and SHALL NOT accept a `--fast-track` flag.

#### Scenario: no subagent spawned
- **WHEN** `/sai-status <change-name>` runs
- **THEN** it completes using one `openspec status` CLI call plus targeted local file reads, with no subagent spawn

#### Scenario: no fast-track surface
- **WHEN** the `sai-status` command body is read
- **THEN** it defines no `--fast-track` flag or fast-track parse step

### Requirement: A skipped specs artifact shows as skipped and is satisfied
When `openspec status --json` reports the `specs` artifact as `skipped` (the change declares `skip_specs: true`), the panel SHALL render the specs cell as `skipped` instead of the approval states, and the `Next:` hint SHALL treat specs as present and approved, so it never points to `/sai-1-spec` because of the specs. The panel SHALL identify each artifact by the `id` field of the CLI output, falling back to `name`.

#### Scenario: Skipped specs render as skipped
- **WHEN** the CLI reports the `specs` artifact of a change as `skipped`
- **THEN** the specs cell reads `skipped`

#### Scenario: Next hint passes over skipped specs
- **WHEN** the specs artifact is `skipped` and `design.md` is absent
- **THEN** the `Next:` line points to `/sai-2-design`, as for approved specs, and never to `/sai-1-spec`

#### Scenario: Artifacts named by id are recognized
- **WHEN** the CLI output identifies artifacts by `id` rather than `name`
- **THEN** the panel maps each artifact to its cell

### Requirement: panel covers the eight sai-workflow schema artifacts

`/sai-status {change-name}` SHALL report the presence state of each of the eight sai-workflow schema artifacts `proposal`, `specs`, `design`, `tasks`, `review`, `security`, `performance`, and `accessibility`, and SHALL NOT report `interfaces.md`, `change-overview.md`, `implementation.md`, or `pr.md`. It SHALL NOT read `overview.state` from `.openspec.yaml`. The bulk table SHALL carry the columns `prop`, `spec`, `dsgn`, `task`, `rev`, `sec`, `perf`, `a11y`, `Impl`, and `Next`.

#### Scenario: Eight artifacts represented

- **WHEN** `/sai-status <change-name>` runs on an existing change
- **THEN** the panel shows one line for each of the eight artifacts and no line for interfaces or the overview

#### Scenario: A legacy interfaces.md is ignored

- **WHEN** a change still holds an `interfaces.md` or a `change-overview.md`
- **THEN** the panel neither reads nor reports those files
