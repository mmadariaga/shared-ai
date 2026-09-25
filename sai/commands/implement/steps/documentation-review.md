# Implement Step — Documentation Review

Active step: documentation-review. Read all required documentation and confirm conventions, then report the `documentation-review` progress event per the worker contract.

### Read Required Documentation (one time only)

Read every document listed in `## Required Documentation` from `tasks.md`. The path or URL is the text before ` — `, and the note guides the reading:
- Local file paths: read them directly, in parallel when there are several.
- External URLs: use web fetch.

Read only what is listed: no `SKILL.md` indexes, no documentation-tree exploration, and no subagents for this read. Scoped lookups beyond this one-time read use ONLY the bounded batch permission in `sai/commands/implement/steps/plan-generation.md` research_task §2 (`budget-explorer` only, per-item approval).

**Re-run exception:** when `implementation.md` existed at the start of this run, research on elements introduced since the last run is permitted through one `budget-subagent` scoped to those new elements only.

Once all documents are read, validate them against the Expertise Profile. If a listed document is missing or contradicts the declared stack, return `needs_input` naming the document and the contradiction.
