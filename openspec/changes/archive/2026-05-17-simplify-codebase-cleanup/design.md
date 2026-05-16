## Context

The repo currently supports three harnesses (Claude Code, OpenCode, GitHub Copilot) and carries multiple generations of spec instructions. The active pipeline only uses Claude Code + OpenCode with `spec.propose.md`. Copilot wrappers, legacy `spec.common.md` chain, model-variant spec wrappers, and a Chinese remember translation remain but serve no current workflow.

## Goals / Non-Goals

**Goals:**
- Eliminate all Copilot harness assets and references.
- Delete legacy spec instruction chain (`spec.common.md`, `spec.claude.md`, `spec.opencode.md`).
- Remove `instructions/remember.chinese.md`.
- Collapse opencode `sai-1-spec` to a single canonical wrapper (drop gemini/gpt/opus variants).
- Keep documentation in sync: `README.md`, `AGENTS.md`, `INSTALL.*` reflect the new surface area.

**Non-Goals:**
- Removing caveman mode (still actively fetched by all sai-* wrappers).
- Deleting `Intelligence vs Cost (May 2026).png` (used by `README.md`).
- Restructuring openspec archives or specs unrelated to `command-wrappers`.
- Renaming or relocating remaining files.

## Decisions

### Decision: Hard delete instead of deprecation
Files are prompt assets, not runtime code. No consumers exist outside this repo, so deletion is safe. Alternative (mark deprecated, delete later) just postpones the cleanup.

### Decision: Drop opencode model variants of sai-1-spec
`sai-1-spec-gemini.md`, `sai-1-spec-gpt.md`, `sai-1-spec-opus.md` differ only in model declaration. The canonical `sai-1-spec.md` already covers the supported flow. Users wanting a specific model can edit frontmatter locally. Alternative (keep all) preserves optionality at the cost of four parallel files diverging over time.

### Decision: `spec.propose.md` is the sole spec instruction
The active wrappers (`claude/commands/sai-1-spec.md`, `opencode/commands/sai-1-spec.md`) already fetch `spec.propose.md`. Legacy `spec.common.md` chain is unreferenced by the canonical wrappers. Removing it eliminates the dual-source-of-truth risk noted in `AGENTS.md`.

### Decision: Update `command-wrappers` spec via MODIFIED + REMOVED deltas
The spec currently scopes Copilot indirectly through the "ai-* commands wrap opsx skills" requirement. We narrow scope to Claude Code + OpenCode and explicitly drop Copilot mentions; we also remove the `spec.common.md` chain reference.

## Risks / Trade-offs

- Risk: external users may fork the Copilot wrappers → Mitigation: changelog entry / commit message flags BREAKING removal; users can restore from git history.
- Risk: opencode users relying on a specific model variant → Mitigation: document model override in `sai-1-spec.md` frontmatter or `AGENTS.md`.
- Trade-off: smaller surface area vs loss of multi-harness optionality. Accepted — multi-harness was aspirational and unused.

## Migration Plan

1. Delete files in a single commit per logical group (Copilot, legacy specs, opencode variants, remember.chinese).
2. Update `README.md`, `AGENTS.md`, `INSTALL.claude.md` references.
3. Update `openspec/specs/command-wrappers/spec.md` via the spec delta in this change.
4. Verify no remaining references via grep.

Rollback: `git revert` the cleanup commits; assets restore as-is.
