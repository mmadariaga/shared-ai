# legacy-orchestration-retirement Specification

## Purpose
TBD - created by archiving change retire-legacy-orchestration. Update Purpose after archive.

## Requirements

### Requirement: Utility commands enter their card directly

The Claude Code and opencode wrappers of `/sai-explore`, `/sai-retire-docs`, `/sai-status`, and `/sai-worktree` SHALL take the form of the goal-driven wrappers: the harness fetch skill, the clean-start line, the `Required capability profile` line, then one fetch of `sai/commands/{name}/body.md` that forwards the InvocationEnvelope block. They SHALL NOT fetch a boot adapter or a `command-bootstrap.md`. The explore wrappers SHALL keep their `Receipt:` line and their harness `idea-list-render.md` load before the body fetch. The `commit`, `archive`, and `backfill` wrappers SHALL keep their existing direct form. Claude Code and opencode SHALL stay in parity.

#### Scenario: A utility wrapper fetches its body directly

- **WHEN** `commands/claude/sai-status.md` or `commands/opencode/sai-status.md` is read
- **THEN** its body is the harness fetch skill, the clean-start line, the capability-profile line, `Fetch @sai/commands/status/body.md and follow it exactly, forwarding the InvocationEnvelope block below.`, and the envelope, with no boot adapter or `command-bootstrap.md` fetch

#### Scenario: The explore wrapper keeps its harness-specific load

- **WHEN** either harness's `sai-explore.md` wrapper is read
- **THEN** it carries the `Receipt:` line first, then the fetch skill, the clean-start line, the capability-profile line, the harness `idea-list-render.md` load, and the `sai/commands/explore/body.md` fetch

### Requirement: Utility cards carry the loads the boot adapter provided

The body cards `sai/commands/{explore,retire-docs,status,worktree}/body.md` SHALL each load, besides `sai/policies/verified-precondition-handback.md`, the shared `sai/policies/public-chat.md`; SHALL run, as their first step, the wrapper's capability-profile check through `sai/policies/tool-access.md`, so a missing required tool is reported as before; and SHALL fetch `sai/policies/obstacle-escalation.md` and close the stop with its § Escalate to the user when a run stops on an error or an unexpected condition. The explore card SHALL run its `prereqs.js` check right after the capability-profile check and before every remaining step. `/sai-retire-docs`, `/sai-status`, and `/sai-worktree` SHALL otherwise behave as before, reading the request from the wrapper's `arguments_value`.

#### Scenario: A utility card checks its capability profile first

- **WHEN** `sai/commands/worktree/body.md` is read
- **THEN** it fetches `sai/policies/public-chat.md`, names the `sai/policies/tool-access.md` capability-profile check as its first step, and fetches `sai/policies/obstacle-escalation.md` for a stop on an error or an unexpected condition

#### Scenario: Explore orders its prerequisite check after the capability check

- **WHEN** `sai/commands/explore/body.md` is read
- **THEN** the `prereqs.js` check runs right after the capability-profile check and before every remaining step

### Requirement: Legacy orchestration surfaces are deleted

The source tree SHALL NOT contain `sai/adapters/claude/boot.md`, `sai/adapters/opencode/boot.md`, `sai/orchestration/command-runner.md`, `sai/orchestration/worker-core.md`, `sai/orchestration/workers/bindings/claude/worker-template.md`, `sai/orchestration/workers/bindings/opencode/worker-template.md`, `sai/commands/{explore,retire-docs,status,worktree}/command-bootstrap.md`, `sai/policies/stop-options.md`, `sai/policies/bounded-recovery.md`, or `sai/policies/unattended-runtime-recovery.md`. No wrapper, card, binding, policy, or installer source SHALL reference a deleted file, apart from the retirement entries of `sai/install-manifest.json` that name its installed destination. A candidate surface that still has a consumer SHALL stay: `sai/policies/bounded-dispatch-retry.md`, `sai/policies/change-picker.md`, `sai/policies/todo-structure.md`, `sai/policies/verified-precondition-handback.md`, and the two `standalone-worker-template.md` binding templates.

#### Scenario: The retired files are absent

- **WHEN** the source tree is inspected
- **THEN** none of the deleted boot adapters, orchestration contracts, routed binding templates, utility command bootstraps, or recovery policies exists

#### Scenario: Surfaces with consumers stay

- **WHEN** the source tree is inspected
- **THEN** `bounded-dispatch-retry.md`, `change-picker.md`, `todo-structure.md`, `verified-precondition-handback.md`, and both `standalone-worker-template.md` files still exist

### Requirement: Recovery pointers name the obstacle policy

`sai/policies/implementation-closing-report.md`, `sai/policies/no-commit-guard.md`, and `sai/policies/bounded-dispatch-retry.md` SHALL reference `sai/policies/obstacle-escalation.md` where they referenced `stop-options.md`, `unattended-runtime-recovery.md`, or `bounded-recovery.md`. The Direct Build closing report SHALL keep the escalation decision as a separate prompt after Execution details, and worker-result failures outside a dispatch retry SHALL belong to the obstacle policy.

#### Scenario: The closing report defers to the obstacle policy

- **WHEN** `sai/policies/implementation-closing-report.md` is read
- **THEN** an unplanned stop names the required decision in Next step, and the escalation options of `sai/policies/obstacle-escalation.md` follow Execution details as a separate decision prompt

#### Scenario: Dispatch retry hands worker-result failures to the obstacle policy

- **WHEN** `sai/policies/bounded-dispatch-retry.md` is read
- **THEN** it states that worker-result failures belong to `sai/policies/obstacle-escalation.md` and names no deleted recovery policy

### Requirement: Retired files leave installs through retirement entries

The manifest SHALL project none of the deleted files and SHALL retain retirement entries with historical hashes for deleted installed command bootstraps, boot adapters, orchestration contracts, and recovery policies. Rendered, never-installed worker-template.md bindings SHALL need no retirement entry. Installation and project refresh SHALL delete every exact retired regular file or file symlink including edited copies without hash matching or migration. Directories and linked parent directories SHALL be skipped. Doctor SHALL remain read-only and guarded uninstall SHALL retain historical recognition and modified-file protection.

#### Scenario: An upgrade removes managed retired copies
- **WHEN** upgrade installation finds an unmodified retired file on either supported harness
- **THEN** it deletes the exact retired file without requiring a matching historical hash

#### Scenario: A customized retired copy stays
- **WHEN** upgrade installation finds a customized declared retired regular file
- **THEN** it deletes that exact file without migration; guarded uninstall remains the operation preserving unrecognized customized copies

#### Scenario: A fresh install carries no retired file
- **WHEN** a fresh install runs on Claude Code or opencode
- **THEN** none of the retired files is installed
