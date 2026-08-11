**Complexity**: medium (6 affected source files, no breaking change)

## Why

The three generic OpenCode agent sources currently embed their complete SAI behavior, so an install copies a frozen snapshot into the agent destination and later SAI updates do not reach that behavior. Moving the behavior into canonical SAI policies and leaving thin Fetch wrappers at the agent entrypoints keeps the behavior current while preserving user-controlled model and variant tuning plus append-only instructions in user-owned project-local agent files.

## What Changes

- Add canonical policy contracts for the OpenCode `budget`, `executor`, and `explore` agents under `sai/policies/`.
- Replace the three full agent bodies with one-line `Fetch @sai/...` wrappers while preserving each agent's name, description, model, `mode: subagent`, and OpenCode task-target identity.
- Keep the existing `tunable-seed` projection and `model`/`variant` ownership behavior compatible with destination customizations; support project-local extensions only as instructions appended after the Fetch line in a user-owned `.opencode/agents/<name>.md` file.
- Ensure a later update to a global canonical policy remains visible when the existing `bin/install` setup is rerun against a materialized project-local agent wrapper while its selected tunables and appended instructions remain intact.
- Do not change the install manifest, installer setup behavior, Claude Code runtime behavior, or OpenCode configuration.

## Capabilities

### New Capabilities

- `canonical-opencode-agent-behavior`: Canonical SAI policy contracts and Fetch-based OpenCode generic-agent wrappers.

### Modified Capabilities

- `opencode-generic-agent-files`: Generic agent files retain their identity and tunable frontmatter while delegating their behavior to canonical Fetch targets.

## Impact

- `sai/policies/budget-agent.md` — canonical budget-agent behavior contract.
- `sai/policies/executor-agent.md` — canonical executor-agent behavior contract.
- `sai/policies/explore-agent.md` — canonical explore-agent behavior contract.
- `agents/opencode/budget.md` — OpenCode budget wrapper and preserved frontmatter.
- `agents/opencode/executor.md` — OpenCode executor wrapper and preserved frontmatter.
- `agents/opencode/explore.md` — OpenCode explore wrapper and preserved frontmatter.

The existing recursive `sai-policies` projection makes the policy files available to both supported harnesses; the existing agent projections continue to own the OpenCode entrypoint frontmatter. No installer, manifest, configuration, Claude agent, or runtime setup file is changed.

## Proposal Research Documentation

**Local files**:

- `agents/opencode/budget.md`, `agents/opencode/executor.md`, `agents/opencode/explore.md` — current generic-agent frontmatter and embedded behavior.
- `skills/opencode/budget-explorer/SKILL.md`, `skills/opencode/budget-executor/SKILL.md`, `skills/universal/budget/SKILL.md` — canonical OpenCode budget bindings and loading model.
- `sai/install-manifest.json:10,46-48` — recursive policy projection and three `tunable-seed` agent projections.
- `openspec/specs/agent-tunable-ownership/spec.md` — OpenCode `model`/`variant` tunable ownership and update behavior.
- `openspec/specs/opencode-generic-agent-files/spec.md` — generic agent names, frontmatter, and task-target constraints.
- `openspec/specs/fetch-resolution-path-scoping/spec.md` — exact-file Fetch resolution and namespace rules.
- `openspec/specs/opencode-agent-preservation/spec.md` — projected-file ownership and configuration non-interference.

**External URLs**: None.

## Additional Notes

- The canonical policies contain behavior only; they do not add frontmatter, model selection, installer logic, or native OpenCode imports.
- Each shipped wrapper's Fetch target is an exact global `sai/policies/` file. A project-local agent extension appends instructions after that Fetch line; a project-local policy replacement is not the extension model and is outside this change because it would hide later global policy updates.
- This spec phase produces only `proposal.md` and `specs/**/*.md`; design and implementation planning remain downstream phases.
