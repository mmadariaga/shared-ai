**Complexity**: high (4 capabilities, 4 requirements, 8 affected files)

> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The `budget-explorer` subagent's tool-preference ladder was inaccessible and unobservable. The agent lacked shell and codegraph MCP tools, making ladder levels 1 and 2 structurally unreachable. Caller prompts could prescribe research tools, overriding the ladder. Discarded ladder levels produced no audit trail.

## What Changes

- **Explorer tools**: Added `Bash` and `mcp__codegraph__codegraph_explore` to `agents/claude/budget-explorer.md:6`, enabling ladder levels 1 and 2
- **Ladder discard logging**: New `ladder_discards` field in explorer's structured response captures one reason per skipped level
- **Policy expansion**: `sai/policies/explore-agent.md` now defines ladder level 1 split (1a: MCP, 1b: CLI), discard reasons, shell restrictions (git grep and codegraph only), and ladder precedence (caller prompts do not override)
- **Prompt discipline**: New "Prompt-authoring discipline" sections in `skills/claude/budget-explorer/SKILL.md` and `skills/opencode/budget-explorer/SKILL.md` forbid prescribing research tools in caller spawn prompts
- **Instruction updates**: `sai/commands/backfill/instructions.md` Phase 4 prompt reformatted to goal/output-contract format; `sai/commands/explore/instructions.md` item 2a added to relay ladder discards to chat
- **Test enforcement**: New `test/explorer-prompt-discipline.test.js` sweeps `sai/` to detect explorer spawn prompts that prescribe tools; `test/canonical-opencode-agent-behavior.test.js` updated to verify budget-explorer has bare Bash and mcp__codegraph__codegraph_explore

## Capabilities

### New Capabilities

- **explorer-research-capability** — Grant `Bash` and `mcp__codegraph__codegraph_explore` tools to explorer, enabling ladder levels 1a (MCP), 1b (CLI), and 2 (git grep)
- **ladder-discard-logging** — Explorer emits `ladder_discards` field with per-level reasons for skipped ladder levels
- **caller-prompt-discipline** — Spawn prompts state goal and output contract only; ladder governs regardless of caller tool prescriptions

### Modified Capabilities

- **tool-preference-ladder** — Ladder levels refined with MCP/CLI split, mandatory discard logging, caller-prescription handling, and explicit ladder precedence

## Impact

New files:
- `test/explorer-prompt-discipline.test.js`

Modified files:
- `agents/claude/budget-explorer.md`
- `sai/policies/explore-agent.md`
- `sai/commands/backfill/instructions.md`
- `sai/commands/explore/instructions.md`
- `skills/claude/budget-explorer/SKILL.md`
- `skills/opencode/budget-explorer/SKILL.md`
- `test/canonical-opencode-agent-behavior.test.js`

## Proposal Research Documentation

- `agents/claude/budget-explorer.md:6` — existing tools declaration
- `openspec/specs/tool-preference-ladder/spec.md` — existing ladder specification (modified by this change)
- `sai/policies/explore-agent.md` — existing tool-preference ladder policy (fetched by agents)
- `sai/commands/backfill/instructions.md` — existing Phase 4 conflict-detection delegate (lines 165–177)
- `sai/commands/explore/instructions.md` — existing research-tooling notice (item 2)
- `skills/claude/budget-explorer/SKILL.md` — existing Output contract section
- `skills/opencode/budget-explorer/SKILL.md` — existing Output contract section
- `test/canonical-opencode-agent-behavior.test.js:174` — existing tools assertion for budget-explorer
- `commands/claude/sai-explore.md:6` — existing codegraph MCP literal declaration (precedent for mcp__ syntax)

## Additional Notes

The change implements I1–I12 from the implementation details: ladder split into subroutes with distinguishable discard reasons (I2), mandatory field emitted even when omitted from caller's contract (I3), bare Bash without scoped syntax (I5), prompt-authoring contract in skill files (I8), and test sweep for prompt discipline (I12). Shell restriction remains a written rule in policy rather than a harness-level permission, preserving the existing permission model.
