## Why

The current accessibility audit instructions allow the main agent to rationalize skipping budget-explorer delegation by interpreting "when independent areas" as optional. Making delegation mandatory eliminates this ambiguity, ensures all diff-file reading and component categorization runs on the cheaper subagent model, and prevents polluting the main agent's WCAG reasoning context with raw markup.

## What Changes

- **Modified**: `~/.config/opencode/sai/instructions/accessibility.md` — Discovery phase delegation becomes mandatory and unconditional
- **Modified**: `~/.config/opencode/sai/instructions/accessibility.md` — Operating Principles gain a hard requirement forbidding main-agent diff-file reading

## Capabilities

### New Capabilities
<!-- No new capabilities introduced -->

### Modified Capabilities
- `accessibility-audit`: Delegation to budget-explorer subagents changes from conditional ("when independent areas") to mandatory for all diff-file reading, component categorization, and codebase context lookup during the Discovery phase.

## Impact

- **Affected file**: `~/.config/opencode/sai/instructions/accessibility.md` (two edit locations: Discovery phase ~line 63, Operating Principles ~line 35)
- **Behavioral**: Main agent will no longer read diff files directly; all source code inspection is delegated to budget-explorer subagents with output contracts
- **Cost**: Reduces main-agent token consumption by routing I/O through commodity model
- **No breaking changes**: Existing audit workflows continue to function; only the delegation trigger becomes unconditional

## Proposal Research Documentation

**Local files**:
- `~/.config/opencode/sai/instructions/accessibility.md` (target file for edits)
- `~/.config/opencode/skills/budget-explorer/SKILL.md` (subagent binding and output contract rules)
- `C:\Projects\mine\shared-ai\sai\commands\sai-8-accessibility.md` (wrapper that fetches accessibility.md)

**External URLs**:
- None

## Additional Notes

The change addresses a specific loophole: the current wording "when independent areas of the diff need codebase context" allows the agent to rationalize "these areas are not independent, so I won't delegate." Making delegation mandatory removes this escape hatch. Combined with the Cost model in the budget-explorer skill, the agent has both the *what* (mandatory) and the *why* (cheaper + clean context).
