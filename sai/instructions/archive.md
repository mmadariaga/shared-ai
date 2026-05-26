## Completion Check

Before running the archive skill, perform this check:

1. Check if openspec/changes/$ARGUMENTS/implementation.md exists.
   - **If it exists**: search it for unchecked items (- [ ]). If any are found, STOP and print: "openspec/changes/$ARGUMENTS/implementation.md contains incomplete tasks. Complete all steps before archiving." Do not proceed with the archive.
   - **If it does not exist**: skip this check entirely. Proceed without any warning about incomplete tasks.

## Missing main spec handling (applies to step 4 of the archive skill)

When assessing delta spec sync state:
- If a delta spec capability has **no matching main spec** at `openspec/specs/<capability>/spec.md`, treat it as a new addition.
- Include it in the combined summary as `[ADD] <capability>`.
- The "changes needed" branch applies: offer "Sync now (recommended — creates new main spec)" and "Archive without syncing".
