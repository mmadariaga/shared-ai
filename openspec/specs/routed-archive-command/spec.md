# routed-archive-command Specification

## Purpose

Define the routed coordinator/worker architecture for `/sai-archive`: a minimal-lifecycle phase adapter whose coordinator owns lifecycle routing, gate presentation, and every mutating execution (the delta-spec sync writes, the archive directory move, and the post-archive commit gate), while the dispatched `sai-archive-worker` owns the read-only technical pre-flight and never mutates anything — with end-to-end worker registration and the openspec prerequisite REQUIREMENT carried by the coordinator card.

## Requirements

### Requirement: Minimal lifecycle adapter with fast-track session state

The archive coordinator SHALL be a goal-driven card with Goal, Start, run, Obstacles, and Close sections, and SHALL NOT load `sai/orchestration/command-runner.md`, `sai/orchestration/worker-core.md`, `bounded-recovery.md`, `stop-options.md`, or `unattended-runtime-recovery.md`. It SHALL parse `--fast-track` from `arguments_value` before change resolution, print `> FAST-TRACK MODE ACTIVE` exactly once when the token is present, retain `fast_track_active` as invocation-scoped session state, and never place it in the worker task. It SHALL create exactly one `sai-archive-worker` through the archive-worker binding with the ready prompt alone and send the resolved change name to the same worker after `event: ready`, declaring `fast_track_active` beside it. The run SHALL declare no progress plan, no progress event, no acknowledgement literal, and no recovery ledger. A worker without ready or a readable result SHALL be a `worker` obstacle handled under `sai/policies/obstacle-escalation.md`, with the attempt count kept in the conversation; the CORE stop, a retirement refusal, the post-archive gates, every CLI archive stop, and the change-picker stops SHALL remain planned stops. A replacement worker SHALL start from the ready handshake and receive a hand-over written by the coordinator that carries the resolved change name, `fast_track_active`, the Direct Build mode with its validated closed execution order and execution state when there is one, the questions already answered with their answer values, and the symptom.

#### Scenario: An archive run carries no progress or recovery machinery

- **WHEN** the archive coordinator card is read
- **THEN** it declares no progress plan, progress event, acknowledgement literal, or recovery ledger, and fetches none of the command runner, worker core, bounded-recovery, stop-options, or unattended-runtime-recovery contracts

#### Scenario: Fast-track survives only as session state

- **WHEN** `/sai-archive {name} --fast-track` sends its task to the worker
- **THEN** the worker receives the cleaned change name, `fast_track_active` remains session state beside it, and the banner is printed exactly once

#### Scenario: Replacement reconstructs without replay

- **WHEN** a replacement worker starts after an executed order
- **THEN** it SHALL start from the ready handshake with only the coordinator-written hand-over and never replay an executed order

### Requirement: Worker owns the read-only pre-flight and never mutates

The dispatched `sai-archive-worker` SHALL perform the complete read-only technical pre-flight: classification, completion scanning, informational delta-spec comparison, and target-name collision checking. It SHALL return all findings as payload content, including AUDIT warnings, the combined delta comparison, and the collision verdict. It SHALL preserve the CORE-missing stop text and SHALL never move a directory, write a file, synchronize main specs, or run a git command during preparation.

#### Scenario: Pre-flight findings arrive as payloads

- **WHEN** an archive worker completes classification, checkbox scanning, delta comparison, and collision checking
- **THEN** every finding reaches the coordinator as payload content and the worker has performed no write, directory move, or state-changing git operation

#### Scenario: The CORE-missing hard stop keeps its exact text

- **WHEN** any CORE artifact of the resolved change is not `done`
- **THEN** the worker returns exactly `Missing CORE artifact(s): <ids>. Archive blocked.` without an AUDIT warning

### Requirement: Needs-input gate transport and coordinator-only execution

The ordinary coordinator SHALL run exactly `openspec archive <name> --yes --json` as the sole synchronization-and-move primitive, parse its JSON result, and stop on failure or invalid JSON without manual fallback, staging, or commit. The Direct Build execute continuation SHALL run the same CLI primitive before exact-path staging and the authorized local commit. Terminal navigation SHALL print the worker-authored summary verbatim and SHALL close with exactly `Archive done.` only when the archive move executed.

#### Scenario: A gate answer travels through the coordinator untouched

