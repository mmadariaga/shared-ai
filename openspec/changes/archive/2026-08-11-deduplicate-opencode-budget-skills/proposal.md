**Complexity**: medium

## Why

The OpenCode budget skills repeat behavior that is already the canonical contract for their corresponding generic agents, allowing the skill instructions and subagent runtime prompts to drift. Centralizing those behavior references now keeps dispatch guidance and runtime behavior aligned before another behavior change has to be copied into multiple surfaces.

## What Changes

- Add a matching `Fetch @sai/policies/<name>-agent.md` behavior reference to the budget-subagent, budget-executor, and budget-explorer OpenCode skills.
- Move the behavior-owned sections to the matching canonical policies: remove the current `## Universal Behavior` sections from budget-subagent and budget-executor, and remove budget-explorer's duplicated `## Output contract` rule block. Keep the effective output, tool-call, and permission semantics unchanged through the fetched policies.
- Keep only skill-local guidance in the budget skills: their binding, dispatch, model-resolution, tool-call/cap, raw-output, and cost sections as enumerated by the spec. In particular, budget-explorer's research output contract remains available from `explore-agent.md`, not as a second skill-local rule block.
- Extend the canonical OpenCode agent behavior regression coverage to prove that each budget skill and its agent resolve the same policy and that duplicated behavior prose is not reintroduced.
- Amend the active `executor-opencode-skill` capability so its executor requirement records the canonical Fetch boundary instead of requiring an inline copy of universal behavior.

## Capabilities

### New Capabilities

- `opencode-budget-skill-contract-parity`: OpenCode budget skills consume the canonical behavior policies used by their matching generic agents while retaining their harness-specific dispatch and cost documentation.

### Modified Capabilities

- `executor-opencode-skill`: replace the inline `## Universal Behavior` requirement with the canonical `Fetch @sai/policies/executor-agent.md` contract and retain the OpenCode-specific section and execution semantics.

## Impact

- `skills/opencode/budget-subagent/SKILL.md`
- `skills/opencode/budget-executor/SKILL.md`
- `skills/opencode/budget-explorer/SKILL.md`
- `test/canonical-opencode-agent-behavior.test.js`
- `openspec/specs/executor-opencode-skill/spec.md`
- The existing canonical policies under `sai/policies/` remain the behavior source of truth and are consumed, not modified.
- No new dependency, harness binding vocabulary, agent model source, installer projection, or generic agent file is introduced or changed.

## Proposal Research Documentation

**Local files**:

- `sai/policies/budget-agent.md`
- `sai/policies/executor-agent.md`
- `sai/policies/explore-agent.md`
- `agents/opencode/budget.md`
- `agents/opencode/executor.md`
- `agents/opencode/explore.md`
- `skills/opencode/budget-subagent/SKILL.md`
- `skills/opencode/budget-executor/SKILL.md`
- `skills/opencode/budget-explorer/SKILL.md`
- `openspec/specs/canonical-opencode-agent-behavior/spec.md`
- `openspec/specs/budget-subagent-platform-bindings/spec.md`
- `openspec/specs/budget-subagent-behavior/spec.md`
- `openspec/specs/executor-universal-behavior/spec.md`
- `openspec/specs/executor-opencode-skill/spec.md`
- `openspec/specs/opencode-budget-cost-model-docs/spec.md`
- `test/canonical-opencode-agent-behavior.test.js`
- `test/install-opencode.test.js`
- `sai/install-manifest.json`
- `openspec/changes/archive/2026-08-11-canonicalize-opencode-agent-behavior/proposal.md`

**External URLs**: None.

## Additional Notes

- The three matching agent files already fetch the canonical policy files; the skill references should use the same exact targets.
- `budget-subagent` and `budget-executor` currently inline universal behavior, while `budget-explorer` carries the harness-facing research contract without an explicit canonical policy fetch. The change must converge all three without moving or rewriting the canonical policies.
- The exact boundary is normative: `budget-subagent` removes `## Universal Behavior` and retains `## OpenCode Binding`, `## Dispatch mode`, and `## Cost model`; `budget-executor` removes `## Universal Behavior` and retains `## OpenCode Binding`, `## Dispatch mode`, `## Model resolution`, and `## Cost model`, while documenting requested-command/error output allowance and prohibiting unrequested full-file dumps and unfiltered logs; `budget-explorer` adds the canonical behavior Fetch, removes its duplicated `## Output contract` rule block, and retains `## Subagent binding`, `## Dispatch mode`, `## Model resolution`, `## Tool-call caps`, and `## Cost model` while pointing output-contract behavior to `explore-agent.md`.
- Skill-local guidance remains intentionally harness-specific: OpenCode agent keywords, synchronous dispatch, model resolution from installed agent-file frontmatter, raw-output boundaries, caps, and cost rationale must not be generalized away. The canonical policies continue to own the effective behavior contracts, including output contracts and permission rules.
- For executor dispatches, raw output means results of commands explicitly requested by the caller and relevant error or compiler messages. It does not authorize unrequested full-file dumps or unfiltered log streams, which remain prohibited by `executor-agent.md`.
- The active executor capability is reconciled in this slice; no legacy-spec deferral remains for the direct conflict with the canonical Fetch boundary.
