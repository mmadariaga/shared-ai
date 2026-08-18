# sai-status-progress-panel Specification

## Requirements

### Requirement: sai-status command and wrappers exist across all three harnesses

A `sai-status` command SHALL exist as a body file at `sai/commands/status/body.md` with one wrapper per harness: `commands/claude/sai-status.md`, `commands/opencode/sai-status.md`, and `commands/copilot/sai-status.prompt.md`. All four files SHALL be created and edited together in a single commit (mirror discipline).

#### Scenario: body file present
- **WHEN** `sai/commands/` is listed
- **THEN** `sai-status.md` is present

#### Scenario: all three wrappers present
- **WHEN** `commands/claude/`, `commands/opencode/`, and `commands/copilot/` are listed
- **THEN** `sai-status.md`, `sai-status.md`, and `sai-status.prompt.md` are present respectively

### Requirement: panel covers the 11 sai-workflow schema artifacts

`/sai-status {change-name}` SHALL print a compact panel that reports the presence state of each of the 11 sai-workflow schema artifacts — `proposal`, `specs`, `design`, `tasks`, `interfaces`, `change-overview`, `implementation`, `review`, `security`, `performance`, and `accessibility` — and SHALL NOT include `pr.md` as a panel artifact.

#### Scenario: all 11 artifacts represented
- **WHEN** `/sai-status <change-name>` runs on an existing change
- **THEN** the panel shows a per-phase line for each of the 11 schema artifacts and no line for `pr.md`

#### Scenario: artifact completion derived from the CLI
- **WHEN** the panel reports whether an artifact is present or done
- **THEN** that state is derived from `openspec status --change <change-name> --json`, not re-derived from filesystem globs

### Requirement: interfaces.md is exempt; change-overview.md state is read from .openspec.yaml

The panel SHALL treat `interfaces.md` as EXEMPT — its absence SHALL NOT be rendered as a problem or a missing-artifact warning, matching the archive classification (ADR 0023). The panel SHALL derive the `change-overview` overview state from the `overview.state` key in `openspec/changes/{name}/.openspec.yaml` (the persisted state defined by the `change-overview-synchronization` capability), NOT from inspecting `change-overview.md` contents:

