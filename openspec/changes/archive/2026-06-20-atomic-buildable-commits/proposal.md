## Why

When sai-2-design plans `tasks.md` steps, each step implicitly maps to a commit. There is currently no rule preventing a step from containing a partial change — e.g. a signature rename without updating all callers — leaving the repo in a non-building state at that commit point. This breaks `git bisect`, per-commit CI, and clean reverts.

## What Changes

- `~/.claude/sai/instructions/design.md`: Add a commit-atomicity constraint to the `tasks.md` generation section.
- Steps that change a function signature, remove an exported API, or alter a contract must group all affected callers and consumers into the same step.
- Steps must not use lint as a substitute for a full typecheck/build check when verifying a commit boundary.

## Capabilities

### New Capabilities

- `atomic-commit-planning`: Rule set enforced by sai-2-design when generating `tasks.md` — every planned step must leave the repository in a state that compiles, typechecks, and builds on its own.

### Modified Capabilities

<!-- none -->

## Impact

- `~/.claude/sai/instructions/design.md` — the `tasks.md` generation section gains new invariants for commit boundary planning.
- `~/.claude/sai/instructions/commit-rules.md` — no change; that file governs commit message formatting, not commit content integrity.
- No production source code, configuration, or other project files are affected.

## Proposal Research Documentation

**Local files**:
- `~/.claude/sai/commands/sai-2-design.md`
- `~/.claude/sai/instructions/design.md`
- `~/.claude/sai/instructions/commit-rules.md`

**External URLs**: None

## Additional Notes

- `commit-rules.md` is entirely about message format (Conventional Commits, subject length, body rules). It says nothing about what may or may not be grouped into a single commit. The new rule lives in `design.md`, not `commit-rules.md`.
- The primary check a step must satisfy before being a commit point: "could someone run the full typecheck/build against exactly the files listed under Files Affected for this step and pass?" If no, the step is not a valid commit boundary.
- Linters (Biome, ESLint) do not typecheck across files; they must not be cited as evidence that a commit boundary is safe.
