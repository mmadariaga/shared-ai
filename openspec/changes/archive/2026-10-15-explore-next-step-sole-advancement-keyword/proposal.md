> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The `Implementation details` closing reminder carried a second advancement instruction (the mandatory `crystallize` sentence) next to `next-step`, and several `sai-explore` instruction files prescribed fixed responses to natural-language crystallization requests (asking to crystallize, asking for the paste-ready block, asking to create a proposal or run `/sai-1-spec`). That contradicted ADR 0137a, which fixes `next-step` as the single literal advancement token.

## What Changes

- `sai/commands/explore/steps/common.md`: the stage-3 (`Implementation details`) closure reminder names `next-step` only; the sentence "Say `crystallize` when ready; crystallization generates the paste-ready prompt for `/sai-1-spec`." is removed. The Emission gate's trigger list (crystallize, paste-ready block, proposal, `/sai-1-spec`) and the pending-request rule are removed: the full `Ready to Propose` block(s) print only inside the `Crystallize` stage, which `next-step` reaches after the agreed edge-case and implementation-details lists. The staged-progression advancement rule drops "clear natural-language intent naming the next stage or requesting crystallization" and the premature-`crystallize` carve-out; entering `Crystallize` (not an explicit crystallization request) transitions the Closure State and starts the crystallization sequence. The material-change reset no longer clears a pending crystallization request.
- `sai/commands/explore/steps/crystallization-language-gates.md`: the crystallization language gate fires on entry into the `Crystallize` stage instead of on an explicit crystallize request from the Emission gate's trigger list.
- `sai/commands/explore/steps/crystallization-protocol.md`: the single-change and sliced protocols start on entry into `Crystallize`; the item-7 inline proposal refusal path and its exclusion from the shared close are deleted with no replacement rule.
- `sai/commands/explore/steps/route-selector.md`: the inline-refusal handoff text and its exclusion note are deleted.
- `sai/commands/explore/steps/review-edge-cases.md`: the review runs only when the user advances into `Review edge cases`; the pending-crystallization-request state and the `Pending crystallization` bullet are deleted.
- `sai/commands/explore/steps/slicing-assessment.md`: entering `Crystallize` starts the crystallization sequence; `crystallize` and natural-language advancement are removed from the stage-entry equivalence list, and the direct-crystallization-request sentence is deleted.
- Tests updated to pin the new text and the retirement of the old: `test/change-overview-contract.test.js`, `test/explore-contract-preservation.test.js`, `test/explore-pipeline-selector.test.js`, `test/explore-pre-crystallization-stages.test.js`, `test/install-claude.test.js`, `test/install-opencode.test.js`.
- The `sai-state` stage machine is unchanged; its only advance intent is already `next-step`. One shared `sai/` instruction set serves both Claude Code and opencode.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `explore-pre-crystallization-closure`: the stage-3 reminder names `next-step` only, without the `crystallize` sentence; entering `Crystallize` starts the crystallization sequence.
- `explore-pre-crystallization-stages`: `next-step` (plus semantic list confirmation and deterministic empty-set advancement) is the only defined advancement; natural-language and `crystallize` requests carry no prescribed response; no pending crystallization request is held.
- `explore-crystallization-on-demand`: the block prints only inside the `Crystallize` stage; the explicit-request trigger list and the inline-proposal path are removed.
- `explore-crystallization-language-gate`: the gate fires on entry into `Crystallize`; the inline-proposal trigger is gone.
- `crystallization-close`: no inline-refusal path exists outside the shared close or its checkpoint.
- `explore-crystallization-block`: the shared close has no inline proposal refusal exception.
- `explore-edge-case-review`: the review starts only on advancement into `Review edge cases`; no pending crystallization request exists.
- `explore-edge-case-gate`: a premature crystallization request is not retained; crystallization starts only on entry into `Crystallize`.
- `crystallization-implementation-details`: the premature-crystallization pass-through requirement is removed.
- `explore-stage-choice-selectors`: natural-language advancement equivalents and the pending crystallization request are removed from selector rules.
- `explore-progression`: `crystallize` carries no defined action and is never retained as pending.
- `explore-vertical-slicing`: single and sliced protocols run on entry into `Crystallize`.
- `explore-refactor-first-slicing`: slice-0 emission runs on entry into `Crystallize`.
- `mode-specific-explore-todo`: the route selector no longer owns an inline-refusal immediate handoff.
- `dedup-nonnumbered-wrappers`: the Context Isolation block no longer contains an inline proposal refusal.
- `explore-closure-state`: entering `Crystallize` (not an explicit request) leads to the `crystallized` state.

## Impact

Modified files:

- `sai/commands/explore/steps/common.md`
- `sai/commands/explore/steps/crystallization-language-gates.md`
- `sai/commands/explore/steps/crystallization-protocol.md`
- `sai/commands/explore/steps/review-edge-cases.md`
- `sai/commands/explore/steps/route-selector.md`
- `sai/commands/explore/steps/slicing-assessment.md`
- `test/change-overview-contract.test.js`
- `test/explore-contract-preservation.test.js`
- `test/explore-pipeline-selector.test.js`
- `test/explore-pre-crystallization-stages.test.js`
- `test/install-claude.test.js`
- `test/install-opencode.test.js`

New files: none.

Users reach `Crystallize` through `next-step` alone; requests such as "create the proposal" lose their deterministic handoff and are interpreted in context.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Undecided: whether ADR 0137a is amended or a new ADR records this decision; `/sai-2-design` settles it.
