> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The `explore-idea@1` stage machine auto-advanced an empty implementation-details list on an intent-less emit, while the dispatchable contract of `ready-to-propose.js` rejected a block with no in-scope `I` item, so an empty list reached `Crystallize` and then failed validation. Documentation, configuration, and trivial changes have no technical decision, and the old rule forced no-op filler items. The per-slice split of `I` items was enforced by prose only, so a duplicated or unowned `I` passed validation.

## What Changes

- `sai-state/machines/explore-idea.js`: an empty recorded implementation-details list no longer auto-advances on an intent-less emit; it advances only on the `next-step` intent. The `issue-shortcut` intent accepts an empty `implementationDetailsList`. The empty edge-case auto-advance at `review-edge-cases` is unchanged.
- `sai/tools/ready-to-propose.js` (`dispatchable` profile): `- None` under `**Implementation Details**` is valid for a single change; `NO_IMPLEMENTATION_ITEM` now applies only to slices of a sliced set. Two new violation codes: `DUPLICATE_IMPLEMENTATION_ITEM` (an `I` appears more than once across a block's two implementation sections) and `UNOWNED_IMPLEMENTATION_ITEM` (in a sliced set, an `I` is in scope of no slice). A shared `I` in scope of several slices stays valid. Header comment and `usage()` updated.
- `bin/sai-state.js`: amending one slice of a stored multi-slice set validates the resulting set with the `dispatchable` profile, so an amendment cannot leave a slice without an in-scope item or an `I` duplicated or unowned; a single stored slice can be amended to `- None`.
- `sai/commands/explore/steps/common.md`, `steps/implementation-details.md`, `steps/slicing-assessment.md`: the `Implementation details` stage proposes exactly `- None` when no technical decision qualifies and advances only on a bare `next-step` or explicit agreement; deterministic empty-set advancement applies to `Review edge cases` only; every slice of a sliced set owns an in-scope item and every agreed `I` is in scope of at least one slice.
- `sai/commands/explore/steps/issue-intake.md`: an issue with no implementation notes shows `- None` as the implementation list in the shortcut question; accepting the shortcut confirms it and sends `[]`.
- `sai/commands/explore/direct-build-worker.md` and `sai/commands/spec/worker.md`: define the `- None` case (implement, or derive proposal and specs, from the request, `Edge Cases`, and `Capabilities in scope`).
- `sai/policies/ready-to-propose-format.md`: template, field rules, and Dispatchable contract describe the new implementation item rules.
- `sai/commands/implement/steps/audit-ingestion.md`: rationale for the escalation block's proposed `I1` reworded; behavior unchanged.
- New ADR `docs/adr/0196-empty-implementation-details-needs-user-confirmation.md` amending ADR 0137a and retiring its "Clear natural-language stage intent also advances the progression" sentence, with index entries in `docs/adr/0000-INDEX.md`; user docs `docs/commands/sai-explore.md` and `docs/commands/sai-1-spec.md` updated.
- Tests updated and added for the empty-list advancement rule, the empty-list issue shortcut, `- None` dispatchability, duplicate and unowned `I` detection, issue conversion without implementation notes, and set validation on amend.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `explore-stage-machine`: an empty implementation-details list advances only on `next-step`; the issue shortcut accepts an empty implementation list.
- `crystallization-implementation-details`: the stage closes empty only on user confirmation of a proposed `- None`; every agreed `I` is in scope of at least one slice.
- `explore-implementation-details`: the stage proposes and confirms `- None`; a single-change block may carry `- None` under `**Implementation Details**`.
- `dispatchable-block-contract`: `- None` is dispatchable for a single change; duplicated and unowned `I` items are not; consuming workers define the empty case.
- `dispatchable-validation-profile`: the profile reports `NO_IMPLEMENTATION_ITEM` only in sliced sets and adds `DUPLICATE_IMPLEMENTATION_ITEM` and `UNOWNED_IMPLEMENTATION_ITEM`.
- `explore-issue-intake`: the shortcut question shows `- None` for an issue without implementation notes.
- `single-slice-amendment`: amending a slice of a multi-slice set validates the resulting set.

## Impact

New files:
- `docs/adr/0196-empty-implementation-details-needs-user-confirmation.md`

Modified files:
- `bin/sai-state.js`
- `docs/adr/0000-INDEX.md`
- `docs/commands/sai-1-spec.md`
- `docs/commands/sai-explore.md`
- `sai-state/machines/explore-idea.js`
- `sai/commands/explore/direct-build-worker.md`
- `sai/commands/explore/steps/common.md`
- `sai/commands/explore/steps/implementation-details.md`
- `sai/commands/explore/steps/issue-intake.md`
- `sai/commands/explore/steps/slicing-assessment.md`
- `sai/commands/implement/steps/audit-ingestion.md`
- `sai/commands/spec/worker.md`
- `sai/policies/ready-to-propose-format.md`
- `sai/tools/ready-to-propose.js`
- `test/explore-idea-intent-gate.test.js`
- `test/github-backlog-slice-lifecycle.test.js`
- `test/ready-to-propose-detector.test.js`
- `test/ready-to-propose-issue-conversion.test.js`
- `test/sai-state-ready-to-propose-emit.test.js`

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
