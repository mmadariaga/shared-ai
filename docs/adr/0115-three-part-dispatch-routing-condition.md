# ADR 0115: Three-part dispatch-routing condition (RED block, Step Contract, AND production surface)

## Status

Accepted

Supersedes the routing rule of `docs/adr/0071-two-part-dispatch-routing-condition.md`.

## Context

`sai-4-apply` routed each Step by a two-part condition (ADR 0071): the two-dispatch flow was selected if and only if the Step carried a `##### RED phase` block AND an available `## Step N` Step Contract. Both parts could hold for a Step whose plan-level file scope contains no production file — a test-only probe or interfaces-only scaffolding Step. Such a Step is testable (part 1) and contract-backed (part 2), so it routed to the two-dispatch flow, where the implementation dispatch's allowed-files list derives empty ("Implementation Dispatch Allowed files contain only plan-authorized production files and exclude tests and declared interfaces", apply.md:244) — the implementation dispatch has nothing it may touch. Observed in change `2026-08-06-deterministic-worker-contract-delivery` Step 1 (probe `test/manual-opencode-contract-smoke.js`): bounded GREEN iteration could not progress, the GREEN-conflict STOP halted the run, and the probe had to be landed by hand in commit `413e474`.

## Decision

The routing condition gains a third part; the two-dispatch flow is selected **if and only if all three** parts hold; if **any** part fails, the Step routes to a single dispatch:

1. the Step's body contains a `##### RED phase` block — the property that makes the Step **testable**, **and**
2. a **Step Contract** is available for that Step: `interfaces.md` exists for the change and contains a `## Step N` section whose integer `N` matches the Step's `implementation.md` `## Step N` heading, **and**
3. the Step's plan-level file scope contains at least one **production file** — the property that makes the Step **divisible**: a plan-authorized file the coordinator's existing allowed-files derivation classifies as production, neither a test file nor a declared interface.

A Step that is testable but not divisible — its plan-level file scope contains no production file, so an implementation dispatch would have an empty allowed-files list — SHALL NOT be split: the coordinator routes it to a single dispatch, exactly as it routes a Step that fails part 2. Part 3 is absence-based: it asks whether at least one production file exists in the Step's plan-level file scope, never whether every file is a test — a Step scoped solely to test files and a Step scoped solely to declared interfaces both have no production file, both derive an empty implementation allowed-files list, and both fall back to a single dispatch. The part-3 classification reuses the coordinator's existing test-vs-production derivation verbatim; no new filename heuristics are introduced.

The single-dispatch fall-back for RED-carrying Steps therefore covers two independent, additive absence shapes — contract-absent (part 2) and no-production-surface (part 3) — each announced by its own pinned non-blocking trace line before dispatch; a Step triggering both emits both lines, contract-absent first.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Three-part plan-scope condition (chosen) | Deterministic from the plan; reuses the existing classification; keeps routing a planning-time property | Adds a third clause to the routing paragraph |
| Keep the two-part condition and tolerate an implementation dispatch with an empty allowed-files list | No wording change | Manufactures a second, silent dispatch that performs no work and hides the plan defect |
| Derive routing at dispatch time from the derived allowed-files list | No plan-level condition | Couples the routing decision to a per-dispatch derivation artifact rather than the plan-level scope the specs already define |

## Consequences

- A production-free Step (test-only probe, interfaces-only scaffolding) routes to a single dispatch that authors the test from the Step's own scenario descriptions and runs the RED → GREEN cycle itself — no GREEN-conflict STOP for a scope the implementation dispatch cannot touch.
- The routing vocabulary separates "testable" (RED block) from "divisible" (production surface): a RED block alone never licenses the two-dispatch flow.
- The wording is enforced byte-exactly by structural pins in `test/apply-coordinator-verification.test.js`, so routing-prose drift fails the suite instead of surfacing as a dead-ended run.
- Backward compatible for Steps that satisfy all three parts — they keep the two-dispatch flow; only the previously-dead-ended shape (RED block, contract available, no production file) changes, from "halt on an empty allowed-files list" to "run as a single dispatch".

## Provenance

Derived — the third part and its absence-based formulation were reasoned from the observed dead-end (change `2026-08-06-deterministic-worker-contract-delivery`, commit `413e474`); the design records it as Decision 1 with the `adr` family marker.

## Related

- `docs/adr/0071-two-part-dispatch-routing-condition.md` — superseded routing rule (two-part condition); not modified.
- `docs/ddr/0109-testable-and-divisible-are-distinct-step-properties.md` — the vocabulary separation this condition relies on.
- `sai/instructions/apply.md` — `## Step-Execution Subagent Dispatch` (three-part condition, two-shape fall-back, three single-dispatch shapes, ambiguity-only guard).
- `openspec/changes/route-test-only-steps-to-single-dispatch/` — proposal, design (D1–D6), and the two capability deltas.

<!-- adr-index: supersedes 0071 -->
