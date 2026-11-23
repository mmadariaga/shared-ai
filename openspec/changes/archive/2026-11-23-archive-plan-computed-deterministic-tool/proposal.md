> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The archive pre-flight of `/sai-archive` and of the Direct Build archive step ran as model turns in the archive worker, although it is a computation. In one measured Direct Build run the archive worker spent 19 requests and 83,530 input tokens on the read-only prepare stretch, against 9 requests and 6,596 input tokens on execute. A proof of concept also found two defects in the contract text: an implementer deletion that is already staged made `git add` fail, and on the no-specs route the pre-move draft destinations were listed as commit paths although they no longer exist after the move.

## What Changes

- New read-only tool `sai/tools/archive-plan.js` (`plan <change-name> --json --cwd <root>`, with optional `--implementer-paths-file`, `--implementer-path`, and `--drafts-dir`). It computes the archive plan: the CORE gate verdict and AUDIT line, the delta-sync summary, the retired capabilities and the retirement declaration verdict, the date-prefixed destination and its collision verdict, the affected main specs, the owned staging paths, the already staged deletions, the omitted ignored and absent paths, the covering paths, the commit body lines and closing line, and a `plan_fingerprint`. It refuses with a reason and a verbatim summary (`core-missing`, `collision`, `scenario-dropped`, `metadata-unreadable`, `comparison-incomplete`, `change-not-found`, `retire-veto`, `retire-unhonoured`, `retire-unaccounted-content`, `retire-metadata`). It spawns only `git` and `check-delta-headers.js`, reads `.openspec.yaml` with a minimal flat-key parser, and writes nothing. Exit 0 is a plan, 1 a refusal, 2 a usage or tooling error.
- `sai/commands/archive/instructions.md` becomes the description of the tool and its plan; `retirement-declaration.md` points to the tool as the single source of detection and preconditions, and unaccounted content now covers any `##` section other than Purpose and Requirements, above or below the requirements.
- `/sai-archive` coordinator runs the tool itself; no worker exists while the plan is computed. The report directory and guard window open only when a worker is about to be created. The `sai-archive-worker` is created only to author the commit message at the post-archive commit gate (`--archive-commit-message` envelope), and on the Direct Build route only to run the execute order.
- The post-archive commit gate stages the plan's `owned_staging_paths` and adds the plan's `commit_body_lines` and `closing_line`; the question, its options, and its wording are unchanged.
- The Direct Build coordinator card runs the tool at Step 7 with the implementer path set (and the drafts directory on the no-specs route), checks coverage on the plan's `covering_paths`, recomputes the plan right before the order, and creates the archive worker at Step 8. The execute order carries the change name, `plan_fingerprint`, the implementer paths, and on the no-specs route the drafts section; the worker recomputes the plan and rejects an order whose fingerprint differs.
- The two proof-of-concept defects are fixed: an already staged deletion is not added again and stays in the commit, and on the no-specs route the commit paths are the archived copies.
- `test/archive-plan.test.js` adds fixture tests that compare the plan with the real `openspec archive` and git (skipped without the `openspec` binary); several existing contract tests are updated to the new wording. `AGENTS.md` and `docs/commands/sai-archive.md` are updated.

## Capabilities

### New Capabilities

- `archive-plan-tool`: the deterministic, read-only archive plan tool, its plan fields, its refusals, and its fingerprint.

### Modified Capabilities

- `routed-archive-command`: the coordinator runs the plan tool; the archive worker no longer owns the pre-flight and only authors the commit message or runs the validated Direct Build order.
- `sai-archive-soft-warn-audits`: the classification, the AUDIT soft warning, and the delta comparison are computed and reported by the plan tool.
- `sai-archive-backfill-awareness`: the plan tool reads `backfilled` from `.openspec.yaml` before the CORE evaluation, and an unreadable `.openspec.yaml` refuses the plan.
- `archive-capability-emptying-delta-refusal`: detection of a capability-emptying delta happens in the plan tool.
- `archive-capability-retirement-declaration`: unaccounted content covers sections above or below the requirements.
- `sai-archive-commit-gate`: the gate stages the plan's owned staging paths, and the worker authors the message with the plan's fixed lines.
- `direct-build-commit-coverage`: the implementer path set goes to the plan tool, and coverage is checked on the plan's covering paths.
- `auto-fast-archive-execution`: the execute order binds the plan fingerprint, and the worker recomputes and validates the plan before any mutation.

## Impact

- New: `sai/tools/archive-plan.js`, `test/archive-plan.test.js`.
- Modified: `AGENTS.md`, `docs/commands/sai-archive.md`, `sai/commands/archive/archive-commit-gate.instructions.md`, `sai/commands/archive/coordinator.md`, `sai/commands/archive/instructions.md`, `sai/commands/archive/retirement-declaration.md`, `sai/commands/archive/worker.md`, `sai/commands/explore/direct-build-coordinator.md`, `test/archive-backfill-goal-driven.test.js`, `test/change-overview-contract.test.js`, `test/direct-build-archive-ordering.test.js`, `test/direct-build-goal-driven.test.js`, `test/direct-build-schema-writes.test.js`, `test/no-commit-guard-tool.test.js`, `test/no-specs-change.test.js`.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

The user declared that the issue has no drift from the current code without validating it.
