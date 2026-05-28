## Why

The Claude Code variants of the three budget skill files (`budget-explorer`, `budget-executor`, `budget-subagent`) lack the `## Cost model` section added to their opencode counterparts in 2026-05-28-budget-skills-cost-model-section. Without it, the main agent has no inline rationale anchoring cost-discipline rules, making it easier to rationalize skipping delegation.

## What Changes

- Add a `## Cost model` section to `~/.claude/skills/budget-explorer/SKILL.md` (after `## NEVER omit model`)
- Add a `## Cost model` section to `~/.claude/skills/budget-executor/SKILL.md` (after `## Claude Code Binding`)
- Add a `## Cost model` section to `~/.claude/skills/budget-subagent/SKILL.md` (after `## Claude Code Binding`)
- `~/.claude/skills/budget/SKILL.md` (loader) is **unchanged**

## Capabilities

### New Capabilities

- `cost-model-disclosure`: Each of the three Claude Code budget skill files exposes a `## Cost model` section documenting that the subagent runs on a cheaper model (`model: "haiku"` spawn parameter) and explaining the two delegation benefits: Cost and Context hygiene.

### Modified Capabilities

_(none)_

## Impact

Three files, all outside the project repository:
- `C:\Users\mikel.madariaga\.claude\skills\budget-explorer\SKILL.md`
- `C:\Users\mikel.madariaga\.claude\skills\budget-executor\SKILL.md`
- `C:\Users\mikel.madariaga\.claude\skills\budget-subagent\SKILL.md`

No project source code, CI pipelines, or configuration files are affected.

## Proposal Research Documentation

**Local files**:
- `openspec/changes/archive/2026-05-28-budget-skills-cost-model-section/proposal.md` — prior opencode counterpart
- `openspec/changes/archive/2026-05-28-budget-skills-cost-model-section/specs/cost-model-disclosure/spec.md` — spec to adapt
- `openspec/changes/archive/2026-05-28-budget-skills-cost-model-section/design.md` — insertion-point rationale and body template
- `C:\Users\mikel.madariaga\.claude\skills\budget-explorer\SKILL.md` — current state of target file
- `C:\Users\mikel.madariaga\.claude\skills\budget-executor\SKILL.md` — current state of target file
- `C:\Users\mikel.madariaga\.claude\skills\budget-subagent\SKILL.md` — current state of target file

**External URLs**: _(none)_

## Additional Notes

Key adaptation from the opencode spec: Claude Code skills have no `opencode.jsonc` configuration file. The model is bound via the explicit `model: "haiku"` parameter in every `Agent()` spawn call. The cost-claim requirement must reference this inline parameter rather than a config key.

Insertion points differ from opencode:
- `budget-explorer`: after `## NEVER omit model` (groups with the model-discipline block; opencode equivalent was after `## Model resolution`)
- `budget-executor` and `budget-subagent`: after `## Claude Code Binding` (parallel to opencode's `## OpenCode Binding`)

The `## Cost model` body text is otherwise structurally identical across both runtimes.
