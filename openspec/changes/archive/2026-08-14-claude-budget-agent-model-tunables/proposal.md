**Complexity**: high (4 capabilities, 16 affected paths, no breaking change)

## Why

Claude Code's three budget skills hardcode the subagent model identifiers (`haiku` / `sonnet`) in spawn parameters, so a Claude Code installation cannot tune its budget agent models — while opencode already exposes the same three roles as managed agent files with user-owned `model` frontmatter under the tunable-seed lifecycle. This change gives Claude Code the same tunable-agent mechanism, restoring harness parity for budget agent model configuration.

## What Changes

- Add three managed Claude generic agent sources mirroring the opencode roles: `agents/claude/budget-explorer.md`, `agents/claude/budget-executor.md`, and `agents/claude/budget-subagent.md`, each with tunable `model` and `effort` frontmatter (shipped seed `model: haiku`, `effort: low`), a body of exactly one Fetch of the corresponding neutral behavior policy (`@sai/policies/{explore,executor,budget}-agent.md`), and a read-only capability declaration on the `budget-explorer` source. The budget-prefixed names are the settled decision: they match the `budget-subagent` dispatch literal already used by `sai-explore` and avoid colliding with Claude Code's built-in Explore agent in the shared `~/.claude/agents/` namespace; opencode keeps its non-prefixed names because no such collision exists there.
- Declare three new `tunable-seed` agent projections for Claude Code in `sai/install-manifest.json` (agents class, destination paths `budget-explorer.md`, `budget-executor.md`, `budget-subagent.md`), growing managed agent projections from 17 to 20. The existing installer, doctor, and uninstall machinery adopts the new files automatically — no installer code change.
- Update the three Claude budget skills (`skills/claude/budget-explorer/SKILL.md`, `skills/claude/budget-executor/SKILL.md`, `skills/claude/budget-subagent/SKILL.md`) to source the subagent model from the corresponding agent file's frontmatter, to dispatch through the created agent files (`subagent_type: budget-explorer | budget-executor | budget-subagent`) instead of built-in or unresolvable type literals (`Explore`, `General`, `general-purpose`), and to remove hardcoded model identifiers. The explorer skill's haiku→sonnet escalation tier is retired and its lookup ≤10 / audit ≤30 tool-call split collapses to a single ≤30 per-spawn ceiling, with callers free to tighten below it; multi-step synthesis stays with the main agent, matching the opencode binding.
- The `sai-explore` dispatch literal `Agent(subagent_type: budget-subagent, ...)` (`sai/commands/explore/body.md`) resolves to the new `budget-subagent` agent file, fixing a dispatch that names no existing agent type today.
- Update the spec-level pins: `agent-projection-strategy` (projection count 17 → 20), `agent-tunable-ownership` (7 → 10 Claude agent projections), and `canonical-opencode-agent-behavior` (neutral policies and the single-Fetch agent body rule extend to both harnesses' generic agents, with Claude project-local extension scenarios).
- Update documentation: `AGENTS.md` (repo-structure rows and the Cost Discipline bullet), `INSTALL.claude.md` (managed-agent and model-customization sections), and `README.md` (budget skill table rows). `GLOSSARY.md` already defines the **Generic Agent** term and is not modified by this change.

## Capabilities

### New Capabilities

- `claude-budget-agent-tunables`: managed Claude generic agent sources (`budget-explorer`, `budget-executor`, `budget-subagent`) with tunable `model` and `effort` frontmatter, their manifest projections, skill-side consumption of the agent-file model with no hardcoded model identifiers, and dispatch literals that resolve to the created agent files.

### Modified Capabilities

- `agent-projection-strategy`: managed agent projection count 17 → 20 and the "generic agents" wording now covers both harnesses.
- `agent-tunable-ownership`: the 7-Claude-projection phrasing becomes 10 Claude agent projections.
- `canonical-opencode-agent-behavior`: the three neutral behavior policies and the single-Fetch agent body rule extend to Claude's generic agents (both-harness canonical source).

## Impact

- `agents/claude/budget-explorer.md`, `agents/claude/budget-executor.md`, `agents/claude/budget-subagent.md` (new)
- `skills/claude/budget-explorer/SKILL.md`, `skills/claude/budget-executor/SKILL.md`, `skills/claude/budget-subagent/SKILL.md` (modified)
- `sai/commands/explore/body.md` (dispatch literal resolution surface — the `budget-subagent` literal resolves to the created agent file)
- `sai/install-manifest.json` (modified)
- `openspec/specs/claude-budget-agent-tunables/spec.md` (new delta)
- `openspec/specs/agent-projection-strategy/spec.md`, `openspec/specs/agent-tunable-ownership/spec.md`, `openspec/specs/canonical-opencode-agent-behavior/spec.md` (delta updates)
- `AGENTS.md`, `INSTALL.claude.md`, `README.md` (docs)

No code, API, dependency, or system changes; the installer, doctor, uninstall, and model-customization code paths are untouched.

## Proposal Research Documentation

**Local files**: `skills/claude/budget-explorer/SKILL.md`; `skills/claude/budget-executor/SKILL.md`; `skills/claude/budget-subagent/SKILL.md`; `skills/opencode/budget-explorer/SKILL.md`; `skills/opencode/budget-executor/SKILL.md`; `skills/opencode/budget-subagent/SKILL.md`; `agents/opencode/explore.md`; `agents/opencode/executor.md`; `agents/opencode/budget.md`; `agents/claude/worker-template.md`; `sai/install-manifest.json`; `sai/policies/explore-agent.md`; `sai/policies/executor-agent.md`; `sai/policies/budget-agent.md`; `openspec/specs/agent-projection-strategy/spec.md`; `openspec/specs/agent-tunable-ownership/spec.md`; `openspec/specs/agent-install-diagnostics/spec.md`; `openspec/specs/canonical-opencode-agent-behavior/spec.md`; `openspec/specs/model-customization-menu/spec.md`; `openspec/specs/claude-model-routing/spec.md`; `openspec/specs/budget-skill-naming/spec.md`; `commands/claude/budget.md`; `commands/opencode/budget.md`; `AGENTS.md`; `INSTALL.claude.md`; `README.md`; `GLOSSARY.md`; `openspec/changes/archive/2026-08-13-customize-command-models/proposal.md`; `docs/adr/0128-canonical-generic-opencode-behavior-behind-fetch-wrappers.md`; `docs/adr/0130-reuse-recursive-sai-policy-projection-for-generic-agents.md`

**External URLs**: none

## Additional Notes

- The post-setup model customizer (`bin/model-customization.js`) derives its Workers-family checklist from the manifest's agent projections, so the three new Claude agents (`budget-explorer`, `budget-executor`, `budget-subagent`) become customization targets automatically — no customizer or installer code change is required. For a confirmed `haiku` target the menu offers no effort choices and the local override materializes model-only, dropping any `effort` line the destination holds (`bin/model-customization.js:93`), while the user-global seed keeps `effort: low`.
- The Claude budget skills must stop passing per-spawn `model:` parameters for the agent file's model to be authoritative; the retired sonnet escalation tier and the collapsed tool-call ceiling are the behavioral changes for existing Claude users (opencode already reserves synthesis for the main agent and declares the single ≤30 ceiling).
- Agent naming is settled, not open: Claude's trio is `budget-explorer` / `budget-executor` / `budget-subagent` (I12), chosen to match the existing `budget-subagent` dispatch literal and to avoid the built-in Explore collision in the shared `~/.claude/agents/` namespace (E2); opencode keeps `explore` / `executor` / `budget` because no such collision exists there. Design-phase deferral is limited to genuinely open dispatch mechanics (agent-file capability/tool key mapping, per-spawn model override behavior).
- Pre-existing staleness, not fixed by this change: `README.md` still describes opencode budget model resolution as `agent.explore.model` in `opencode.jsonc`, which the installer's migration notice (`bin/install-flow.js`) already supersedes in favor of the agent-file model line.
- The pre-existing **Generic Agent** glossary term already covers the opencode `explore` / `executor` / `budget` trio and the Claude `budget-explorer` / `budget-executor` / `budget-subagent` trio, so this change requires no `GLOSSARY.md` update.
- The `canonical-opencode-agent-behavior` capability keeps its historical name even though its delta requirements now normatively govern both harnesses' generic agents, including `agents/claude/budget-*.md`. The naming mismatch is accepted for continuity — the capability originated as the opencode canonicalization — and a future capability rename is left as housekeeping, not part of this change.
