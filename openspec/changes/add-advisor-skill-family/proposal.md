# Proposal: add-advisor-skill-family

## Why

The failure path in `sai-4-apply` (and the ambiguity path in `sai-3-implement`) is binary — structured failure report → halt → user — yet many halts are resolvable with a short course correction from a smarter model. An advisor tier (the inverse of the budget-* family: escalate upward instead of delegating downward) resolves these without a human round-trip, emulating Anthropic's advisor-tool pattern at the skill level since no harness exposes a native advisor tool.

## What Changes

- Add two advisor skills, `mid-advisor` and `senior-advisor`, following the budget-* family structure: one SKILL.md per harness under `skills/claude/`, `skills/opencode/`, and `skills/copilot/`, each with a shared Universal Behavior section plus the harness binding.
  - `mid-advisor` runs the `sai-3-implement` model tier; consulted by the `sai-4-apply` coordinator (conceptually: the playbook author clarifying its own plan).
  - `senior-advisor` runs the `sai-2-design` model tier; consulted by `sai-3-implement` for design-authority blockers and open trade-offs (conceptually: the design.md author clarifying its own design). Coding questions are NOT escalated.
- Advisors are read-only consultants: read budget of ~5 change-artifact reads plus ~5 code/test reads, zero writes, no git, no scope expansion. They return a structured advice report — diagnosis (1–2 lines), exact corrective action (or recommendation with rationale for trade-off consultations), and an `escalate-to-user` flag — capped at ~500 output tokens.
- Escalation happens only at the coordinator/main-agent level (subagents cannot spawn subagents). The escalation prompt carries paths, not content: change name, failing-step or ambiguous-decision location, artifact paths, and the structured failure report inline.
- Hook mid-advisor into `sai/instructions/apply.md` with mechanical triggers read from the subagent report: RED result = `passes` or `wrong-failure`; GREEN result = `fail` (the subagent's own GREEN iteration is the local correction attempt — the coordinator never edits code or runs tests itself, per `apply-step-delegation`); the report states the playbook step references a nonexistent symbol. Cap: 1 escalation per step, then halt to the user as today. Corrective actions are applied by dispatching a corrective step-execution subagent.
- Hook senior-advisor into `sai/instructions/implement.md` with reactive triggers (design.md ambiguous/self-contradictory, contradicts codebase reality, or a decision proves unimplementable while writing the step's code) and proactive triggers (two-plus viable approaches with materially different trade-offs that design.md does not settle; a promising approach design.md did not anticipate). Cap: 2 escalations per step/decision; after the cap, reactive → halt to user, proactive → adopt the advisor's recommendation.
- New scope stays a user decision: advice requiring new services, dependencies, or architectural decisions must set `escalate-to-user`.
- Applied advice is recorded as a deviation in the plan appendix (reactive) or in the step's rationale (proactive). Existing verification and deviation mechanics are unchanged.
- Register bindings in `configs/opencode.jsonc` (`agent.mid-advisor.model`, `agent.senior-advisor.model`) and `agents/copilot/{mid,senior}-advisor.agent.md`.
- Document the advisor family in README `## Skills` and `## Cost-Effective Strategies`.

Non-goals: no per-commit verification gate; no native Anthropic advisor tool API; no changes to the budget-* skills' no-self-correction discipline; no advisor for sai-1/sai-2 or the audit phases (sai-5 through sai-8).

## Capabilities

### New Capabilities
- `advisor-skill-behavior`: universal advisor contract — read-only consultation, read budget, structured advice report with `escalate-to-user` flag, output cap, new-scope refusal.
- `advisor-platform-bindings`: per-harness bindings for both advisors — Claude Code (Agent tool + model override at the consulting phase's superior tier), opencode (`agent.<name>.model` in opencode.jsonc), GitHub Copilot (`agents/copilot/*.agent.md`).
- `apply-advisor-escalation`: mid-advisor escalation from the sai-4-apply coordinator — mechanical triggers, one-local-fix-first rule, cap of 1 per step, paths-not-content prompt, deviation recording, halt on unresolved.
- `implement-advisor-escalation`: senior-advisor escalation from sai-3-implement — reactive and proactive triggers, cap of 2 per step/decision, post-cap rules (halt vs adopt recommendation), rationale recording.

### Modified Capabilities

(none — existing apply/implement specs do not mandate the direct halt; escalation is additive coordinator/author behavior, and the subagent report contract, coordinator authority, verification, and STOP & COMMIT requirements are untouched)

## Impact

- **New files**: `skills/claude/mid-advisor/SKILL.md`, `skills/opencode/mid-advisor/SKILL.md`, `skills/copilot/mid-advisor/SKILL.md`, and the same trio for `senior-advisor`; `agents/copilot/mid-advisor.agent.md`, `agents/copilot/senior-advisor.agent.md`.
- **Modified files**: `sai/instructions/apply.md` (mid-advisor triggers + cap in the coordinator workflow), `sai/instructions/implement.md` (senior-advisor triggers + cap), `configs/opencode.jsonc` (two new `agent` entries), `README.md` (Skills table + Cost-Effective Strategies subsection).
- **No changes** to budget-* skills, sai-1/sai-2 commands, audit phases, or the openspec schema.
- **Cost impact**: each escalation spawns one higher-tier subagent with a bounded read budget and ~500-token output — cheaper than a human round-trip, bounded by per-step caps.

## Proposal Research Documentation

**Local files**:
- `skills/claude/budget-executor/SKILL.md` (family structure + Claude Code binding pattern)
- `configs/opencode.jsonc` (opencode `agent.<name>.model` binding pattern)
- `agents/copilot/budget-executor.agent.md` (Copilot agent frontmatter pattern)
- `sai/instructions/apply.md` (coordinator workflow, RED/GREEN validity, malformed-report halt, STOP & COMMIT checklist)
- `sai/instructions/implement.md` (design.md consumption, STOP conditions, re-run guard)
- `README.md` (`## Skills`, `## Cost-Effective Strategies`)
- `openspec/specs/apply/spec.md`, `openspec/specs/apply-coordinator-authority/spec.md`, `openspec/specs/apply-subagent-report-contract/spec.md`, `openspec/specs/implement-red-phase-contract/spec.md` (confirmed escalation is additive, no modified requirements)
- `GLOSSARY.md`

**External URLs**: (none — pattern reference to Anthropic's advisor-tool concept supplied by the user in the request)

## Additional Notes

- The budget-* family precedent: `skills/universal/` holds only harness-agnostic loaders (`budget`, `safe-operations`, `sai-commands`, `token-efficient-languages`); concrete bindings live per-harness. The user confirmed per-harness placement for the advisors (deviating from the request's original `skills/universal/` wording).
- opencode agent entries use `"mode": "subagent"` and a model string (e.g. `"executor": { "mode": "subagent", "model": "opencode-go/deepseek-v4-flash" }` at `configs/opencode.jsonc:20-36`). Advisor entries must resolve to the same models the harness uses for sai-3 (mid) and sai-2 (senior).
- Copilot has no model override on spawn; its `*.agent.md` frontmatter pins the model (budget family uses `model: GPT-5 mini (copilot)`), so advisor agent files pin the sai-3/sai-2-tier Copilot models instead.
- `apply-subagent-report-contract` line 36 already leaves "the coordinator can act on the invalid RED" open — `apply-advisor-escalation` defines that action. The executor subagent's no-self-correction discipline is untouched: escalation is strictly a coordinator move after receiving the report.
- The advisor tier sits between "mechanical retry" and "ask the user"; the structured failure report is passed inline in the escalation prompt because it is small and not persisted on disk.
- Rationale for paths-not-content prompts: pasted content is re-billed on every remaining coordinator turn, output tokens cost ~5x input, and the smarter model selects context better than a cheap coordinator excerpting for it.
