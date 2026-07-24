## Why

A plan for the same change produced by a generic agent, read as a *format audit* of our pipeline rather than as a technical proposal, carried six kinds of information the sai-2-design artifact contract has no slot for. One of them exposed a real defect: the commit-atomicity verification checklist in `sai/instructions/design.md` reasons only about production callers, so a step that changes a signature and breaks the test project is still designated a buildable commit boundary.

## What Changes

- **`interfaces.md` gains a `## Target State` section** — the finished shape (payload, public signature, schema) as one concrete artifact, emitted before any per-step `## Step N` section, so a reader sees the destination before the path.
- **`design.md` Decisions gain a provenance marker** — each Decision is tagged `user` / `derived` / `codebase-forced` so a reader can tell which decisions are re-litigable and which are constraints.
- **`design.md` Risks gain an optional verify-first ordering marker** — a risk may name the `## Step N` it gates, and `tasks.md` step ordering must consume that marker as an ordering constraint.
- **`tasks.md` steps gain an existing-tests-broken field** — each step declares which existing tests the change breaks and by what failure mode (compile vs runtime), with central/shared fixtures ordered first.
- **BREAKING (rule correction): the commit-boundary verification checklist is extended to test compilation units** — a step whose snapshot breaks the test project's compilation is no longer a valid commit boundary. This tightens `atomic-commit-planning`; step decompositions that were previously valid may now need merging.
- **`design.md` gains a closing `## Manual Verification` section** — checks that are cheap manually and expensive as automated tests: generated-artifact drift (migrations, snapshots, designer files) and end-to-end smoke.
- **`design.md` gains a `## Deferred` section** — decisions that are not open questions (they do not block design) but get expensive to postpone; each item states the cost of postponing plus a recommendation.

## Capabilities

### New Capabilities

- `design-target-state`: `interfaces.md` opens with a `## Target State` section giving the finished shape as one concrete artifact, before any per-step section.
- `design-decision-provenance`: every Decision in `design.md` carries a `user` / `derived` / `codebase-forced` provenance marker.
- `design-risk-ordering`: a risk in `design.md` may carry a verify-first marker naming the step it gates, and `tasks.md` derivation consumes it as an ordering constraint.
- `tasks-existing-test-impact`: every `## Step N` in `tasks.md` declares which existing tests the change breaks and by what failure mode, with central fixtures ordered first.
- `design-manual-verification`: `design.md` ends with a `## Manual Verification` section for generated-artifact drift checks and end-to-end smoke.
- `design-deferred-decisions`: `design.md` carries a `## Deferred` section, each item stating the cost of postponing plus a recommendation.

### Modified Capabilities

- `atomic-commit-planning`: the *Commit boundary verification checklist* requirement is extended so the checklist reasons over test compilation units, not production callers alone. A step that leaves the test project uncompilable is not a valid commit boundary, and a boundary never leaves the suite red.
- `design-interfaces-artifact`: the *interfaces.md is keyed by Step N to tasks.md* requirement currently mandates that `interfaces.md` be organized as one `## Step N` section per step. It is amended to admit exactly one leading non-step section — `## Target State` — and no other.
- `tasks-scaffold-format`: the *tasks-artifact-format* requirement enumerates the step sub-fields exhaustively, and the *Routing line position is invariant* scenario pins their order. Both are amended for the fifth sub-field `**Existing Tests Broken**`, appended last so the original four keep their relative order.

## Impact

- `sai/instructions/design.md` — the single file that owns the artifact format contract for all three design artifacts (`design.md`, `tasks.md`, `interfaces.md`). All six additions and the checklist correction land here.
- `sai/instructions/implement.md` — potentially touched only if `## Manual Verification` needs a consumer in the implement phase; the spec phase does not commit to that.
- `openspec/specs/atomic-commit-planning/spec.md`, `openspec/specs/design-interfaces-artifact/spec.md`, `openspec/specs/tasks-scaffold-format/spec.md` — the three modified requirements' home capabilities. Two of these describe artifact structure normatively, so the new sections cannot land without amending them.
- No production code is touched. Instruction files and OpenSpec specs only.
- Downstream phases: `/sai-3-implement` reads `tasks.md` and `design.md`, so richer steps reach it automatically. `/sai-5-review` coverage is explicitly unchanged.

