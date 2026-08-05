**Complexity**: high (five new capabilities, no breaking change)

## Why

Shared instructions currently leave the active harness implicit, so a late-bound worker-binding path can resolve to the wrong harness even when the correct binding is already loaded. This change makes identity and path failures explicit and recoverable before the worker reads an invalid path, while keeping existing lifecycle statuses and picker behavior intact.

## What Changes

- Add a positive harness identity assertion and resolution-root contract to each per-harness fetch skill.
- Add a cross-harness path stop-rule: refuse to read or guess a path that identifies a different harness; direct a coordinator-owned stop to a new chat, while a worker-owned stop uses the failed result and permits an explicit fresh-worker dispatch.
- Define the routing failure surface for a worker stop: use the existing terminal `failed` status, with a summary naming the refused path and the current harness identity.
- Define user-requested re-dispatch after a terminal failure as an ordinary dispatch of the original envelope, not a replacement-worker continuation and not a consumer of the system replacement budget.
- Remove the redundant Claude-specific picker example from `sai/policies/artifact-feedback-gate.md`; retain `sai/policies/remember.md` as the canonical picker mapping.

## Capabilities

### New Capabilities

- `harness-identity-assertion`: Each harness fetch skill explicitly states its harness identity and the roots it resolves under.
- `cross-harness-path-stop-rule`: Fetching stops safely when a path identifies another harness, without reading or guessing the target.
- `routing-stop-failure-surface`: A worker routing stop is represented by the existing failed outcome with an actionable summary.
- `user-initiated-redispatch`: A user-requested retry after terminal failure starts an ordinary fresh dispatch and does not consume the replacement budget.
- `shared-text-neutrality`: Shared picker prose defers harness-specific mapping to the canonical policy instead of embedding a single harness example.

### Modified Capabilities

<!-- No existing capability is being modified at the spec level. -->

## Impact

- `skills/claude/fetch/SKILL.md`, `skills/opencode/fetch/SKILL.md`, and `skills/copilot/fetch/SKILL.md`: identity assertions, path stop-rule, and routing recovery instructions loaded by commands and workers.
- `sai/policies/artifact-feedback-gate.md`: remove the redundant harness-specific picker parenthetical.
- `sai/orchestration/worker-lifecycle.md`, `sai/orchestration/coordinator-contract.md`, and the routed worker binding contracts are verification references only; their existing status shapes, continuation rules, and replacement budget remain unchanged.
- No source code, installer layout, lifecycle status, or dependency changes.

## Proposal Research Documentation

**Local files**: `skills/claude/fetch/SKILL.md`; `skills/opencode/fetch/SKILL.md`; `skills/copilot/fetch/SKILL.md`; `agents/claude/sai-1-spec-proposal-worker.md`; `agents/claude/sai-2-design-worker.md`; `agents/claude/sai-3-implementation-worker.md`; `sai/orchestration/worker-lifecycle.md`; `sai/orchestration/coordinator-contract.md`; `sai/orchestration/workers/bindings/claude/design-worker.md`; `sai/orchestration/workers/bindings/opencode/design-worker.md`; `sai/instructions/explore.md`; `sai/policies/artifact-feedback-gate.md`; `sai/policies/remember.md`; `sai/commands/design/coordinator.md`; `openspec/specs/harness-universality/spec.md`; `openspec/specs/closed-choice-prompts/spec.md`; `openspec/specs/artifact-feedback-gate/spec.md`; `sai/instructions/_templates/implementation-plan.md`.

**External URLs**: None.

## Additional Notes

- The stop-rule is expressed generically as a path mismatch against the active harness; it does not enumerate competing harness names in shared instructions.
- Detection compares an identity-bearing path slot, such as `bindings/<identity>/`, directly with the active identity; it does not require a competing-harness inventory.
- A coordinator-level stop directs the user to a new chat and offers no in-session retry. A worker-level stop uses the existing failed result and permits an explicit same-session fresh-worker dispatch.
- The existing `completed`, `needs_input`, and `failed|cancelled` lifecycle payload shapes remain closed and unchanged.
- System-managed caps constrain only system-initiated behavior; an explicit user-initiated dispatch is not counted against them.
- Existing behavior-specific harness availability text and the four-way picker mapping remain unchanged unless directly covered by the capability requirements.
