**Complexity**: medium (2 capabilities, 2 requirements, 5 affected files, no dependency)

## Why

The Claude Code `sai-3-implement` coordinator currently allocates more reasoning effort than its lifecycle-routing role requires, while its implementation-planning worker should retain greater capacity for technical analysis. Aligning these effort levels now keeps lightweight coordination separate from high-value implementation planning without changing model routing or phase behavior.

## What Changes

- Set the Claude Code `sai-3-implement` coordinator effort to `low`.
- Set the Claude Code `sai-3-implementation-worker` effort to `medium`.
- Align documentation and exact metadata assertions with the new effort levels.
- Preserve the existing model identifiers, worker name, lifecycle contracts, artifact paths, phase behavior, and `sai-2` model and effort settings.

## Capabilities

### New Capabilities

### Modified Capabilities

- `claude-model-routing`: update the effort metadata for the Claude Code `sai-3-implement` coordinator.
- `implementation-harness-bindings`: update the Claude Code implementation worker effort metadata.

## Impact

- `commands/claude/sai-3-implement.md` — coordinator frontmatter effort metadata.
- `agents/claude/sai-3-implementation-worker.md` — implementation worker frontmatter effort metadata.
- `test/implement-coordinator-worker.test.js` — exact coordinator and worker effort assertions.
- `test/implementation-harness-bindings-step-3.test.js` — exact coordinator effort assertion.
- `README.md` — implementation worker effort documentation.
- No model identifiers, worker contracts, lifecycle behavior, artifact paths, or `sai-2` settings are changed.

## Proposal Research Documentation

**Local files**: `commands/claude/sai-3-implement.md`, `agents/claude/sai-3-implementation-worker.md`, `openspec/specs/claude-model-routing/spec.md`, `openspec/specs/command-wrappers/spec.md`, `GLOSSARY.md`

**External URLs**: None

## Additional Notes

- The coordinator remains on `opus` and the worker remains on `claude-opus-4-8`.
- The renamed worker definition is `agents/claude/sai-3-implementation-worker.md` with frontmatter name `sai-3-implementation-worker`.
- The coordinator is the lightweight control plane; the worker is the high-value technical planning role.
