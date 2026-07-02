# ADR 0017: Same-model Step-execution dispatch via omitted `model:` parameter

## Status

Accepted

## Context

`delegate-apply-steps-to-subagent` turns `sai/instructions/apply.md`'s main thread into a coordinator that dispatches each `implementation.md` Step's RED→GREEN execution to a subagent. The proposal requires this Step-execution subagent to run on the **same model as the coordinator** — not a cheaper tier — because RED→GREEN judgment quality must not degrade. This is an explicit, scoped exception to the budget skills' default (`budget-executor`'s "always pass `model: haiku`"; `sai/instructions/remember.md`'s cost-discipline rule).

There is no reliable way for `apply.md`'s instructions to introspect the coordinator's own exact running model id at runtime and pass it as an explicit string — any hardcoded value would drift out of sync with whatever model is actually coordinating a given session.

## Decision

Dispatch the Step-execution subagent with `subagent_type: general-purpose` (full tool access — Bash, Read, Write, Edit; required for RED/GREEN execution, unlike the read-only `Explore` type) and **no `model:` parameter**. The Agent tool's own documented contract states: "If omitted, uses the agent definition's model, or inherits from the parent" — this is the only mechanism guaranteed to track whatever model the coordinator is actually running as. `apply.md` states this inline, at the dispatch instruction, as a deliberate exception to the budget skills' default.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Hardcode a model id string matching the coordinator | Explicit, easy to read | No reliable introspection mechanism exists; the string would drift out of sync with whatever model is actually coordinating |
| Omit `model:` to inherit from parent (chosen) | Guaranteed to track the coordinator's actual model per the Agent tool's own contract; no drift risk | Silently depends on the Agent tool's inheritance default continuing to work this way |

## Consequences

- If a future edit to `apply.md` naively "fixes" what looks like a missing `model:` parameter (matching the budget skills' usual pattern), it will silently reintroduce cheap-tier dispatch and degrade RED→GREEN judgment quality without an obvious failure signal.
- If the Agent tool's inheritance-on-omission default ever changes, this dispatch site silently breaks; `apply.md`'s inline documentation of the intent is the only safeguard until the next audit.
- This is the one dispatch site in the repo where the budget skills' "always pass an explicit `model:`" rule does not apply — implementers must not "fix" it to match the usual pattern.

## Related

- `openspec/changes/delegate-apply-steps-to-subagent/design.md` — Decision D1
- `openspec/changes/delegate-apply-steps-to-subagent/specs/apply-step-delegation/spec.md` — "Subagent runs on the same model as the coordinator"
- `openspec/changes/delegate-apply-steps-to-subagent/proposal.md` — Additional Notes ("Same model as the coordinator" is a hard requirement)
