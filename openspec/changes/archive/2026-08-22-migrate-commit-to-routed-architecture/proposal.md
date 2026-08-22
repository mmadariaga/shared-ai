> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

`sai-commit` was the last command still shipped in the legacy utility shape: a single `body.md` executed entirely in the main session, with the destructive `git commit` surface and the cheap message-authoring work fused in one context. Every other pipeline phase already delegates technical work to a budget-routed managed worker while the coordinator keeps lifecycle routing and human gates. Commit's git mutation is exactly the kind of destructive surface the routed architecture isolates in the coordinator, and message authoring is exactly the kind of mechanical work a haiku-tier worker should absorb. Migrating it removes the last special case from both boot adapters' routing tables and gives `sai-commit` the same closed lifecycle payloads, changed-files union, and reconstruction fields every other command carries.

## What Changes

- New `sai/commands/commit/coordinator.md`: minimal-lifecycle commit phase adapter — `original_envelope` is exactly the opaque single-string `arguments_value`; dispatches exactly one `sai-commit-worker` through the `commit-worker.md` binding; declares NO `progress_plan` (no progress events, no panel plan, no acknowledgement literal) and NO `recovery_policy` (no bounded-recovery fetch or ledger); restates the openspec prerequisite exemption; presents worker `needs_input` results through the native picker and forwards answer values verbatim; alone executes the authorized git mutation (`git commit -m`/`--amend` HEREDOC form) after a `yes` / active-session-grant answer; terminal navigation prints the worker-authored summary verbatim and closes with exactly `Commit done.` only on an executed commit.
- New `sai/commands/commit/worker.md`: loads worker-core plus the reworked `instructions.md`; performs the whole staged-message procedure (staged-state inspection, repo-style detection, classification, scope inference, composition, faithfulness verification, structured pre-commit file report) and returns it as payload content inside the terminal `summary`; returns the authorization ask as a `needs_input` result; NEVER executes any git mutation.
- `sai/commands/commit/instructions.md` reworked: Step 6's ask becomes a returned `needs_input` lifecycle result instead of an inline picker call; execution steps moved to the coordinator; the session-grant boundary sentence replaced by a citation of `## Authorization Scope` in `commit-rules.md`. Steps 1–5, stop texts, faithfulness rule, report blocks, and the off-by-default detected-style notice are preserved.
- `sai/commands/commit/body.md` DELETED; `sai/commands/commit/launcher.md` gains the binding fetch (`Fetch @sai/orchestration/workers/bindings/commit-worker.md and use it.`).
- Worker registration end-to-end: `bin/worker-matrix.js` gains the `commit` phase (ten matrix entries, identity regex admits `sai-commit-worker`), `bin/install-manifest.js` and `sai/install-manifest.json` declare claude+opencode managed-agent projections for `sai-commit-worker`, `bin/install-flow.js` roster/binding validators accept ten workers (was nine), and both `sai/adapters/claude/boot.md` and `sai/adapters/opencode/boot.md` move `commit` from the utility-name list to the routed-name list.
- Shared policy: `sai/policies/commit-rules.md` gains `## Authorization Scope`, the single source of the session-grant exclusion list (covers exactly `git add` + `git commit` at granted gates, in-memory only, never push/force/branch/rebase/merge/tag/`gh pr`, narrower where the consuming contract stages nothing); `sai/commands/apply/invocation.md` now cites that section instead of duplicating the exclusion sentence.
- Tests: 20 files updated — matrix nine→ten entries, doctor inventories, install/uninstall coverage, launcher directive assertions plus fixture, verified-precondition-handback loader map 28→29 cards. Docs: AGENTS.md (new "Commit coordinator and worker" section, utilities lists updated, prereqs-exemption wording preserved and extended) and README.md.
- Incidental fix: `bin/orchestration-source-audit.js` skips transient parallel-binding-validation `.tmp` scratch files (pre-existing flake).
- Full suite green after the change: 1185 pass / 0 fail.

## Capabilities

### New Capabilities

- `routed-commit-command`: the routed coordinator/worker architecture for `/sai-commit` — minimal lifecycle adapter, worker-owned authoring with an absolute git-mutation prohibition, needs_input authorization transport with coordinator-only execution, the openspec prerequisite exemption carried in the routed cards, end-to-end worker registration, and the single-sourced session-grant scope.

### Modified Capabilities

- `commit`: the sai-commit workflow requirements are re-homed from the retired monolithic `commit.md` body onto the routed card set — rules still load via fetch directives, detection stays inline within the dispatched worker session, notice stays off by default, and stop texts plus the faithfulness rule are unchanged.
- `commit-report-alignment`: the structured pre-commit file report keeps its exact block order, WARN semantics, and exclusions, but is authored by the worker as payload content and presented verbatim by the coordinator instead of printed inline by a monolithic body.
- `apply-red-green-worker-model`: the installer's binding-derived roster and validator surfaces now accept ten managed workers instead of nine, admitting `sai-commit-worker`.

## Impact

New: `sai/commands/commit/coordinator.md`, `sai/commands/commit/worker.md`. Deleted: `sai/commands/commit/body.md`. Modified: `sai/commands/commit/instructions.md`, `sai/commands/commit/launcher.md`, `sai/adapters/claude/boot.md`, `sai/adapters/opencode/boot.md`, `sai/policies/commit-rules.md`, `sai/commands/apply/invocation.md`, `sai/install-manifest.json`, `bin/worker-matrix.js`, `bin/install-manifest.js`, `bin/install-flow.js`, `bin/orchestration-source-audit.js`, `AGENTS.md`, `README.md`, `fixtures/thin-command-wrappers-baseline.json`, and 20 test files under `test/`. Baseline specs synced: `openspec/specs/{routed-commit-command,commit,commit-report-alignment,apply-red-green-worker-model}/spec.md`.

Evidence-backed boundaries preserved deliberately: the openspec prerequisite exemption is unchanged in meaning — `sai-commit` and `/sai-worktree` remain the only commands that work without OpenSpec — and the exemption is now restated inside the commit coordinator card itself. The authorization option set (`yes (Recommended)` / `no` / `Allow on this session`) and its yes-only execute semantics are byte-preserved; only the transport moved (worker-authored `needs_input` presented by the coordinator). Staging remains forbidden in this command on both sides of the split. The archive commit gate's reference to `sai/commands/commit/instructions.md` steps 1–5 remains valid.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
