**Complexity**: high

## Why

`/sai-5-review` is the only report-producing pipeline phase that still combines user-facing lifecycle control with the full technical review, including broad diff analysis and working-tree mutation analysis. Splitting it into a thin coordinator and a routed review worker now establishes the same context boundary used by the other phase-worker paths without changing review findings, severity vocabulary, or the existing Pass 11 safety protocol.

## What Changes

- Add a terminal-only review coordinator that dispatches one review worker, validates closed lifecycle payloads, maintains the changed-files union, and prints the worker-authored completion summary verbatim, including the existing `## Recommended Audits` block.
- Add a review worker that owns prerequisites, two-positional argument parsing, change resolution, parent-branch detection, diff scoping, review passes 1–10, Pass 11 mutation analysis, `review.md` writing, and the worker summary.
- Add Claude Code and opencode review-worker bindings, including explicit authorization for read-only `budget-explorer` branches and sequential write-capable `budget-subagent` mutation branches.
- Register the new worker definition, forwarding skills, bindings, coordinator/invocation assets, and routed Claude/opencode wrappers with the installer while preserving the inline Copilot path.
- Preserve the current review instruction's review categories, severity vocabulary, diff scope, mutation safety rules, and single writable artifact boundary.

## Capabilities

### New Capabilities

- `review-phase-coordinator`: A terminal-only routed coordinator for the review lifecycle and worker-authored completion output.
- `review-phase-worker`: A complete technical review worker that produces and verifies `review.md`.
- `review-worker-bindings`: Claude Code and opencode bindings for review-worker dispatch, continuation, read-only research, and sequential mutation execution.
- `review-worker-installation`: Installer, agent, skill, wrapper, manifest, ownership, and cleanup support for the routed review worker.

### Modified Capabilities

- None.

## Impact

- `sai/commands/review/coordinator.md` and `sai/commands/review/invocation.md`.
- `sai/commands/sai-5-review.md` as the shared inline caller that remains the Copilot-facing command surface.
- `sai/orchestration/workers/sai-5-review-worker.md`.
- `sai/orchestration/workers/bindings/claude/review-worker.md`.
- `sai/orchestration/workers/bindings/opencode/review-worker.md`.
- `commands/claude/sai-5-review.md` and `commands/opencode/sai-5-review.md`.
- `agents/claude/sai-5-review-worker.md`.
- `skills/claude/sai-5-review-worker/SKILL.md` and `skills/opencode/sai-5-review-worker/SKILL.md`.
- `sai/install-manifest.json` and `bin/install-flow.js`.
- Review execution remains defined by `sai/instructions/review.md`; its categories and mutation-analysis behavior are not changed.
- `commands/copilot/sai-5-review.prompt.md` and `sai/orchestration/inline-invocation.md` remain out of scope and unchanged; the Copilot inline path continues to use the inline review instruction while the shared `sai/commands/sai-5-review.md` caller may consume the review invocation core without moving its lifecycle responsibilities.
- No new runtime or external dependency is introduced.

## Proposal Research Documentation

**Local files**: `sai/orchestration/coordinator-contract.md`; `sai/orchestration/worker-lifecycle.md`; `sai/commands/design/coordinator.md`; `sai/commands/design/invocation.md`; `sai/orchestration/workers/sai-2-design-worker.md`; `sai/orchestration/workers/bindings/claude/design-worker.md`; `sai/orchestration/workers/bindings/opencode/design-worker.md`; `sai/instructions/review.md`; `sai/commands/sai-5-review.md`; `commands/claude/sai-2-design.md`; `commands/opencode/sai-2-design.md`; `agents/claude/sai-2-design-worker.md`; `skills/claude/sai-2-design-worker/SKILL.md`; `skills/opencode/sai-2-design-worker/SKILL.md`; `commands/claude/sai-5-review.md`; `commands/opencode/sai-5-review.md`; `commands/copilot/sai-5-review.prompt.md`; `sai/orchestration/inline-invocation.md`; `bin/install-flow.js`; `sai/install-manifest.json`; `test/install-manifest.test.js`; `openspec/specs/mutation-analysis/spec.md`; `openspec/specs/design-coordinator/spec.md`; `openspec/specs/design-planning-worker/spec.md`; `openspec/specs/design-harness-bindings/spec.md`; `GLOSSARY.md`.

**External URLs**: None.

## Additional Notes

- The shared coordinator contract and worker lifecycle contract are reused unchanged.
- The coordinator is terminal-only: there is no review artifact-feedback iteration gate.
- The worker's only durable writable artifact is `openspec/changes/{change-name}/review.md`; Pass 11 may temporarily mutate only diff-scoped production files and must restore them using the existing file-scoped safety protocol.
- The worker reports the inferred parent branch in its terminal summary rather than extending the shared notice protocol.
- The review binding is intentionally the first routed worker binding to authorize a write-capable nested `budget-subagent` branch; existing phase bindings are unchanged.
