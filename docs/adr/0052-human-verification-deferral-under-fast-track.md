# ADR 0052: Human-Verification deferral under `--fast-track` with bounded-failure semantics

## Status

Accepted

## Context

`sai-4-apply` normally presents Human Verification checkboxes mid-Step and waits for the user before marking them `[x]`. Under `--fast-track`, the user opted in to trade per-step gates for speed, but the checks themselves must still be visible and verified. The question is where and when to present them, and whether checkboxes can be marked ahead of human review.

## Decision

Under fast-track, per-Step Human Verification checkboxes are accumulated in the coordinator's in-conversation memory and marked `[x]` after that Step's automated checks pass (ahead of human review). The combined list is presented once, in Step order, after the Final sweep and before the MANDATORY STOP. A Step whose Human section holds only an italic note contributes nothing. This is the documented trade-off of the deferral: if an end-of-run check surfaces a problem, every prior Step has already committed.

## Alternatives Considered

- **Keep mid-Step human gates even under fast-track** — rejected: it negates the speed benefit the user explicitly requested.
- **Drop human checks entirely under fast-track** — rejected: removes necessary verification and violates the "fixed, audited list of opt-outs" principle.

## Consequences

- The run proceeds without mid-Step pauses, preserving the fast-track speed benefit.
- Bounded-failure semantics: the Step-ordered combined list makes corrective re-runs target only the failing Step.
- The divergence from the no-flag invariant (marking ahead of human review) is confined to the explicit opt-in and announced by the banner.

## Related

- `openspec/changes/add-fast-track-flag/design.md` — Decision D5
- `openspec/changes/add-fast-track-flag/specs/sai-fast-track-flag/spec.md` — Human-Verification deferral requirement
