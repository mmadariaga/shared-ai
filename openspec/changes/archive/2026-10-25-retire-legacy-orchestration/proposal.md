> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

After the earlier slices of #237 (#253, #254, #255), the harness boot adapters and `sai/orchestration/command-runner.md` survived only as the entry point of four commands (`/sai-explore`, `/sai-retire-docs`, `/sai-status`, `/sai-worktree`). `sai/orchestration/worker-core.md`, the routed `worker-template.md` binding templates, and the three legacy recovery policies (`stop-options.md`, `bounded-recovery.md`, `unattended-runtime-recovery.md`) remained as dead or near-dead prompt surface. This change moves the last four wrappers onto direct card entry, deletes every legacy orchestration surface left without a consumer, and retires those files from installed roots.

## What Changes

- The Claude Code and opencode wrappers of `/sai-explore`, `/sai-retire-docs`, `/sai-status`, and `/sai-worktree` now load the harness fetch skill, carry the clean-start line and the capability profile, and fetch `sai/commands/{name}/body.md` directly. The explore wrappers keep their `idea-list-render.md` load and `Receipt:` line, and the Claude explore `argument-hint` no longer advertises `--fast-track`.
- The four body cards load for themselves what the boot adapter provided: `sai/policies/public-chat.md`, a first-step capability-profile check through `sai/policies/tool-access.md`, and `sai/policies/obstacle-escalation.md` when a run stops on an error or an unexpected condition. The explore prerequisite check runs right after the capability-profile check and before every remaining step.
- Deleted: `sai/adapters/{claude,opencode}/boot.md`, `sai/orchestration/command-runner.md`, `sai/orchestration/worker-core.md`, `sai/orchestration/workers/bindings/{claude,opencode}/worker-template.md`, `sai/commands/{explore,retire-docs,status,worktree}/command-bootstrap.md`, and `sai/policies/{stop-options,bounded-recovery,unattended-runtime-recovery}.md`.
- `sai/policies/implementation-closing-report.md`, `sai/policies/no-commit-guard.md`, and `sai/policies/bounded-dispatch-retry.md` point at `sai/policies/obstacle-escalation.md` instead of the deleted recovery policies; the no-commit guard's hand-off isolation becomes "Recovery worker isolation" for a new worker created for an obstacle. `change-picker.md`, `status-picker.md`, `stage-machine.md`, and `todo-structure.md` no longer cite the boot envelope or the command runner.
- `bin/worker-matrix.js` drops `STANDALONE_PHASES` and the routed-binding branch: every matrix binding renders from `standalone-worker-template.md`. `bin/install-manifest.js` and `sai/install-manifest.json` drop the `claudeBinding` and `opencodeBinding` templates.
- `sai/install-manifest.json` removes the boot-adapter, command-runner, and worker-core projections and adds retirement entries with managed hashes for every deleted installed file, per harness. The installer code that removes retired files is unchanged.
- `/sai-explore` strips `--fast-track` silently: no banner, no fast-track state, and no behavioral effect. The fast-track skips in the explore steps (artifact-review and crystallization language gates, the overview-language resolution to `None`) are removed, and `sai/policies/fast-track-flag.md`, `README.md`, and the docs describe the token as accepted and ignored.
- `AGENTS.md` rows and conventions that named a deleted file are removed or retargeted; tests that covered deleted surfaces are updated or removed, and `test/retire-legacy-orchestration.test.js` covers the retirement.

## Capabilities

### New Capabilities

- `legacy-orchestration-retirement`: direct card entry for the remaining utility commands, the loads their cards now carry, the absence of the legacy orchestration files, and their install retirement.

### Modified Capabilities

- `command-runner-layout`, `bounded-recovery-policy-home`, `unattended-resilience-rule`, `command-launcher-card`, `unplanned-stop-options`, `bounded-worker-recovery`, `orchestration-core`, `coordinator-protocol-single-source`, `explore-preload`, `cosmetic-doc-consistency`, `sai-build-registration`: requirements that describe the deleted boot adapters, command runner, worker core, command bootstraps, or recovery policies are removed or rewritten; `bounded-recovery-policy-home`, `bounded-worker-recovery`, `unattended-resilience-rule`, and `command-launcher-card` retire entirely.
- `command-wrapper-body`, `thin-wrappers`, `command-wrappers`, `wrapper-fetch-paths`, `source-layout`, `design-phase-navigation`, `worktree-command-distribution`: wrapper shape and isolation now describe the direct card entry and the wrapper's clean-start line.
- `worker-matrix-collapse`, `dispatch-safety-invariant`, `normative-capability-spec-citations`, `explore-idea-list`: the single standalone binding template replaces `STANDALONE_PHASES` and the routed `worker-template.md`.
- `no-commit-guard`, `auto-fast-archive-execution`, `auto-fast-backfill-execution`, `explore-pipeline-supervision`, `verified-precondition-handback`, `worker-input-authority`, `backfill-draft-transport`, `spec-proposal-worker`, `design-planning-worker`, `startup-handshake`, `step-pointer-task-disclosure`, `spec-steps-library`, `worker-failure-classification`: rules that lived in or pointed at a deleted file now name their current home, or are removed when no surviving file states them.
- `sai-fast-track-flag`, `crystallization-close`, `explore-crystallization-language-gate`, `explore-edge-case-gate`, `explore-overview-language-gate`, `explore-route-close`, `review-loop-navigation`: `/sai-explore` no longer takes part in fast-track.

## Impact

- New: `test/retire-legacy-orchestration.test.js`.
- Modified: `AGENTS.md`, `README.md`, `bin/install-manifest.js`, `bin/worker-matrix.js`, `commands/{claude,opencode}/sai-{explore,retire-docs,status,worktree}.md`, `docs/commands/sai-explore.md`, `docs/on-demand-commands.md`, `docs/project-settings.md`, `docs/sequential-pipeline.md`, `fixtures/thin-command-wrappers-baseline.json`, `sai/commands/{explore,retire-docs,status,worktree}/body.md`, `sai/commands/explore/steps/*.md` (12 step files), `sai/install-manifest.json`, `sai/policies/{bounded-dispatch-retry,change-picker,fast-track-flag,implementation-closing-report,no-commit-guard,stage-machine,status-picker,todo-structure}.md`, and the test files that referenced a deleted surface.
- Deleted: `sai/adapters/{claude,opencode}/boot.md`, `sai/commands/{explore,retire-docs,status,worktree}/command-bootstrap.md`, `sai/orchestration/command-runner.md`, `sai/orchestration/worker-core.md`, `sai/orchestration/workers/bindings/{claude,opencode}/worker-template.md`, `sai/policies/{stop-options,bounded-recovery,unattended-runtime-recovery}.md`, `test/bounded-worker-recovery.test.js`, `test/stop-options.test.js`, `test/unattended-runtime-recovery.test.js`.
- Limitations: users who pass `--fast-track` to `/sai-explore` no longer see the activation banner or any skipped gate; every retired file needs its own retirement entry with hashes, which grows `sai/install-manifest.json`.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Slice 4 of #237 (https://github.com/mmadariaga/shared-ai/issues/237); slices 1-3 (#253, #254, #255) are committed and archived on this branch, so the original dependency on `goal-driven-direct-build` is already satisfied. The published specs that describe the deleted surfaces (`command-runner-layout`, `bounded-worker-recovery`, `unattended-resilience-rule`, and about 15 others that cite `command-runner.md` or `worker-core.md`) need retiring or updating by backfill; its conflict report deserves a careful review.