- **WHEN** the user selects an option at a gate the archive coordinator presents
- **THEN** the coordinator forwards the selected value verbatim and executes no mutation until the gate authorizes archiving

#### Scenario: The CLI result authorizes synchronization and movement

- **WHEN** the gates authorize archiving and `openspec archive <name> --yes --json` returns valid success JSON
- **THEN** the CLI result is treated as the authoritative synchronization-and-move outcome and no manual sync or move procedure runs

#### Scenario: Sync mismatch stops the run before the move

- **WHEN** the post-sync verification reports that some capability still differs from its main spec
- **THEN** the worker-authored mismatch summary is presented verbatim and the archive stops without moving the change directory

### Requirement: Openspec prerequisite REQUIRED carried by the coordinator card

`sai-archive` SHALL operate on an openspec project, but the archive coordinator card SHALL NOT fetch `@sai/policies/prereqs.md` or run any prerequisite check; that check belongs to `/sai-explore` alone. The coordinator SHALL fetch `@sai/policies/prereqs-paths.md` for the artifact path table before fast-track parsing, change resolution, or worker dispatch.

#### Scenario: Archive halts outside openspec projects
- **WHEN** `sai-archive` runs in a project where the openspec CLI, directory, or schema is missing
- **THEN** the coordinator runs no prerequisite check and the failure surfaces from the OpenSpec CLI itself rather than from a coordinator-owned halt message

### Requirement: End-to-end worker registration

The `sai-archive-worker` identity SHALL be registered across the full projection chain: `bin/worker-matrix.js` gains the `archive` phase entry bringing the matrix to eleven entries and extends the worker-identity regex to admit `sai-archive-worker`; `sai/install-manifest.json` (and its generator) declare the claude and opencode managed-agent projections for the worker; the installed-worker roster and binding validators in `bin/install-flow.js` accept the eleven-worker roster; and `sai/commands/archive/launcher.md` carries exactly the binding fetch `Fetch @sai/orchestration/workers/bindings/archive-worker.md and use it.`

#### Scenario: Install validates the eleven-worker roster

- **WHEN** install-time roster and binding validation runs after the change
- **THEN** the derived roster contains eleven workers including `sai-archive-worker` and both harness projections for it are present exactly once

### Requirement: Fixed content assignment across the two cards

The technical split SHALL remain single-sourced: `sai/commands/archive/instructions.md` belongs to the worker for read-only verification, completeness scanning, delta comparison, and collision checking. The retirement declaration is single-sourced in `sai/commands/archive/retirement-declaration.md`, fetched by both cards. The coordinator owns the retirement declaration write, the CLI archive invocation, and the post-archive commit gate on the ordinary route; no OpenSpec skill is loaded. The Direct Build route delegates only its validated closed execution order, consisting of the CLI archive invocation, exact-path staging, and local commit, to the archive worker.

#### Scenario: Each technical duty lives in exactly one card

- **WHEN** the archive card set is audited after the change
- **THEN** preflight checks trace to the worker while CLI archive execution and git operations trace to the coordinator or validated Direct Build continuation

### Requirement: Archive guard windows and the single allow_commit carrier

The archive coordinator SHALL run the guard's `snapshot` step at each window opening and its `verify` step immediately before each boundary the no-commit-guard policy lists (human turn, coordinator git mutation, run close), holding the returned SHA as invocation-scoped `guard_base`, and SHALL act on a progress event or notice with no guard call. The coordinator's own CLI archive, staging, and post-archive commit operations SHALL always run between windows and never inside one. The system's one `allow_commit` carrier is the Direct Build (unattended) execute continuation: it SHALL always open its own window per the policy's `allow_commit` isolation, and that window's verify runs with `--allow-commit`, because its validated closed execution order contains the one pre-authorized local commit.

#### Scenario: the pre-authorized execute continuation is verified with the lax flag

- **WHEN** the archive worker's Direct Build execute continuation completes its validated closed order including the one local commit
- **THEN** the coordinator runs that isolated window's verify with `--allow-commit`, which resolves verdict `allowed`, and every other archive window runs without the flag

### Requirement: Direct Build backfill-artifact correction routing

