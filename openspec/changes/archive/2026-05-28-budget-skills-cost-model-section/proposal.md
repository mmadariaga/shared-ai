## Why

The main agent can rationalize doing I/O itself ("the files are few/small, reading them directly is faster") when it lacks explicit knowledge that subagents run on a different, cheaper model. Adding a `## Cost model` section to each budget skill makes the cost and context-hygiene benefits explicit, removing the ambiguity that enables the shortcut.

## What Changes

- Add `## Cost model` section to `~/.config/opencode/skills/budget-explorer/SKILL.md` (after `## Model resolution`)
- Add `## Cost model` section to `~/.config/opencode/skills/budget-executor/SKILL.md` (after `## OpenCode Binding`)
- Add `## Cost model` section to `~/.config/opencode/skills/budget-subagent/SKILL.md` (after `## OpenCode Binding`)
- `budget/SKILL.md` (the loader) is unchanged

## Capabilities

### New Capabilities

- `cost-model-disclosure`: A `## Cost model` section present in all three budget-skill files, stating that the subagent runs on a lower-cost model and explaining the two delegation incentives (cost reduction and context hygiene).

### Modified Capabilities

_(none — `budget/SKILL.md` loader is unchanged; existing behavioral rules are unchanged)_

## Impact

- **Files affected**: 3 skill markdown files under `~/.config/opencode/skills/`
- **No code changed**: pure documentation addition
- **No breaking changes**: existing bindings, model resolution, and behavioral rules are untouched
- **Downstream effect**: main-agent reasoning that references these skills will now have explicit cost-model context, reducing rationalized delegation avoidance

## Proposal Research Documentation

**Local files**:
- `~/.config/opencode/skills/budget-explorer/SKILL.md`
- `~/.config/opencode/skills/budget-executor/SKILL.md`
- `~/.config/opencode/skills/budget-subagent/SKILL.md`

**External URLs**: none

## Additional Notes

- Insertion points differ per file: `budget-explorer` inserts after `## Model resolution`; `budget-executor` and `budget-subagent` insert after `## OpenCode Binding`.
- The `{name}` placeholder in `agent.{name}.model` should be replaced with the concrete agent keyword in each file: `explore`, `executor`, `budget`.
- The section body is identical across all three files except for the `agent.{name}.model` reference.
- No version bump is required (pure additive documentation).
