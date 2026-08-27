# Implement Step — Collapse Implemented Steps

Active step: collapse-implemented-steps. Simplify any existing `implementation.md` by collapsing fully applied steps, then report the `collapse-implemented-steps` progress event per the worker contract. On a first run (no existing `implementation.md`), skip this step entirely — the skipped id folds into the next completed batch in plan order.

### Step 1: Simplify existing implementation.md and interfaces.md

**MANDATORY: Spawn a subagent for this step. Do NOT read `implementation.md` or `interfaces.md` yourself.**

If `openspec/changes/{change-name}/implementation.md` exists, spawn a subagent using a cheap model, **use `budget-subagent` skill**, with this prompt (fill in `{change-name}`):

1. Read `openspec/changes/{change-name}/implementation.md`.
2. For each `#### Step N:` section, check whether every checkbox in that section is `[x]`.
3. If ALL are `[x]`, the step is fully applied. Replace its entire content (code blocks, checklists, STOP & COMMIT marker) with just the heading line followed by `*(already applied)*`. Write the simplified file back to the same path.
4. Steps with any `[ ]` checkbox remain unchanged.
5. **Prune interfaces.md if it exists:** For each collapsed `#### Step N:` (identified by integer key N from step 3), find the matching `## Step N:` section in `openspec/changes/{change-name}/interfaces.md` (if that file exists). Replace the matching `## Step N:` section with just the heading line followed by `*(already applied)*`. The criterion for pruning (all checkboxes checked in implementation.md) is evaluated once and applied to both files by the integer key N.
6. Report: list of step headings that were collapsed, list that were left as-is, and list of step numbers that were pruned from interfaces.md (if any).

Wait for the subagent to finish before continuing.

If `implementation.md` does not exist, skip this step entirely.