The Direct Build execute continuation SHALL stop staging and commit on any CLI failure. A failed or cancelled execute result on this route SHALL stay with the Direct Build supervision contract (`sai/commands/explore/steps/pipeline-direct-build.md`), which owns the check that the earlier order had no effect and the re-issue of an order; the archive coordinator SHALL issue no order of its own and SHALL keep the classified content-fix loop ordinary-route only. A stop SHALL report the exact state. A late continuation after success SHALL be rejected without mutation. A stop SHALL carry no finality and SHALL run new retries only at explicit user request. The coordinator SHALL never fall back to the ordinary-route mutation surface.

#### Scenario: Backfill-artifact CLI failure routes to correction

- **WHEN** the Direct Build archive CLI fails with a backfill-artifact error
- **THEN** the failure stays with the Direct Build supervision contract for the correction and any execute-order re-issue, and no partial plan is staged or committed

### Requirement: Archive independently checks current scenario preservation

Immediately before the ordinary archive CLI or authorization of a Direct Build archive execution order, the coordinator SHALL independently run the shared header and scenario-preservation checker on current on-disk deltas against current published specifications. It SHALL supply only temporary exceptions individually verified against explicit approved scope. The header-fix handoff SHALL NOT authorize scenario removal or renaming. A failed or incomplete check SHALL prevent synchronization, archive, and commit of the affected drafts until correction. The coordinator SHALL repeat this boundary after every content correction before retrying synchronization. The checks SHALL NOT edit published specifications and SHALL preserve the existing CLI mutation ownership and authorization rules.

#### Scenario: Ordinary archive detects unapproved loss
- **WHEN** a current MODIFIED delta omits an existing scenario without a scope-verified exception
- **THEN** the coordinator prevents the archive CLI, synchronization, and commit of those drafts until the affected content is corrected

#### Scenario: Direct Build independently verifies approval
- **WHEN** Direct Build reaches archive authorization with retained temporary exception metadata
- **THEN** the coordinator re-verifies that metadata and each exception against the approved block rather than trusting the backfill worker before running the current-delta check

#### Scenario: Header correction grants no removal permission
- **WHEN** a content correction changes delta classification or scenario content
- **THEN** the coordinator repeats preservation checking and requires independent approval for each removal or rename before any CLI retry

#### Scenario: Ordinary archive does not depend on prior temporary state
- **WHEN** an ordinary archive session needs an exception after the previous backfill session has ended
- **THEN** it derives temporary metadata from explicit approved change scope and verifies it independently instead of treating absent prior state as approval

#### Scenario: Metadata stays out of archive outputs
- **WHEN** archive uses temporary exception metadata
- **THEN** that metadata is neither an owned staging path, an archive input artifact, nor a commit artifact

### Requirement: Direct card set and wrapper fetch

`sai-archive` SHALL run on the goal-driven shape. Its card set SHALL be `sai/commands/archive/coordinator.md` and `sai/commands/archive/worker.md` with their supporting instruction files, with no `invocation.md`, no `body.md`, and no `command-bootstrap.md`. Both `/sai-archive` wrappers (`commands/claude/sai-archive.md` and `commands/opencode/sai-archive.md`) SHALL fetch the harness fetch skill, carry the clean-start line, and fetch `sai/commands/archive/coordinator.md` directly, forwarding the InvocationEnvelope with `command_name: archive`; they SHALL fetch no boot adapter and no command bootstrap, and the opencode wrapper SHALL declare `subtask: false`. Neither harness boot adapter SHALL list `archive` among its routed or utility names. The coordinator SHALL fetch the `archive-worker.md` binding itself, and the `backfill-worker.md` binding for the header-fix reroute. The retired `sai/commands/archive/command-bootstrap.md` destination SHALL be recorded as a retired install-manifest entry so that an upgrade install removes it from the installed roots of both harnesses.

#### Scenario: The wrappers reach the coordinator card directly

- **WHEN** either harness's `sai-archive.md` wrapper is read
- **THEN** it fetches the harness fetch skill and `sai/commands/archive/coordinator.md`, names no boot adapter or `command-bootstrap.md`, and neither boot adapter lists `archive` as a routed or utility name

#### Scenario: The retired bootstrap leaves installed roots

- **WHEN** an upgrade install runs after the change on either harness
- **THEN** the install manifest lists `commands/archive/command-bootstrap.md` as a retired destination for both harnesses and the file no longer exists in `sai/commands/archive/`
