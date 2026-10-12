# Implement Step — Collapse Implemented Steps

Active step: collapse-implemented-steps. This step runs only on a re-run, when `openspec/changes/{change-name}/implementation.md` exists. Simplify it by collapsing fully applied steps, then report the `collapse-implemented-steps` progress event per the worker contract.

### Simplify existing implementation.md and interfaces.md

The coordinator performs this once against candidate copies of the existing plan and interfaces, retaining the originals until successful final verification. The following recipe operates on those copies, not the durable paths; stage interface pruning until publication succeeds:

> 1. Read `openspec/changes/{change-name}/implementation.md`.
> 2. For each `#### Step N:` section, check whether every checkbox in that section is `[x]`.
> 3. If ALL are `[x]`, the step is fully applied. Replace its entire content (code blocks, checklists, STOP & COMMIT marker) with just the heading line followed by `*(already applied)*`. Write the simplified file back to the same path.
> 4. Steps with any `[ ]` checkbox remain unchanged.
> 5. **Prune interfaces.md if it exists:** For each collapsed `#### Step N:` (identified by integer key N from step 3), find the matching `## Step N:` section in `openspec/changes/{change-name}/interfaces.md`. Replace that section with just the heading line followed by `*(already applied)*`. The pruning criterion (all checkboxes checked in implementation.md) is evaluated once and applied to both files by the integer key N.
> 6. Report: the step headings collapsed, the step headings left as-is, and the step numbers pruned from interfaces.md (if any).

Complete and verify the candidate-copy changes before marking this common step complete.
