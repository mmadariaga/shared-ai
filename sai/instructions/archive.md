## Completion Check

Before running the archive skill, perform this check:

1. Check if openspec/changes/$ARGUMENTS/implementation.md exists.
   - **If it exists**: search it for unchecked items (- [ ]). If any are found, STOP and print: "openspec/changes/$ARGUMENTS/implementation.md contains incomplete tasks. Complete all steps before archiving." Do not proceed with the archive.
   - **If it does not exist**: skip this check entirely. Proceed without any warning about incomplete tasks.
