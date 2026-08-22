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

The archive coordinator SHALL declare the minimal phase-adapter field set: `original_envelope` is the opaque single-string fast-track-cleaned request; `dispatch_operation` dispatches exactly one `sai-archive-worker` through the active archive-worker binding using that envelope with the resolved change name as `arguments_value`; `continuation_operation` continues the same worker forwarding the selected answer value or the post-sync verification request; `allowed_nonterminal_extensions` is none. The coordinator SHALL parse the `--fast-track` token from `arguments_value` itself before resolution — printing exactly one `> FAST-TRACK MODE ACTIVE` banner, removing the token, and using the cleaned remainder downstream — and SHALL declare the resulting boolean as `fast_track_active` alongside the envelope as coordinator-owned session state, never as an additional envelope key. The adapter SHALL declare NO `progress_plan` — no progress event exists in this lifecycle, no panel plan renders, and no acknowledgement literal is defined — and NO `recovery_policy`: the coordinator SHALL NOT fetch `@sai/policies/bounded-recovery.md`, keep no recovery ledger, and perform no recovery continuations. A replacement worker SHALL reconstruct only from the complete original envelope, the opaque input history (including forwarded gate answers), the resolved change name, `fast_track_active`, and the ordered duplicate-free changed-files union.

#### Scenario: An archive run carries no progress or recovery machinery

- **WHEN** the archive coordinator card is read
- **THEN** it declares no `progress_plan`, defines no progress event or acknowledgement literal, declares no `recovery_policy`, and never fetches the bounded-recovery policy

#### Scenario: Fast-track survives only as session state

- **WHEN** `/sai-archive {name} --fast-track` dispatches its worker
- **THEN** the envelope carries the cleaned request without the token, `fast_track_active` travels as declared session state rather than an envelope key, and the banner printed at run start is exactly one line

### Requirement: Worker owns the read-only pre-flight and never mutates

The dispatched `sai-archive-worker` SHALL perform the entire read-only technical pre-flight of `sai/commands/archive/instructions.md`: the Classification Check (`openspec status --change --json`, the `.openspec.yaml` `backfilled` resolution rules, the CORE/AUDIT/EXEMPT grouping), the Completion Check scan enumerating every unchecked `- [ ]` with its `implementation.md:{line}` location, enclosing `#### Step N` heading, and checkbox text, the missing-main-spec delta assessment diffing every delta spec against its main spec into a combined summary, and the target-name collision check against `openspec/changes/archive/YYYY-MM-DD-{name}/`. All findings SHALL return as payload content inside terminal summaries for verbatim coordinator presentation, preserving the instruction's stop texts exactly — including the CORE-missing hard stop "Missing CORE artifact(s): …. Archive blocked." with no accompanying AUDIT soft warning. The worker SHALL NEVER move a directory, write any file outside its reporting duties (no main-spec sync writes, no `.openspec.yaml` keys, no artifact edits), or run any git command.

#### Scenario: Pre-flight findings arrive as payloads

- **WHEN** an archive worker completes its classification, checkbox scan, delta-sync assessment, and collision check
- **THEN** every finding — informational AUDIT line, unchecked-item list, combined delta-sync summary, collision verdict — reaches the coordinator as payload content and no file was written and no directory moved by the worker session

#### Scenario: The CORE-missing hard stop keeps its exact text

- **WHEN** any CORE artifact of the resolved change is not `done`
- **THEN** the worker returns a terminal payload whose summary is exactly "Missing CORE artifact(s): <ids>. Archive blocked." and no AUDIT soft warning accompanies it

### Requirement: Needs-input gate transport and coordinator-only execution

The two pre-mutation decisions SHALL be returned by the worker as `needs_input` lifecycle results — first the unchecked-items gate ("Continue archiving with N unchecked items?" with options `yes (Recommended)` / `no`, skipped entirely when `implementation.md` does not exist), then the delta-spec sync gate with its branch's exact option set (`Sync now (recommended)` / `Archive without syncing`; `Sync now (recommended — creates new main spec)` / `Archive without syncing`; or `Archive now` / `Sync anyway` / `Cancel`). The coordinator SHALL present each exact question and option set through the native option-picker, append only `{question, options, answer_value}` to the opaque input history, and forward the answer value verbatim to the same worker. Under `fast_track_active` the documented auto-proceed branches apply unchanged: the unchecked-items gate auto-proceeds as if `yes`, the changes-needed sync gate auto-selects **Sync now** if and only if the change is low-risk-by-construction (applied `- [x]` or `backfilled=true`), and the already-synced gate auto-selects **Archive now**; these are the only silent paths. Only the coordinator SHALL execute mutations, in order after the gates resolve: the delta-spec sync writes (upstream skill step 4 inline, halting before any write on failure, then resuming the same worker whose re-run comparison must confirm every capability synced before anything moves), the archive directory move into `openspec/changes/archive/YYYY-MM-DD-{name}/` guarded by the collision error and never stacking a second date prefix, and the post-archive commit gate applied exactly per `sai/commands/archive/archive-commit-gate.instructions.md`. Terminal navigation SHALL print the worker-authored summary verbatim on every closure and SHALL close with exactly `Archive done.` only when the move executed.

#### Scenario: A gate answer travels through the coordinator untouched

- **WHEN** the user selects an option at either pre-mutation gate
- **THEN** the coordinator forwards the selected value verbatim through the binding continuation and executes no mutation until the gates authorize archiving

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

The split of today's technical content SHALL be fixed and single-sourced: `sai/commands/archive/instructions.md` belongs to the WORKER as read-only verification, completeness, and diffing procedure plus the authoring of the two pre-mutation gate questions, with a routed-ownership header documenting the transport mapping (print → payload summary carried verbatim; ask/offer → `needs_input` result; conditionals → forwarded answer values; every mutation → coordinator-side); the upstream `openspec-archive-change` skill's mutating steps (the sync write, the step-5 archive move, the completion summary) and `sai/commands/archive/archive-commit-gate.instructions.md` belong to the COORDINATOR exclusively. Neither card SHALL perform the other's half.

#### Scenario: Each technical duty lives in exactly one card

- **WHEN** the archive card set is audited after the change
- **THEN** every check, scan, and gate question traces to the worker's instruction load and every sync write, directory move, and git operation traces to the coordinator card
