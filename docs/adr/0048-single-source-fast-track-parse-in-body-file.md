# ADR 0048: Single-source the `--fast-track` parse in each command's body file

## Status

Accepted

## Context

Three SAI commands (`sai-explore`, `sai-2-design`, `sai-4-apply`) need to accept a `--fast-track` token. The token could be parsed in the per-harness wrappers (9 files), in the shared body files (3 files), or inside each gate instruction. Parsing location determines how many copies of the logic exist and how tightly the flag semantics are bound to the gate implementations.

## Decision

Each of the three body files (`sai/commands/sai-explore.md`, `sai-2-design.md`, `sai-4-apply.md`) carries its own parse-strip-banner block immediately after the `**User's request:** $ARGUMENTS` line. The block detects `--fast-track` anywhere in `$ARGUMENTS`, sets an in-conversation fast-track signal, strips the token, prints `> FAST-TRACK MODE ACTIVE`, and passes the cleaned remainder onward.

## Alternatives Considered

- **Parse in each per-harness wrapper** — rejected: triples the logic across 9 files and invites drift; violates single-source discipline.
- **Parse inside each gate instruction** — rejected: the token would survive through the change-picker as change-name noise, and each instruction would re-implement stripping.

## Consequences

- Identical behavior across Claude Code, opencode, and GitHub Copilot without wrapper-level duplication.
- One parse block per command body; the three body files are independent and each carries its own block.
- Any future change to flag semantics edits at most three files.

## Related

- `openspec/changes/add-fast-track-flag/design.md` — Decision D1
- `openspec/changes/add-fast-track-flag/specs/sai-fast-track-flag/spec.md` — parse/strip/banner requirement
