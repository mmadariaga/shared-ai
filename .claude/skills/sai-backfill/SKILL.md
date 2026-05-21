---
name: sai-backfill
description: >
  Post-hoc backfill command — recovers proposal.md and capability specs for changes
  that skipped the full SAI workflow. Runs an interview, detects spec conflicts, and
  writes only the artifacts that are reliably derivable from the diff.
  TRIGGER when: user ran /sai-backfill, wants to document a completed feature retroactively,
  wants to backfill specs for an uncommitted change.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: Mikel Madariaga
  version: "1.0"
  generatedBy: "manual"
---

Post-hoc backfill for changes that skipped the full SAI workflow.

**Input**: Change name (kebab-case). If omitted, the command derives it from the diff or asks for it.

**What it does**:
1. Asks which diff to analyze (SHA-based, staged, or unstaged/untracked)
2. Runs a structured interview: two fixed questions + targeted adaptive follow-ups
3. Scans `openspec/specs/` for conflicts before writing anything
4. Creates `openspec/changes/{name}/proposal.md` with a mandatory post-hoc marker
5. Creates or updates `openspec/specs/{capability}/spec.md` entries to reflect actual behavior

**Prohibited outputs**: `design.md`, `tasks.md`, `implementation.md` — never generated.

Fetches `@sai/commands/sai-backfill.md` and follows those instructions exactly.