## Proposal Research Documentation

**Local files**:
- `sai/instructions/design.md` (whole file — the artifact format contract: design.md sections at :62-89, tasks.md structure at :91-175, commit atomicity at :147-160, interfaces.md at :177-195)
- `openspec/specs/atomic-commit-planning/spec.md` (whole file — the four requirements, checklist at :51-68)
- `openspec/specs/design-interfaces-artifact/spec.md` (whole file — existing `interfaces.md` structure contract)
- `openspec/specs/design-instruction/spec.md` (requirement titles only)
- `openspec/specs/design-quality/spec.md` (requirement titles only)
- `openspec/specs/tasks-scaffold-format/spec.md` (requirement titles only)
- `openspec/specs/tasks-authoring-rules/spec.md` (requirement titles only)

**External URLs**: None

## Additional Notes

- **Existing anchors the designer must respect.** `sai/instructions/design.md:66-76` lists the required `design.md` sections (Context, Goals/Non-Goals, Decisions, Risks/Trade-offs, Migration Plan, Open Questions) — `## Manual Verification` and `## Deferred` extend that list. `design.md:154-160` holds the four-item verification checklist that the `atomic-commit-planning` correction targets. `design.md:183-195` holds the `interfaces.md` per-step structure that `## Target State` precedes. `design.md:101-110` holds the `## Step N` field block (`**Routing**`, `**Files Affected**`, `**What Will Be Done**`, `**Testing Strategy**`) that the existing-tests-broken field joins.
- **`## Deferred` vs `## Open Questions` are not the same gate.** `design.md:80-89` makes Open Questions blocking: design may not proceed to `tasks.md` until each is answered by the codebase or resolved by the user. `## Deferred` items are explicitly *non-blocking* — they must not be routed through the Open Questions gate, or the distinction collapses.
- **Six capability specs in one change is deliberate.** They share one integration point (`sai/instructions/design.md`) and one reviewer, and each edit is a small prose delta; slicing would cost six review cycles for the same diff. If the design phase finds the deltas are not co-located after all, revisit the cut before running `/sai-2-design`.
- **The checklist correction is a defect fix riding along.** It ships with `tasks-existing-test-impact` because the field is the artifact surface and the checklist is the rule that makes the field load-bearing — split, the field would be a slot nothing enforces. It is kept visible as its own Modified Capability rather than folded into the new one.
- **Trade-off accepted:** five of the six additions make design artifacts longer. Only `## Target State` reduces entry cost. Artifact economy is a separate problem and is a non-goal here.
- **Trade-off accepted:** provenance markers depend on the design agent honestly recording who decided what. Nothing enforces them mechanically; the requirement is a discipline, not a validator.
- **`design-quality`'s summary vocabulary is deliberately left unchanged.** `openspec/specs/design-quality/spec.md:9-12` defines the sai-2 decision summary as three blocks — Decisions, Risks, Resolved Open Questions — under a 15-line cap. `## Deferred` items and `## Manual Verification` checks are not summarized, and the Decisions line does not carry the provenance token. This is a decision, not an oversight: none of the six additions add items to those three blocks, so cap pressure is unchanged, and the summary's job is to surface what was *decided*, not to mirror every section of `design.md`. Revisit only if deferred items start being missed in review.
- **`compile` vs `runtime` is effort information, not a boundary discriminator.** Both failure modes must be resolved inside the step that causes them — a commit boundary that leaves the suite red is not a boundary. The distinction earns its place by telling the implementation phase which breakages are mechanical (`compile`, bulk-fixable) and which need per-test judgment (`runtime`).
- **Non-goals:** reducing total artifact length; changing what `/sai-5-review` covers; touching any production code.
