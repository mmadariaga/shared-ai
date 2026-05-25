## Why

`sai-4-apply` proposes commit messages without Conventional Commits format constraints (no type prefix, no ≤50-char subject, no faithfulness check) because the rules live only in `sai/instructions/commit.md` and are never loaded by `apply.md`. Extracting them into a shared instruction eliminates the divergence without altering either workflow.

## What Changes

- `sai/instructions/commit-rules.md` — **new file**: commit message format rules extracted verbatim from `commit.md` (subject, body, footer, hard rules, self-critique checklist).
- `sai/instructions/apply.md` — load `@sai/instructions/commit-rules.md` at the STOP & COMMIT point in the Git Operations section.
- `sai/instructions/commit.md` — replace inlined rule blocks with `Fetch @sai/instructions/commit-rules.md`.

## Capabilities

### New Capabilities

- `commit-rules`: Shared instruction file containing all commit message format rules — subject format (Conventional Commits, ≤50 chars, imperative mood), body wrap (72 chars), footer conventions, hard rules, and self-critique checklist. No workflow steps, no git inspection — rules only.

### Modified Capabilities

- `apply`: Git Operations section loads `@sai/instructions/commit-rules.md` before proposing commit messages at each STOP & COMMIT marker.
- `commit`: Inlined rule blocks replaced with `Fetch @sai/instructions/commit-rules.md`; Steps 1–6 workflow unchanged.

## Impact

- `sai/instructions/commit-rules.md` — new file (authoritative single source of truth)
- `sai/instructions/apply.md` — one-line addition in Git Operations section
- `sai/instructions/commit.md` — rule block sections replaced with fetch directive; no behavioral change to Steps 1–6
- No impact to project source code, CI, or other commands
