## Why

GitHub Copilot does not mark checkboxes in task lists as it completes them, forcing users to manually append reminders like "Recuerda marcar los checkboxes a medida que completas tareas" to every prompt. Adding this instruction to the Copilot harness file makes the behavior automatic.

## What Changes

- Add a checkbox-marking discipline rule to `sai/instructions/harness/copilot.md` instructing Copilot to mark checkboxes as tasks are completed.

## Capabilities

### New Capabilities

- `copilot-checkbox-discipline`: Rule in the Copilot harness instructions that requires the agent to mark task checkboxes (e.g., `- [ ]` to `- [x]`) as each task is completed.

### Modified Capabilities

<!-- None -->

## Impact

- **Affected files**: `sai/instructions/harness/copilot.md`
- **Affected harnesses**: GitHub Copilot only. Claude Code and OpenCode are not affected.
- **Downstream artifacts**: None. This is a harness-level behavioral instruction, not a pipeline artifact.

## Proposal Research Documentation

**Local files**: `sai/instructions/harness/copilot.md`

**External URLs**: None


## Additional Notes

- The rule should be concise and fit the existing style of `copilot.md` (short imperative rules grouped by topic).
- This only affects Copilot because the issue is specific to how Copilot handles task lists. Other harnesses already track checkbox state correctly.
