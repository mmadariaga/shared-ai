# ADR 0016: Accept double branch-selection prompt with the sibling spec

## Status

Accepted

## Context

The `sai-apply-branch-prompt` change embeds a 3-option branch-selection prompt inside the `<plan_template>` `## Prerequisites` block of `sai/instructions/implement.md`. This prompt runs at `/sai-4-apply` time (plan-level), baked into every generated `implementation.md`.

A sibling capability spec, `openspec/specs/sai-implement-branch-prompt/spec.md`, already defines an agent-level branch prompt that runs at `/sai-3-implement` runtime (before plan generation). The proposal explicitly states the sibling spec is NOT modified by this change.

If both prompts stay active, a user running the full pipeline is asked about branch selection twice in one run: once by `/sai-3-implement` (agent-level) and once by `/sai-4-apply` (plan-level). Being asked the same question twice in one pipeline run is surprising.

## Decision

Accept the documented duplication. The plan-level prompt is self-contained in each generated `implementation.md` and does not depend on the agent remembering the earlier runtime prompt. Both prompts coexist without modifying the sibling spec.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Suppress the sibling spec when the plan-level prompt is present | Single prompt per run | Expands scope beyond the stated `## Prerequisites`-only edit; the proposal forbids modifying the sibling spec |
| Merge both prompts into a single shared instruction fetched by both `/sai-3-implement` and the plan template | One source of truth | Requires touching multiple instruction files; breaks the self-contained nature of `<plan_template>` |
| Accept documented duplication (chosen) | Keeps the change scoped to one block; plan-level prompt is self-contained and survives archival of the change directory | User is asked twice per full pipeline run |

## Consequences

- A user running `/sai-3-implement` then `/sai-4-apply` may be asked about branch selection twice. The plan-level prompt is authoritative at `/sai-4-apply` time; the earlier agent-level prompt may be treated as informational.
- After `/sai-archive`, two specs in `openspec/specs/` describe overlapping branch-prompt behavior: `sai-implement-branch-prompt` (sibling) and `sai-apply-branch-prompt` (this change). A future change may consolidate them.
- Removing either prompt later requires a separate change; users may come to depend on the plan-level prompt being self-contained.

## Related

- `openspec/changes/sai-apply-branch-prompt/design.md` — decision D4
- `openspec/specs/sai-implement-branch-prompt/spec.md` — sibling spec (not modified)
- `openspec/changes/sai-apply-branch-prompt/proposal.md` — Additional Notes (documented trade-off)
