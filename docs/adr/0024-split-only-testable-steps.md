# ADR 0024: Split into two dispatches ONLY for testable Steps, keyed by the already-authored RED block

## Status

Accepted

## Context

`sai-4-apply` currently dispatches exactly one subagent per Step. Slice 2 introduces a blind test-writer + implementation split to close the code-body mirroring channel. The question is whether to split uniformly (every Step) or selectively (only Steps that actually have tests to write).

## Decision

Split into two ordered dispatches **only for testable Steps** — Steps whose body contains a `##### RED phase` block. Non-testable Steps (config, migration, scaffolding, service-side logic) keep the existing single-dispatch flow unchanged. The existing testability signal ("the Step body includes a RED block") is reused verbatim.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Split only testable Steps (chosen) | Avoids empty test-writer dispatches for Steps with no testable surface; preserves commit boundaries for non-testable work; minimal disruption to existing flow | Slightly more complex coordinator logic (two dispatch paths instead of one) |
| Split every Step uniformly | Simpler coordinator logic (always two dispatches); consistent mental model | A non-testable Step has no RED and no `interfaces.md` section to feed a blind writer, creating an empty dispatch and a needless second commit boundary |

## Consequences

- The coordinator must detect the RED-block presence to choose the dispatch path.
- Non-testable Steps remain single-dispatch, preserving the pre-split efficiency and commit model.
- Testable Steps gain a second commit boundary (test-writer commit, then implementation commit), which is the intended cost of closing the mirroring channel.

## Related

- `openspec/changes/consume-interfaces-artifact/design.md` — Decision D2
- `openspec/changes/consume-interfaces-artifact/specs/apply-step-delegation/spec.md` — "non-testable Step is dispatched" / "testable Step is dispatched"
- `sai/instructions/apply.md` — `## Step-Execution Subagent Dispatch` section updated by this change
