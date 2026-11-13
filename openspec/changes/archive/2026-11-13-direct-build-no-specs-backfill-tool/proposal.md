> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The Direct Build backfill step cost far more than its output justified. A retrospective of a three-line Direct Build run measured about 6.5 minutes for two files: 55 s to the backfill worker's ready, 3 min 18 s of draft composition, and 63 s of execution, plus a coordinator that re-fetched `sai/commands/backfill/worker.md` and searched for the execute-order format, which the coordinator card described but did not state. For a block that declares `**Specs**: none`, the drafts derive mechanically from the verified block, so a worker that authors them adds cost and non-reproducibility without adding content.

## What Changes

- New tool `sai/tools/backfill-no-specs.js` with a `compose` subcommand: it verifies the block file against its hash, answers `eligible: false` unless the block declares `**Specs**: none — <reason>` and `openspec/changes/{name}/specs/` holds no file, and otherwise writes `.openspec.yaml` (the four-key form of `sai/commands/backfill/instructions.md` section 6a plus `skip_specs: true` and the block's `backlog_origin` and `explore_origin`) and `proposal.md` into the transfer directory with `transfer.js put`, printing their `{path, sha256, destination}` references and origin warnings. The generated proposal carries the post-hoc banner, the template sections (including `## Proposal Research Documentation` from the block's Research Leads), the block's Capabilities in scope, Edge Cases, and Key constraints under `## Impact`, its Request Additional Notes verbatim, and its Decisions & Rationale under `## Additional Notes`.
- `sai/tools/validate-backfill-drafts.js` gains an `order` subcommand. With `--target backfill` (the default) it prints the backfill worker's `--direct-build-execute` order from the change name, the accepted fingerprint, the accepted `draft_references`, and the worker's latest `prepared_references`; it refuses to print an order when `prepared_references` is missing or does not match the accepted set, when a destination is outside the allow-list or duplicated, or when `.openspec.yaml` or `proposal.md` is absent. With `--target archive` it prints the draft section (`transfer_dir`, `fingerprint`, `drafts`) of the archive worker's no-specs order, limited to the two no-specs destinations inside the named transfer directory.
- `sai/commands/explore/direct-build-coordinator.md` Step 3 runs `compose` first and takes the no-specs route on `eligible: true` (no backfill worker, no backfill guard window, no prepare dispatch) and the existing worker route otherwise. Step 4 on the no-specs route runs `transfer.js verify`, the read-only schema review, and `validate-backfill-drafts.js validate`, with no scenario-preservation check, no review round, and no correction request; a failure is a `step-4` obstacle that escalates and writes nothing, and `openspec-cli-unavailable` stays force majeure. Step 6 sends no backfill order on the no-specs route and points to `order` on the worker route. Steps 7 and 8 carry the draft section after a `--drafts` marker on the no-specs route.
- `sai/commands/archive/worker.md` accepts the `--drafts` section in the Direct Build prepare envelope and the execute order, limited to `openspec/changes/{name}/.openspec.yaml` and `proposal.md`; the pre-flight reads the drafts in place of the missing change files; the execute order repeats `validate-backfill-drafts.js check --fingerprint`, materializes both drafts with `transfer.js materialize` before `openspec archive`, and stops before archive and commit on a changed fingerprint or a failed materialization, naming any destination already written.
- `sai/commands/backfill/worker.md` § Direct Build (unattended) execution continuation states the execute-order text format as its single definition and names `validate-backfill-drafts.js order` as its generator.
- `sai/commands/explore/steps/pipeline-direct-build.md` converges the `Backfill` route item on the no-specs route when the coordinator accepts the generated drafts at Step 4.
- `sai/policies/tool-resolution.md` documents the `backfill-no-specs.js compose` invocation and the `order` subcommand; `AGENTS.md` § Direct Build describes the no-specs route and the archive worker's draft write.
- Tests: new `test/backfill-no-specs.test.js`; extended `test/validate-backfill-drafts.test.js`, `test/direct-build-goal-driven.test.js`, and `test/archive-backfill-goal-driven.test.js`.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `explore-direct-build-no-specs`: a Direct Build block that declares `**Specs**: none` with no file under the change's `specs/` takes a no-specs route whose drafts a tool composes and the coordinator validates without a backfill worker.
- `auto-fast-archive-execution`: the archive worker's Direct Build prepare envelope and execute order carry the no-specs draft section, and the execute order materializes those drafts before the archive move.
- `auto-fast-backfill-execution`: the backfill worker's `--direct-build-execute` order on the worker route is generated by a tool from the accepted and latest prepared references and the accepted fingerprint.

## Impact

New files:
- `sai/tools/backfill-no-specs.js`
- `test/backfill-no-specs.test.js`

Modified files:
- `AGENTS.md`
- `sai/commands/archive/worker.md`
- `sai/commands/backfill/worker.md`
- `sai/commands/explore/direct-build-coordinator.md`
- `sai/commands/explore/steps/pipeline-direct-build.md`
- `sai/policies/tool-resolution.md`
- `sai/tools/validate-backfill-drafts.js`
- `test/archive-backfill-goal-driven.test.js`
- `test/direct-build-goal-driven.test.js`
- `test/validate-backfill-drafts.test.js`

Only the Direct Build route changes: standalone `/sai-backfill` keeps its worker and interview, the `--no-specs` POC lane is unaffected, and `/sai-explore` and `/sai-direct-build` follow the same card on Claude Code and opencode. The existing `sai-tools` projection installs the new tool.

Known limitations: the no-specs `proposal.md` restates the block instead of written prose, and the archive worker's execute order gains two draft destinations in its allow-list. The functional review of this change found five issues in its first round, all fixed in the second: the generated no-specs proposal lacked `## Proposal Research Documentation` and dropped Edge Cases, Key constraints, and Decisions; `AGENTS.md` misstated `/sai-direct-build`; `pipeline-direct-build.md` misstated the Backfill completion point; and `order` accepted a missing `prepared_references`. No technical debt was reported as left behind.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Related observation, outside this change: `sai/tools/validate-backfill-drafts.js:32` matches `skip_specs` only at the start of a line, so an indented or quoted value bypasses the no-spec check; the tool-generated `.openspec.yaml` is canonical, so this change does not depend on it.
