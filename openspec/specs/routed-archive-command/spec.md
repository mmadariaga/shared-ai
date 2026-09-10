# routed-archive-command Specification

## Purpose

Define the routed coordinator/worker architecture for `/sai-archive`: a minimal-lifecycle phase adapter whose coordinator owns lifecycle routing, gate presentation, and every mutating execution (the delta-spec sync writes, the archive directory move, and the post-archive commit gate), while the dispatched `sai-archive-worker` owns the read-only technical pre-flight and never mutates anything — with end-to-end worker registration and the openspec prerequisite REQUIREMENT carried by the coordinator card.
## Requirements
### Requirement: Routed card set and boot routing

`sai-archive` SHALL be a routed-shaped command whose card set is exactly `sai/commands/archive/coordinator.md` and `sai/commands/archive/worker.md` (no `invocation.md`; the legacy utility `body.md` is retired). Both harness boot adapters (`sai/adapters/claude/boot.md` and `sai/adapters/opencode/boot.md`) SHALL classify `archive` among the routed names so that selecting it fetches `@sai/commands/archive/coordinator.md`, and SHALL exclude `archive` from the utility-name lists byte-symmetrically; no boot path SHALL select an archive `body.md`.

#### Scenario: Both boots route archive to the coordinator card

- **WHEN** either supported harness boots with `command_name` set to `archive`
- **THEN** `archive` appears in that boot adapter's routed-name list and the selected card is `@sai/commands/archive/coordinator.md`
- **AND** `archive` does not appear in the boot's utility-name list

#### Scenario: The utility body surface is retired

- **WHEN** `sai/commands/archive/` is inspected after the change
- **THEN** no `body.md` exists and no adapter, launcher, or test fixture selects one for `sai-archive`

### Requirement: Minimal lifecycle adapter with fast-track session state

The archive coordinator SHALL declare the minimal phase-adapter field set: `original_envelope` is the opaque single-string fast-track-cleaned request; `dispatch_operation` dispatches exactly one `sai-archive-worker` through the active archive-worker binding; `continuation_operation` continues the same worker while forwarding only the selected answer value; `allowed_nonterminal_extensions` is none; and no `progress_plan` or `recovery_policy` is declared. The coordinator SHALL parse `--fast-track` before resolution, retain `fast_track_active` as invocation-scoped session state, and never place it in the envelope. A replacement worker SHALL reconstruct only from the original envelope, opaque input history, resolved change name, fast-track state, Direct Build state, validated execution order, execution state, and ordered duplicate-free changed-files union.

#### Scenario: An archive run carries no progress or recovery machinery

- **WHEN** the archive coordinator card is read
- **THEN** it declares no progress plan, progress event, acknowledgement literal, recovery policy, bounded-recovery fetch, or recovery continuation

#### Scenario: Fast-track survives only as session state

- **WHEN** `/sai-archive {name} --fast-track` dispatches its worker
- **THEN** the envelope carries the cleaned request, `fast_track_active` remains session state, and the banner is printed exactly once

#### Scenario: Replacement reconstructs without replay

- **WHEN** a replacement worker reconstructs after an executed order
- **THEN** it SHALL reconstruct only from the declared fields and never replay an executed order

### Requirement: Worker owns the read-only pre-flight and never mutates

The dispatched `sai-archive-worker` SHALL perform the complete read-only technical pre-flight: classification, completion scanning, informational delta-spec comparison, and target-name collision checking. It SHALL return all findings as payload content, including AUDIT warnings, unchecked-item details, the combined delta comparison, and the collision verdict. It SHALL preserve the CORE-missing stop text and SHALL never move a directory, write a file, synchronize main specs, or run a git command during preparation.

#### Scenario: Pre-flight findings arrive as payloads

- **WHEN** an archive worker completes classification, checkbox scanning, delta comparison, and collision checking
- **THEN** every finding reaches the coordinator as payload content and the worker has performed no write, directory move, or state-changing git operation

#### Scenario: The CORE-missing hard stop keeps its exact text

- **WHEN** any CORE artifact of the resolved change is not `done`
- **THEN** the worker returns exactly `Missing CORE artifact(s): <ids>. Archive blocked.` without an AUDIT warning

### Requirement: Needs-input gate transport and coordinator-only execution

The worker SHALL return only the unchecked-items decision as a pre-mutation `needs_input` result when `implementation.md` contains unchecked items. Under fast-track it SHALL auto-proceed that gate without writing approval metadata. The coordinator SHALL present the question through the native picker and forward the selected value verbatim. After the gate resolves, the ordinary coordinator SHALL run exactly `openspec archive <name> --yes --json` as the sole synchronization-and-move primitive, parse its JSON result, and stop on failure or invalid JSON without manual fallback, staging, or commit. The Direct Build execute continuation SHALL run the same CLI primitive before exact-path staging and the authorized local commit. Terminal navigation SHALL print the worker-authored summary verbatim and SHALL close with exactly `Archive done.` only when the archive move executed.

