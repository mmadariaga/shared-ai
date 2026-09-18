> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The POC lane only fired for third-party technical viability, it sat inside `Crystallize` — after the edge-case review and the implementation-details stage whose answers it exists to inform — and it reported a binary `viable`/`not viable` verdict that could not express which of several competing strategies or root-cause theories actually won. Implementation details and scope boundaries cannot honestly be fixed for an idea whose central question the POC exists to resolve, and a bug with competing root-cause theories has exactly the same shape as an unproven integration: a set of competing candidates plus one experiment that discriminates them.

## What Changes

- The POC lane becomes a **conditional stage** of `explore-idea@1` (stage id `poc-lane`) between `explore-change` and `review-edge-cases`. `sai-state/machines/explore-idea.js` adds it to `STAGES`, marks it in a new `CONDITIONAL_STAGES` list, and makes ordinary `next-step` advancement step over every conditional stage, so the stage is reachable only through its own entry intent.
- The uncertainty axis moves out of the joint stage-4 slicing assessment to the close of stage 1. `slicing-assessment.md` now runs TWO assessments (size and integration-point friction) with two-axis routing; `common.md` gains the **POC trigger** section that owns the two motives, the no-fire test, and the go/no-go picker.
- The trigger fires on either of two motives: **technical viability** (competing strategies for an unproven integration) or **bug diagnosis** (competing root-cause theories for an unestablished cause). It never fires for product or UX uncertainty, and it does not fire when mutually exclusive candidates with a discriminating observable cannot be formulated.
- The go/no-go options are `Yes, run a POC before continuing` and `No, continue without a POC`; declining continues to `Review edge cases` with the technical risk accepted and is never re-litigated for that idea.
- `poc-lane.md` is rewritten to own the lane from candidate agreement onward: a new `C1..Cn` agreement stop reusing the `E1..En` confirmation and revision mechanics, the pinned POC execution, reversible isolation, the verdict, and the verdict menu. It no longer states the trigger.
- The verdict generalizes from `viable`/`not viable` to `<Cn> wins` or `none`, and it never names a candidate outside the agreed list: a cause or strategy the POC reveals that was not on the list makes the verdict `none`. The post-verdict menu reduces to two branches — `Continue with <Cn>` (advance to `Review edge cases` with the proven change or the proposed fix) and `Stay here`; a `none` verdict presents no advancement option, reports what was learned, and waits.
- The POC is discarded by **reversible isolation** — its own branch or worktree, abandoned when the lane closes — never by destructive deletion of the working tree. Because the repository the lane leaves behind is the one it found, size and friction at stage 4 judge the original repo.
- The Direct Build `--no-specs` profile is pinned: `pipeline-direct-build.md` states it is reachable only from inside the lane and that `--fast-track` cannot alter it, and `route-selector.md` states the selector never offers it as Plan, as Manual, or as a fourth option.
- `crystallization-protocol.md` states no part of the lane and no longer routes into it; the `crystallize-resume` return route and the uncertainty preconditions on protocols (5) and (6) are removed.
- `common.md` declares the post-POC return exception to material-change detection and the conditional fifth stage-TODO entry (`POC`, inserted between `Explore change` and `Review edge cases`, kept for the rest of the progression); the stage-id list and the repeated-follow hint table gain `poc-lane`.
- `sai/policies/fast-track-flag.md` replaces the uncertainty-pause divergence entry with the lane's three stops (go/no-go, candidate-list agreement, verdict menu) and the pinned profile.
- `README.md` and `docs/on-demand-commands.md` reword the POC description to the two-motive, candidate-discriminating, before-the-edge-case-review form.
- `sai-state/machines/explore-idea.js` retires `ROUTE_FILES`, `LANE_ROUTES`, and the persisted `route` field; adds a `candidateList` owned by the `poc-lane` stage and a persisted `pocLane` boolean that survives leaving the lane; and collapses six duplicated snapshot constructions into one `result()` helper built on `cloneState`.
- `test/explore-idea-intent-gate.test.js` and `test/explore-step-reachability.test.js` are rewritten for the conditional stage: entry from `explore-change`, ordinary advancement skipping the stage, `pocLane` surviving the exit, candidate recording without advancement, empty-candidate-list never auto-advancing, rejection of the entry intent outside stage 1, and `crystallize-resume` reduced to an unknown intent.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `explore-viability-poc-pause` — the lane becomes a conditional stage evaluated at the close of stage 1, gains a candidate-agreement stop and reversible isolation, and replaces the binary verdict and both post-POC menus with `<Cn> wins` / `none` and a two-branch verdict menu; the crystallization return route is retired.
- `explore-technical-uncertainty-assessment` — the uncertainty axis leaves the slicing assessment entirely and is evaluated at the close of stage 1; the post-POC size and friction re-evaluation is retired because the lane leaves the repository untouched.
- `explore-vertical-slicing` — the pre-crystallization slicing assessment runs two orthogonal judgments (size and integration-point friction) instead of three, with no uncertainty routing and no post-POC re-evaluation.
- `explore-pre-crystallization-stages` — the stage TODO gains a conditional fifth `POC` entry that only appears when the lane fires and then persists, and the automatic post-POC return is declared not a material change.
- `explore-stage-machine` — `explore-idea@1` gains a conditional stage entered only by its own entry intent at `explore-change`, a stage-owned `candidateList`, and a persisted `pocLane` flag, replacing the routing-only lane intents and the persisted `route` pointer.
- `explore-direct-build-no-specs` — the profile is dispatched by the conditional POC stage, returns a candidate-naming verdict, and is pinned against Plan, Manual, the crystallization-close selector, and `--fast-track`.
- `explore-crystallization-on-demand` — an explicit crystallization request no longer enters an uncertainty pause; any POC has already closed before crystallization runs.
- `explore-context-isolation` — POC dispatch authority is keyed to the stage-1 go/no-go option and the POC's writes are confined to its own branch or worktree.
- `explore-closure-state` — running the lane never transitions the Closure State, and no verdict branch marks the idea discarded.
- `sai-fast-track-flag` — fast-track's explore non-bypass set becomes the lane's three stops plus the lane's pinned execution profile.

## Impact

Modified files:
- `README.md`
- `docs/on-demand-commands.md`
- `sai-state/machines/explore-idea.js`
- `sai/commands/explore/steps/common.md`
- `sai/commands/explore/steps/crystallization-protocol.md`
- `sai/commands/explore/steps/pipeline-direct-build.md`
- `sai/commands/explore/steps/poc-lane.md`
- `sai/commands/explore/steps/route-selector.md`
- `sai/commands/explore/steps/slicing-assessment.md`
- `sai/policies/fast-track-flag.md`
- `test/explore-idea-intent-gate.test.js`
- `test/explore-step-reachability.test.js`

Known limitations and technical debt left behind:
- The lane adds one extra agreement stop before the POC runs, accepted so a full POC cycle is not spent on the wrong hypotheses.
- Once the go/no-go is declined for an idea, the lane cannot be triggered again for it; the late explicit gate that would cover that case ships as its own change and is not implemented here.
- Non-goals: product and UX uncertainty still never trigger the lane, and the size and friction axes are unchanged and stay in stage 4.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
