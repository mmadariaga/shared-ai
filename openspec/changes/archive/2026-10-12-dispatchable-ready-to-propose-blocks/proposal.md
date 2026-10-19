> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Ready to Propose block validity depended on the route that consumed the block: the strict profile accepted `**Implementation Details**: - None`, which Plan - Unattended tolerated but the Direct Build worker rejected, so a slice 0 sent to Direct Build failed only after dispatch. The change makes validity a property of the block itself: one dispatchable contract, enforced by a deterministic profile plus a bounded judgment at Explore's crystallization emit (while the user is present) and at `/sai-1-spec` block intake.

## What Changes

- `sai/tools/ready-to-propose.js` gains a `dispatchable` profile: `strict` plus at least one in-scope `**Implementation Details**` item per block (`NO_IMPLEMENTATION_ITEM`), a sha256 hash per block, and a lexical pre-filter that reports flagged lines as `{block, line, clause}` against four hygiene clause ids (`planning-artifact`, `mutating-git`, `subagent-dispatch`, `published-spec-edit`). Judgment verdicts arrive on stdin after a `<<<VERDICTS>>>` line; a set is dispatchable only when it is structurally valid and every flagged line carries a `context` verdict with evidence. The CLI exits 0 for this profile only when the set is dispatchable.
- New policy `sai/policies/block-hygiene-judgment.md` defines the four clauses, the rule for judging only flagged lines (an ambiguous line is a `violation`), the verdict shape and transport, and violation handling. A test asserts that the policy and the tool list the same clause ids.
- `bin/sai-state.js` `emit --ready-to-propose` validates with the `dispatchable` profile, records the inventory only for a dispatchable set, and stores per change name the block text, its hash, and its `context` verdicts in the same session-file write as the inventory. It confirms the stored blocks after the emit, retries the store once, removes stale blocks when the store cannot be confirmed, and reports `warnings: ["BLOCKS_NOT_STORED"]` instead of failing silently. The `validation` response adds `structural_ok`, per-block and set-level `flagged`, and `judgment`.
- `sai/tools/lint.js ready-to-propose` delegates to the deterministic checks of the `dispatchable` profile.
- Explore: the `Implementation details` stage never closes empty and proposes `I1` when no decision surfaced; a premature crystallization request passes through that stage; every slice owns at least one in-scope item; the friction assessment drafts a slice 0 refactor item with the next free identifier that is kept only when the user accepts slice 0; the crystallization close runs the hygiene judgment and handles confirmed violations; Direct Build's prose pre-dispatch compatibility refusal is replaced by a "dispatchable blocks only" rule.
- `/sai-1-spec` creation validates every pasted block with the `dispatchable` profile and the judgment before change resolution or any write, replacing the concept-based intake; refinement mode is unchanged.
- `sai/policies/ready-to-propose-format.md` adds the Dispatchable contract section and allows `- None` only under `**Out of scope Implementation Details**`; `sai/policies/stage-machine.md` and `sai/policies/tool-resolution.md` document verdict delivery and the stored blocks.
- `/sai-3-implement` audit ingestion's escalation block carries one proposed `I1` instead of `- None`.
- `AGENTS.md`, `docs/commands/sai-explore.md`, `docs/commands/sai-1-spec.md`, and the detector, emit, and pipeline-selector tests are updated.

## Capabilities

### New Capabilities

- `dispatchable-block-contract`: one block contract valid for Plan - Unattended, Direct Build - Unattended, and Manual, with at least one in-scope implementation item per block and the four block-hygiene clauses.
- `dispatchable-validation-profile`: the deterministic `dispatchable` profile of `ready-to-propose.js` with structural checks, block hashes, a lexical pre-filter, and verdict resolution.
- `bounded-hygiene-judgment`: the closed judgment applied only to flagged lines, producing one evidenced verdict per flagged line.
- `validated-block-recording`: the crystallization block emit records only dispatchable sets and stores each block's text, hash, and verdicts.
- `crystallization-implementation-details`: crystallization always reaches agreed implementation details, including a slice 0 refactor item.
- `spec-block-intake-validation`: `/sai-1-spec` creation validates pasted blocks with the same contract before writing anything.

### Modified Capabilities

- `ready-to-propose-detection`: the detector requirement now covers the `dispatchable` profile, its verdict input, and its exit semantics.
- `stage-machine-cli-interface`: the block emit validates with the `dispatchable` profile, reads verdicts, and stores the recorded blocks.
- `explore-implementation-details`: the empty-set `- None` rule is removed; every block and every slice carries at least one in-scope item.
- `spec-require-block-input`: creation intake validates with the dispatchable contract instead of judging concepts.
- `format-linting`: the ready-to-propose check delegates to the `dispatchable` profile.
- `crystallization-close`: a confirmed hygiene violation is shown with its clause, line, and evidence.
- `explore-pipeline-supervision`: the Direct Build pre-dispatch compatibility refusal is removed in favor of the dispatchable contract.

## Impact

New files:
- `sai/policies/block-hygiene-judgment.md`

Modified files:
- `sai/tools/ready-to-propose.js`
- `sai/tools/lint.js`
- `bin/sai-state.js`
- `sai/policies/ready-to-propose-format.md`
- `sai/policies/stage-machine.md`
- `sai/policies/tool-resolution.md`
- `sai/commands/explore/steps/common.md`
- `sai/commands/explore/steps/crystallization-protocol.md`
- `sai/commands/explore/steps/review-edge-cases.md`
- `sai/commands/explore/steps/slicing-assessment.md`
- `sai/commands/explore/steps/pipeline-direct-build.md`
- `sai/commands/spec/worker.md`
- `sai/commands/implement/steps/audit-ingestion.md`
- `AGENTS.md`
- `docs/commands/sai-explore.md`
- `docs/commands/sai-1-spec.md`
- `test/ready-to-propose-detector.test.js`
- `test/sai-state-ready-to-propose-emit.test.js`
- `test/explore-pipeline-selector.test.js`

Known limitations: `/sai-1-spec` now rejects pasted blocks with degraded formatting, such as lost bold labels, that the concept-based intake tolerated, so the user re-copies the block; crystallization adds one bounded judgment per flagged line. Standalone `/sai-backfill` keeps its `loose` profile, and the POC lane and `/sai-1-spec` refinement mode are unchanged. Reading the stored block at dispatch, worker hash verification, and single-slice amendment are not part of this change.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