#### Scenario: A gate answer travels through the coordinator untouched

- **WHEN** the user selects an option at the unchecked-items gate
- **THEN** the coordinator forwards the selected value verbatim and executes no mutation until the gate authorizes archiving

#### Scenario: The CLI result authorizes synchronization and movement

- **WHEN** the gates authorize archiving and `openspec archive <name> --yes --json` returns valid success JSON
- **THEN** the CLI result is treated as the authoritative synchronization-and-move outcome and no manual sync or move procedure runs

#### Scenario: Sync mismatch stops the run before the move

- **WHEN** the post-sync verification reports that some capability still differs from its main spec
- **THEN** the worker-authored mismatch summary is presented verbatim and the archive stops without moving the change directory

### Requirement: Openspec prerequisite REQUIRED carried by the coordinator card

Unlike the commit exemption, `sai-archive` SHALL require the openspec project: the archive coordinator card SHALL fetch `@sai/policies/prereqs.md` and apply the full three checks — the `openspec` binary in PATH, the `openspec/` directory present, and `openspec/config.yaml` declaring `schema: sai-workflow` — halting with the check's own message on failure, before any fast-track parsing, change resolution, or worker dispatch.

#### Scenario: Archive halts outside openspec projects

- **WHEN** `sai-archive` runs in a project where any prerequisite check fails
- **THEN** the coordinator halts with that check's message before dispatching the worker, because no exemption exists for this command

### Requirement: End-to-end worker registration

The `sai-archive-worker` identity SHALL be registered across the full projection chain: `bin/worker-matrix.js` gains the `archive` phase entry bringing the matrix to eleven entries and extends the worker-identity regex to admit `sai-archive-worker`; `sai/install-manifest.json` (and its generator) declare the claude and opencode managed-agent projections for the worker; the installed-worker roster and binding validators in `bin/install-flow.js` accept the eleven-worker roster; and `sai/commands/archive/launcher.md` carries exactly the binding fetch `Fetch @sai/orchestration/workers/bindings/archive-worker.md and use it.`

#### Scenario: Install validates the eleven-worker roster

- **WHEN** install-time roster and binding validation runs after the change
- **THEN** the derived roster contains eleven workers including `sai-archive-worker` and both harness projections for it are present exactly once

### Requirement: Fixed content assignment across the two cards

The technical split SHALL remain single-sourced: `sai/commands/archive/instructions.md` belongs to the worker for read-only verification, completeness scanning, delta comparison, collision checking, and the unchecked-items question. The coordinator owns the CLI archive invocation and the post-archive commit gate on the ordinary route. The Direct Build route delegates only its validated closed execution order, consisting of the CLI archive invocation, exact-path staging, and local commit, to the archive worker.

#### Scenario: Each technical duty lives in exactly one card

- **WHEN** the archive card set is audited after the change
- **THEN** preflight checks and the unchecked-items gate trace to the worker while CLI archive execution and git operations trace to the coordinator or validated Direct Build continuation

### Requirement: Archive guard windows and the single allow_commit carrier

The archive coordinator SHALL run the guard's `snapshot` step immediately before each `sai-archive-worker` dispatch and each same-worker continuation, holding the returned SHA as invocation-scoped `guard_base`, and its `verify` step immediately after every returned result, before acting on that result. The coordinator's own CLI archive, staging, and post-archive commit operations SHALL always run between windows and never inside one. The system's one `allow_commit` carrier is the Direct Build (unattended) execute continuation: that window's verify runs with `--allow-commit`, because its validated closed execution order contains the one pre-authorized local commit.

#### Scenario: the pre-authorized execute continuation is verified with the lax flag

- **WHEN** the archive worker's Direct Build execute continuation completes its validated closed order including the one local commit
- **THEN** the coordinator runs that window's verify with `--allow-commit`, which resolves verdict `allowed`, and every other archive window runs without the flag

### Requirement: Direct Build backfill-artifact correction routing

The Direct Build execute continuation SHALL stop staging and commit on any CLI failure. When the failure is evaluated as a backfill-artifact error under the Direct Build supervision contract, the coordinator SHALL return the verbatim error for same-worker backfill correction and archive relaunch and SHALL keep the classified content-fix loop ordinary-route only. A repeated defect reported without progress after correction SHALL close as failed-retryable with the verbatim failure in view and no further automatic continuation. A failure after some mutation executed SHALL report the exact partial state and SHALL never refire any order onto the partially mutated world. A late continuation after success SHALL be rejected without mutation. Both repeated-defect and partial-mutation closures SHALL carry no finality and SHALL run new retries or changes only at explicit user request.

#### Scenario: Backfill-artifact CLI failure routes to correction

- **WHEN** the Direct Build archive CLI fails with a backfill-artifact error
- **THEN** the coordinator SHALL return the verbatim error for same-worker backfill correction and archive relaunch without staging or committing

