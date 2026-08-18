**Complexity**: high (4 capabilities, 1 policy file)

## Why

The budget-explorer contract governs write scope and bounded summaries but does not define a default filesystem read/search scope, so speculative discovery can escape the project and trigger low-value permission prompts. Establishing a project-root-first rule now makes research predictable while preserving narrowly justified access to named external paths.

## What Changes

- Make the harness project root, including the active worktree, the default and first scope for filesystem research.
- Permit out-of-root filesystem access only for a concrete path named with a concrete purpose, while keeping speculative sweeping inside the root.
- Require the explorer's structured response to carry independently legible out-of-root escalation records instead of self-widening the search.
- Restate the existing tool-call ceiling as a per-segment limit for the initial spawn and every continuation, preserving each harness's continuation behavior.
- Keep the contract harness-neutral and change only `sai/policies/explore-agent.md`; Fetch boot and web lookup remain outside filesystem-search scope.

## Capabilities

### New Capabilities

- `explore-agent-search-root`: Establishes the harness project root as the default and first filesystem research scope.
- `explore-agent-directed-access`: Allows named, purpose-bound access outside the root without creating a destination allowlist.
- `explore-agent-scope-escalation`: Returns self-discovered out-of-root needs as structured escalation fields instead of acting on them.
- `explore-agent-segment-tool-cap`: Applies the existing tool-call ceiling independently to the initial spawn and each continuation.

### Modified Capabilities

- None.

## Impact

- **Implementation target:** `sai/policies/explore-agent.md` only.
- **Validation surfaces:** the Claude Code and opencode explorer bindings, their dispatch skills, existing parity tests, and sibling budget-explorer specifications; these are not edit targets.
- No application API, dependency, write-scope, coordinator-search, or harness-dispatch changes are introduced; the explorer's structured response carries the canonical escalation field described by the specs.

## Proposal Research Documentation

**Local files:**

- `sai/policies/explore-agent.md`
- `agents/claude/budget-explorer.md`
- `agents/opencode/explore.md`
- `skills/claude/budget-explorer/SKILL.md`
- `skills/opencode/budget-explorer/SKILL.md`
- `test/canonical-opencode-agent-behavior.test.js`
- `openspec/specs/canonical-opencode-agent-behavior/spec.md`
- `openspec/specs/budget-explorer-file-reading/spec.md`
- `openspec/specs/budget-explorer-file-discovery/spec.md`
- `sai/commands/spec/worker.md`
- `sai/worker-core.md`

**External URLs:** None.

## Additional Notes

- Directed access governs how a destination is justified, not which destination is allowed: a named path may be anywhere when its purpose is concrete and task-relevant.
- A path discovered by the agent is not a task-supplied path. If it is outside the root and is not a public/well-known location of a relevant tool, the agent records it for the main agent rather than probing it.
- Escalation records must contain a concrete, non-pattern path and a motive that remains meaningful without repeating or deriving from that path. No candidate means a normal not-found result, not an empty escalation.
- Claude Code continuation and opencode synchronous re-dispatch remain distinct binding behaviors; the policy only requires reuse when continuation is supported and a fresh bounded segment otherwise.
- The requested overview language is Español for the later overview workflow; this proposal and its specs remain in English.
- The `high` complexity token follows the rubric's four-capability signal; it reflects rule decomposition within one small policy file, not broad implementation breadth.
- No global cap is imposed on escalation iterations: each iteration still requires a fresh, concrete path and independently legible motive, while a later iteration counter remains an accepted cheap, non-breaking follow-up rather than part of this change.
