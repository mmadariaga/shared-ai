## Why

The approval gate (asking the user to confirm specs before design) lives at the end of `sai-1-spec`, but the user has already exited that command by the time they want to approve — the natural moment to confirm is when they *start* `sai-2-design`, not as a tail of the previous step.

## What Changes

- `~/.claude/commands/sai-1-spec.md`: remove the approval question and `.openspec.yaml` write block; keep only the "Specs ready…" print and stop.
- `~/.claude/commands/sai-2-design.md`: add the approval question and `.openspec.yaml` write at the top, between the prereqs/existence check and the generation instructions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sai-1-spec-stop`: sai-1-spec now stops after printing "Specs ready…" without asking for approval.
- `sai-2-design-approval-gate`: sai-2-design opens by asking for approval, writes `approval.specs` to `.openspec.yaml`, then proceeds with generation.

## Impact

- `~/.claude/commands/sai-1-spec.md` — removes 5 lines (approval question + yaml write block).
- `~/.claude/commands/sai-2-design.md` — adds the approval question + yaml write block after the existence/prereq check and before `## Load behaviors`.
- No changes to schemas, CLI, or other commands.
