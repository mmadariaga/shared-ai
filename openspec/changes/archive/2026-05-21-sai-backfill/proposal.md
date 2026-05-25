## Why

Small features and quick fixes frequently skip the full OpenSpec flow to avoid friction — a conscious trade-off that leaves gaps: no recorded intent, no AI context for future sessions, and `openspec/specs/` entries that no longer reflect what was actually built. `/sai-backfill` recovers the most important post-commit value (forensics, AI continuity, and spec accuracy) with minimal overhead, without blocking the original development flow.

## What Changes

- New command file: `sai/commands/sai-backfill.md`
- New instruction file: `sai/instructions/backfill.md`
- New Claude skill: `.claude/skills/sai-backfill/SKILL.md`
- `sai-command-naming` spec updated: `sai-backfill` registered as auxiliary command alongside `sai-commit`, `sai-explore`, `sai-archive`, and `sai-pr`

## Capabilities

### New Capabilities

- `backfill-diff-selection`: At invocation, the command presents three mutually exclusive options for selecting the diff to analyze: (1) a specific commit SHA as the base (`<sha>..HEAD`), (2) currently staged changes, (3) currently unstaged/untracked changes. The user selects which applies before any other step proceeds.
- `backfill-interview`: Immediately after reading the diff, the command always asks exactly two fixed questions regardless of diff content — "What problem does this solve?" and "What are the known limitations or technical debt left behind?" — then optionally asks targeted follow-up questions generated from the diff itself when the AI encounters genuine gaps it cannot spec without more information.
- `backfill-conflict-detection`: Before writing any output, the command scans `openspec/specs/` for specs that overlap with or are affected by the changes in the diff. Detected conflicts are surfaced to the user with a description of what would change and why. The user then decides to proceed or abort; the command never silently overwrites existing specs.
- `backfill-proposal-artifact`: Generates a `proposal.md` inside `openspec/changes/{name}/` based on the diff and interview answers. The file carries a mandatory, prominent post-hoc marker — not a footnote — that makes immediately clear to any future reader that this proposal describes a decision already made, not one being proposed.
- `backfill-spec-artifact`: Creates or updates the relevant capability specs in `openspec/specs/` to accurately describe the actual implemented behavior. These specs reflect what was built, not an idealized or intended version.

### Modified Capabilities

- `sai-command-naming`: `sai-backfill` added as auxiliary command (no sequence number, like `sai-commit`, `sai-explore`, `sai-archive`, `sai-pr`).

## Impact

- **New files**: `sai/commands/sai-backfill.md`, `sai/instructions/backfill.md`, `.claude/skills/sai-backfill/SKILL.md`
- **Reads**: git diff output (via bash), `openspec/specs/` (conflict scan)
- **Writes**: `openspec/changes/{name}/proposal.md`, `openspec/specs/{capability}/spec.md` (create or update)
- **Out of scope**: `design.md`, `tasks.md`, `implementation.md` — implementation is already done; reconstructed design rationale creates false confidence. `/sai-5-review` and `/sai-6-security` are separate concerns.
- **No breaking changes**