- `overview.state: current` — rendered as present and current.
- `overview.state: stale` — rendered as a problem (the overview is not the change's current review surface).
- `overview.state: failed` — rendered as a problem (first materialization was attempted at `Continue` and failed; the change requires a retry).
- `overview.state: materializing` — rendered as a problem (a generator dispatch is in progress or was interrupted; the overview is not committed).
- key absent or `overview.state: unmaterialized` on a non-backfilled change — rendered as expected, not a problem (the overview is not yet generated; it materializes at the first successful sai-2 `Continue` processing).
- `backfilled: true` change — not applicable, no problem rendered.

The panel SHALL derive the overview state from the `.openspec.yaml` key rather than from file presence alone, because file presence alone cannot distinguish unmaterialized, materializing, current, stale, and failed overviews (a stale record still exists at `change-overview.md`, and a failed or interrupted first materialization leaves ambiguous file state). Currentness SHALL be the conjunction of both signals: the panel SHALL render the overview as current only when `overview.state: current` AND the CLI-reported artifact is present/done (`openspec status --change <change-name> --json`). A missing or not-`done` `change-overview.md` combined with `overview.state: current` metadata SHALL be treated as stale/inconsistent and rendered as a problem, because the metadata claims a review surface the file does not provide. Conversely, an overview file present on disk paired with any non-`current` state — `unmaterialized`, `materializing`, `failed`, or `stale` — SHALL be rendered as a problem/inconsistency, because the file is not committed as the change's review surface; for `materializing` the panel SHALL render it as inconsistent until reconciliation verifies it against the current sources.

#### Scenario: absent interfaces.md not flagged
- **WHEN** `/sai-status <change-name>` runs on a change that has no `interfaces.md`
- **THEN** the panel does not flag the absence as a problem

#### Scenario: unmaterialized overview not flagged before first Continue
- **WHEN** `/sai-status <change-name>` runs on a non-backfilled change whose `.openspec.yaml` has no `overview.state` key (or `unmaterialized`) and no `change-overview.md` exists
- **THEN** the panel does not flag the overview as a problem — it is the expected pre-materialization state

#### Scenario: stale overview flagged on an ordinary change
- **WHEN** `/sai-status <change-name>` runs on a non-backfilled change whose `.openspec.yaml` records `overview.state: stale`
- **THEN** the panel reports the stale overview as a problem, even when `change-overview.md` still exists (for example carrying a stale record)

#### Scenario: failed first materialization flagged on an ordinary change
- **WHEN** `/sai-status <change-name>` runs on a non-backfilled change whose `.openspec.yaml` records `overview.state: failed`
- **THEN** the panel reports the failed overview as a problem, distinct from the expected pre-`Continue` `unmaterialized` state

#### Scenario: interrupted materialization flagged as inconsistent
- **WHEN** `/sai-status <change-name>` runs on a non-backfilled change whose `.openspec.yaml` records `overview.state: materializing` and `change-overview.md` exists
- **THEN** the panel reports the interrupted materialization as a problem/inconsistency until reconciliation commits `current` or regenerates

#### Scenario: current overview rendered present only when the file also exists
- **WHEN** `/sai-status <change-name>` runs on a change whose `.openspec.yaml` records `overview.state: current` and `change-overview.md` exists with status `done`
- **THEN** the panel renders `change-overview.md` as present and current

#### Scenario: current metadata with missing file rendered as inconsistent
- **WHEN** `/sai-status <change-name>` runs on a change whose `.openspec.yaml` records `overview.state: current` but `change-overview.md` is missing or not `done` (for example deleted out-of-band)
- **THEN** the panel does NOT render the overview as current
- **AND** it reports the inconsistency as a problem, because the metadata claims a review surface the file does not provide

### Requirement: Not Applicable audits are surfaced as present

For the audit artifacts (`review`, `security`, `performance`, `accessibility`), the panel SHALL treat an artifact whose body contains a `## Not Applicable` heading as present, mirroring the Classification Check in `sai-archive.md` so the two commands share semantics.

#### Scenario: N/A audit counted as present
- **WHEN** an audit artifact file exists and contains a `## Not Applicable` heading
- **THEN** the panel shows that audit as present, not as missing

### Requirement: specs approval state is shown from .openspec.yaml

The panel SHALL read the specs approval state from `.openspec.yaml` (the approval key) and display it, and SHALL NOT write to `.openspec.yaml`.

#### Scenario: approval state displayed
- **WHEN** `.openspec.yaml` records the specs approval key for the change
- **THEN** the panel displays the specs approval state read from that key

#### Scenario: approval key absent
- **WHEN** `.openspec.yaml` has no recorded specs approval key for the change
- **THEN** the panel renders the specs approval state as not approved

### Requirement: implementation progress is shown as checked-vs-total

The panel SHALL display implementation progress as a checked-vs-total count derived from the `- [x]` and `- [ ]` task lines in `implementation.md`. This checked-vs-total rendering SHALL be the only checkbox interpretation in the panel.

#### Scenario: progress count rendered
- **WHEN** `implementation.md` exists with a mix of `- [x]` and `- [ ]` task lines
- **THEN** the panel shows the count of checked tasks over the total task count

#### Scenario: no implementation.md
- **WHEN** `implementation.md` does not exist for the change
- **THEN** the panel shows the implementation phase without a progress count and does not error

### Requirement: panel prints a Next hint

The panel SHALL include a `Next:` line that suggests the appropriate `/sai-N-...` command for the change's current state. `/sai-pr` MAY appear as a candidate `Next:` hint when the relevant gates are met, but SHALL NOT appear as a panel checkbox.

#### Scenario: next command suggested
- **WHEN** `/sai-status <change-name>` runs on an in-progress change
- **THEN** the panel prints a `Next:` line naming the appropriate next `/sai-N-...` command

#### Scenario: specs present but not approved
- **WHEN** the change has `specs` present but no recorded specs approval key
- **THEN** the `Next:` line points to `/sai-2-design` (which carries the specs approval gate)

#### Scenario: archived change has no next command
- **WHEN** the change is archived
- **THEN** the panel prints no `/sai-N-...` next command, reflecting that the change is closed

### Requirement: sai-status is read-only

The `sai-status` command SHALL NOT write, create, or delete any file — including anything under `openspec/changes/{name}/`, `openspec/specs/`, and `.openspec.yaml`. Each wrapper SHALL restrict itself to read-only tools via its harness's mechanism: Claude Code via `allowed-tools`, Copilot via `tools:`, and opencode via model-discipline only (opencode has no per-command tool-restriction frontmatter, matching `sai-explore`'s current state).

#### Scenario: no writes performed
- **WHEN** `/sai-status <change-name>` runs to completion
- **THEN** no file under `openspec/changes/<change-name>/`, `openspec/specs/`, or `.openspec.yaml` is created, modified, or deleted

#### Scenario: Claude and Copilot wrappers declare read-only tools
- **WHEN** the frontmatter of `commands/claude/sai-status.md` and `commands/copilot/sai-status.prompt.md` is read
- **THEN** the declared tool set excludes file-writing tools

### Requirement: sai-status performs no subagent dispatch and has no fast-track flag

The `sai-status` command SHALL run entirely in the main session with no `budget-explorer` / `budget-executor` subagent dispatch, and SHALL NOT accept a `--fast-track` flag.

#### Scenario: no subagent spawned
- **WHEN** `/sai-status <change-name>` runs
- **THEN** it completes using one `openspec status` CLI call plus targeted local file reads, with no subagent spawn

#### Scenario: no fast-track surface
- **WHEN** the `sai-status` command body is read
- **THEN** it defines no `--fast-track` flag or fast-track parse step
