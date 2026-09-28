> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Every progress event under a `step_machine` coordinator cost the expensive coordinator three tool calls: validate the payload (`sai/orchestration/command-runner.md` § Validation), emit the machine event (`sai/policies/stage-machine.md` § Step machines), and continue the worker. The first two are now fused into one `sai-state emit … --progress` invocation. It validates the worker's progress payload through the same validator module and only then advances the machine. That saves one call per progress event, with no semantic change to verdicts, the `validated_at` clock, machine transitions, or meta-review ordering. The per-run savings figure is a card-derived estimate that was deliberately not measured.

## What Changes

- `sai/tools/worker-report-validator.js` extracts a pure exported `validateText(text, kind)` verdict builder (JSON parse, `validatePayload`, `generateValidatedAt`). The `validate` CLI now delegates to it with unchanged output and exit codes, so the verdict shape and the only clock stay single-sourced.
- `bin/sai-state.js` adds progress mode, `emit <id> <machineId> --progress [--with-overview true|false] -`:
  - It loads the validator module lazily from two fixed candidates relative to its own file: `../tools/` for the installed layout and `../sai/tools/` for the source layout. If neither exists, it exits 2 naming the tried paths.
  - It validates the raw stdin text before any session, machine or registry read.
  - It derives the machine event `{"step_ids": [...]}` from the valid payload.
  - It always returns an object carrying `validation`, plus the ordinary emit fields when the verdict is valid. Exit 1 covers both an invalid verdict and a machine error.
  - `--with-overview` is accepted only on `design-standalone@1`.
  - `--progress` is parsed as a boolean flag, so the trailing `-` stays positional.
- Event emits without `--progress` keep their shape, order and exit codes. The shared transition logic moved into an internal `runEmit` core.
- Prose updated, identically for Claude Code and opencode:
  - `sai/orchestration/command-runner.md`: § Validation gains the step_machine progress exception, validator resolution is scoped to turns that run a separate `validate` call, and "validator module" replaces "validator". § Result kinds and § Step-gated pointer delivery are updated to match.
  - `sai/policies/stage-machine.md`: § Verbs gains the progress emit; § Step machines item 2 pipes the payload instead of hand-composing event JSON; a store-failure note is added.
  - `sai/policies/tool-resolution.md` § Invocation.
  - `sai/commands/design/phase-contract.md` § Variant initialization now uses the `--with-overview` option.
  - `sai/policies/todo-structure.md`: the stamp source is `validation.validated_at`, and zone handling lives in the validator module.
  - The `sai/tools/` row in `AGENTS.md`.
- `sai/policies/tool-execution-permissions.md` documents the progress emit form under the existing `sai-state` entries. No `allowed-tools` entry is added or removed on Claude Code, and opencode gains no permission field.
- New `test/sai-state-progress-emit.test.js` spawns `node bin/sai-state.js` as a real process. It covers: the valid route; shape-invalid and non-JSON payloads; BOM and whitespace verdict parity with `validate --kind progress`; validation before store reads; SESSION_FILE_CORRUPT and VERSION_MISMATCH with the verdict intact; an invalid payload on a wrong machine id; a missing validator module; installed-layout resolution; `--with-overview` seeding and misuse; empty `step_ids`; non-progress kinds; and unchanged plain emit.

## Capabilities

### New Capabilities

- `step-machine-progress-emit`: one `sai-state emit … --progress` invocation validates a worker progress payload through the validator module and advances the step machine. Coordinators with a `step_machine` (spec, design, implement, review, security, performance, accessibility; standalone, explore-supervised, `/sai-build` and `/sai-review` runs) use it on Claude Code and opencode alike.

### Modified Capabilities

- `orchestration-core`: step_machine progress payloads are validated inside the progress emit rather than by a separate `validate --kind progress` call.
- `validator-tool-paths`: per-turn validator resolution applies to turns that run a separate `validate` call. The progress emit loads the validator itself.
- `stage-machine-emit-delivery`: the progress emit is the one additional documented emit form.
- `stage-machine-cli-interface`: `emit` gains progress mode, with its own stdin, usage, verdict and output contract. Event emits are unchanged.
- `review-standalone-loading`, `security-standalone-loading`, `performance-standalone-loading`, `accessibility-standalone-loading`, `implement-standalone-loading`: the minimal emit wire still carries only stage and next. A step-machine progress emit additionally carries its `validation` verdict block.

## Impact

- Modified: `bin/sai-state.js`, `sai/tools/worker-report-validator.js`, `sai/orchestration/command-runner.md`, `sai/policies/stage-machine.md`, `sai/policies/tool-resolution.md`, `sai/policies/tool-execution-permissions.md`, `sai/policies/todo-structure.md`, `sai/commands/design/phase-contract.md`, `AGENTS.md`.
- New: `test/sai-state-progress-emit.test.js`.
- Unchanged by design:
  - `worker-report-validator.js validate --kind <kind>` still validates terminal, notice, `needs_input` and `conflict_detected` results, and progress under adapters without a `step_machine`.
  - Plain `emit` for `explore-idea`, `explore-slice`, `apply-standalone` and `recovery-ledger`, and step-machine reset.
  - Meta-review order: security → performance → accessibility.
  - Every wrapper `allowed-tools` list.
- Deferred, out of this change: deduplicating `sai/commands/explore/steps/pipeline-plan-unattended.md`, and the pre-existing Explore "exactly two tools" allow-list drift in `sai/policies/tool-execution-permissions.md`.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Deferred slice 2, outside this change: deduplicate `sai/commands/explore/steps/pipeline-plan-unattended.md` (48,839 bytes, measured with `wc`). Stating the five named repeated meanings once saves only about 2–3 KB (about 500–750 tokens), not the 4–5k tokens estimated beforehand. Undecided: whether to widen that slice to the spec-vs-design section mirroring (around L46-53 vs L102-106), which is unmeasured. The user asked to be reminded of it once this change is implemented.

Pre-existing drift noticed, outside this change: `sai/policies/tool-execution-permissions.md` says the Explore wrapper permits "exactly two tools", while `commands/claude/sai-explore.md` grants the whole `node .claude/sai:*` / `node ~/.claude/sai:*` prefixes.
