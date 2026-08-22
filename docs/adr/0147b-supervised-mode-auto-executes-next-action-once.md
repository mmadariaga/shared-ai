# ADR 0147b: Supervised mode auto-executes next-action exactly once

<!-- adr-index: refs ddr:0150; refs 0028 -->

## Status

Accepted

## Context

Under supervised Auto, the artifact feedback gate must not present a picker after convergence, cap exhaustion, or empty findings, yet both explore gate sites remain phase sequencers (spec→design; design→overview). Removing the gate call or inlining auto-proceed in explore would fork sequencer ownership.

This is change `supervised-artifact-gate-suppression`, Decision D2.

## Decision

When `mode = supervised` and the deferred-gate condition resolves, the shared gate performs the site's supplied `next-action` exactly once without presenting choices, free-text, or incrementing the iteration counter. Execution stays in the shared policy; explore only supplies parameters. Failed or cancelled workers never reach this branch.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Shared-policy auto-execute next-action once (chosen) | Single sequencer; no drift of proceed semantics | Supervised branch must be mode-qualified everywhere in the policy |
| Explore inlines auto-proceed outside the policy | Explore-local control | Forks sequencer ownership; invites drift |
| Skip calling the gate under Auto | No gate code path under Auto | Loses single-sourced next-action and placement relative to decision summary |

## Consequences

- Supervised mode is a presentation/proceed branch, not a deleted gate call.
- Iteration counter remains 0 for the whole supervised run.
- Structural tests pin exact-once next-action and no approval-state writes.

## Related

- `openspec/changes/supervised-artifact-gate-suppression/design.md` — Decision D2
- `openspec/changes/supervised-artifact-gate-suppression/specs/artifact-feedback-gate/spec.md`
- DDR 0150 — mode parameterized at fetch site
- ADR 0028 — gate parameters inline at fetch site
