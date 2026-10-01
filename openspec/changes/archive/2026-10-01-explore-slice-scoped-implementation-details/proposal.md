> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Every per-slice Ready to Propose block carried the full, unattributed Implementation Details list. In a real sliced Direct Build run, the slice 1 implementer built items meant for slices 2 and 3, and that work had to be reverted before the run could continue cleanly. This wasted time and tokens. The text-only slice-scoped scope rule in the Direct Build implementer contract did not prevent the leak. The leak is an input problem as well as a review problem: the implementer cannot pre-build what its block marks as context only.

## What Changes

- `sai/policies/ready-to-propose-format.md`: the block gains a mandatory `**Out of scope Implementation Details**` section immediately after `**Implementation Details**` and before the optional `**Request Additional Notes**`. `**Implementation Details**` now holds only the in-scope items. The new section holds every other agreed item under the same field rules (global order, identifiers, and wording preserved, or exactly `- None`). It is non-normative context: no requirement, scenario, intent item, or implementation obligation derives from it. In a non-sliced block, every item is in scope and the new section is `- None`.
- `sai/commands/explore/steps/crystallization-protocol.md`: per-slice blocks no longer carry the full list unattributed. Each block splits the agreed list by judgment between the two sections. Each identifier appears exactly once per block. An item that several slices need is in scope in each of those slices' blocks. An item that an earlier slice delivered is out of scope unless this slice must extend it. A slice with no own items carries `- None` in scope and the full list out of scope. An empty agreed list makes both sections `- None`.
- `sai/commands/explore/direct-build-worker.md`: the slice-scoped scope rule is replaced. `**Capabilities in scope**` and `**Implementation Details**` bound the run. Out-of-scope items only inform choices among options that are equivalent for this run. The implementer never implements an out-of-scope item and never does anticipatory implementation.
- `sai/commands/explore/steps/pipeline-direct-build.md`: structural check (b) of the Direct Build functional fix loop gains an excess-scope check. An implemented out-of-scope item or any anticipatory implementation is a finding that requires reverting it. The round budget and cap-exhaustion semantics are unchanged.
- `sai/commands/spec/worker.md` and `sai/commands/backfill/instructions.md`: only `Implementation Details` items count. Out-of-scope items never become `/sai-1-spec` requirements or scenarios, and never become backfill intent items.
- `sai/commands/implement/steps/audit-ingestion.md`: escalation blocks carry `**Out of scope Implementation Details**: - None`.
- `sai/tools/lint.js`: the `ready-to-propose` check requires `**Out of scope Implementation Details**`. `test/lint-tool.test.js` adds the section to the passing fixtures and adds a failing case for a block without it.
- `sai/commands/explore/steps/crystallization-language-gates.md`: the new label is added to the English-scaffolding label list.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `explore-implementation-details`: the block carries both sections, and sliced blocks split the agreed list by judgment.
- `shared-crystallization-block-format`: the canonical format adds the mandatory non-normative `**Out of scope Implementation Details**` field.
- `auto-fast-implement-worker`: the implementer is bounded by in-scope items and does no anticipatory implementation.
- `direct-build-reviews`: the structural check includes the excess-scope check.
- `spec-require-block-input`: creation never derives requirements from out-of-scope items.
- `backfill-unattended-intake`: out-of-scope items never become intent items.
- `audit-finding-escalation`: escalation blocks carry the new section as `- None`.
- `format-linting`: the ready-to-propose check requires the new section.
- `explore-crystallization-language-gate`: the new label stays English scaffolding.

## Impact

- Modified: `sai/policies/ready-to-propose-format.md`
- Modified: `sai/commands/explore/steps/crystallization-protocol.md`
- Modified: `sai/commands/explore/steps/crystallization-language-gates.md`
- Modified: `sai/commands/explore/direct-build-worker.md`
- Modified: `sai/commands/explore/steps/pipeline-direct-build.md`
- Modified: `sai/commands/spec/worker.md`
- Modified: `sai/commands/backfill/instructions.md`
- Modified: `sai/commands/implement/steps/audit-ingestion.md`
- Modified: `sai/tools/lint.js`
- Modified: `test/lint-tool.test.js`
- Known limitations: the in-scope/out-of-scope split is a judgment made at crystallization and can be wrong. A misattributed item either leaks (the excess-scope check catches it) or is missing (the existing structural check catches it). If the fix-loop cap is exhausted, any remaining anticipatory code stays in the commit and is reported in the final tally. Forward visibility of later items keeps some temptation to anticipate; the usage rule and the backstop check contain it. The POC lane (`--no-specs`) is not a slice and is unaffected.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
