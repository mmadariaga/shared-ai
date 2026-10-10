> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

`/sai-review` read every token after the change name as part of the name, so `/sai-review my-change --full` failed: the segment envelopes carried only the change name, and only `--fast-track` was stripped. `/sai-7-performance` could also ask a question mid-run with no option controlling it. Review and audit commands now accept declared options, `/sai-review` forwards each segment only the options its command accepts, and every review and audit command runs unattended unless `--runtime` is passed.

## What Changes

- New `sai/commands/{review,security,performance,accessibility}/options.md` files each declare the options of one command. Each command's `coordinator.md` and `steps/common.md` load its file, and the coordinator forwards `arguments_value` unchanged.
  - Review: `--parent-branch`.
  - Security: `--full`, `--path`, `--parent-branch`.
  - Performance: `--full`, `--path`, `--tier`, `--runtime`, `--parent-branch`.
  - Accessibility: `--full`, `--path`, `--runtime`, `--parent-branch`.
- Review and audit workers parse `arguments_value` per `options.md`. The change name is optional. An unknown `--` option, an option missing its value, a second positional value, or (for performance) a `--tier` value outside the declared set returns `failed` before resolution and names the token.
- **BREAKING**: the parent branch is accepted only as `--parent-branch <branch>`. The positional form is retired, so `/sai-5-review my-change develop` now fails with a pointer to `--parent-branch`.
- `/sai-review` strips `--fast-track` as before, then splits the remaining tokens into the change name and options. It accepts exactly the union of the four declarations and stops before any dispatch on an option no declaration lists or on a missing value. With options and no name, the picker resolves the change and the options are kept.
- Each `/sai-review` segment envelope carries the change name plus only the options its own `options.md` declares, in the user's order. The review segment never receives `--full` or `--path`.
- With `--full` or `--path`, `/sai-review` skips the triage parse and the Error close and activates all three audits. An empty-diff review (`cancelled`) still ends the run with no audits.
- `/sai-review` reports one line for each option aimed only at a segment that did not run, stating that the option had no effect.
- Without `--runtime`, `/sai-7-performance` resolves `resolve-diagnostics` as skipped without asking. Review and security declare that they ask nothing between change resolution and their close.
- Claude Code and opencode wrappers for `/sai-review`, `/sai-5-review`, `/sai-6-security`, `/sai-7-performance`, and `/sai-8-accessibility` announce their options. The Claude Code `argument-hint` lines use `--parent-branch <branch>`. README and docs are updated to match.
- Tests: new `test/review-audit-options.test.js`; updated performance worker assertions; refreshed opencode projection fingerprint.

## Capabilities

### New Capabilities
- `audit-command-options`: one options declaration per review and audit command, `--parent-branch`-only parent branch, worker-side rejection of unknown or extra tokens, `--runtime`-gated mid-run questions, and wrapper announcements in both harnesses.

### Modified Capabilities
- `sai-review-command`: option recognition, rejection, and per-segment forwarding; envelopes carry options; failed or empty reviews and the final summary report unused options.
- `review-triage-parse`: no triage parse with `--full` or `--path`.
- `conditional-audit-activation`: `--full` or `--path` activates all three audits.
- `review-phase-worker`: argument parsing per `options.md`, with `--parent-branch` replacing the positional parent branch.
- `review-phase-coordinator`: the envelope scenario uses `--parent-branch`.
- `review-worker-installation`: the opencode wrapper preserves the `--parent-branch` option.
- `security-phase-worker`: argument contract per `options.md` with `--parent-branch`.
- `accessibility-phase-worker`: argument contract per `options.md` with `--parent-branch`; a static-only run asks nothing.
- `accessibility-phase-coordinator`: the preserved argument contract names `--parent-branch`.
- `performance-runtime-diagnostics`: `--runtime` is declared in `options.md`, and the gate is skipped without asking when it is absent.

## Impact

- New: `sai/commands/review/options.md`, `sai/commands/security/options.md`, `sai/commands/performance/options.md`, `sai/commands/accessibility/options.md`, `test/review-audit-options.test.js`.
- Modified: `sai/commands/meta-review/command-bootstrap.md`, `sai/commands/meta-review/coordinator.md`.
- Modified: `sai/commands/{review,security,performance,accessibility}/coordinator.md`, `worker.md`, and `steps/common.md`.
- Modified: `sai/commands/review/steps/establish-diff-scope.md`, `sai/commands/performance/steps/resolve-diagnostics.md`.
- Modified: `commands/claude/` and `commands/opencode/` versions of `sai-review.md`, `sai-5-review.md`, `sai-6-security.md`, `sai-7-performance.md`, and `sai-8-accessibility.md`.
- Modified: `README.md`, `docs/commands/sai-review.md`, `docs/commands/sai-5-review.md`, `docs/commands/sai-6-security.md`, `docs/commands/sai-7-performance.md`, `docs/commands/sai-8-accessibility.md`, `docs/on-demand-commands.md`, `docs/review-triage.md`, `docs/sequential-pipeline.md`.
- Modified: `test/performance-coordinator-worker.test.js`, `test/claude-default-preset-alignment.test.js`.
- Migration: a positional parent branch must be rewritten as `--parent-branch <branch>`.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Originating issue: https://github.com/mmadariaga/shared-ai/issues/66 (slice 2 of 4). Auditing the whole repository with no pending change is done by calling each audit command directly. Sibling #64 also touches the `/sai-7-performance` diagnostics gate.
