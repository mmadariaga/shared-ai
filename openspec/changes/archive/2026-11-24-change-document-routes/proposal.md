> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Once the change document exists, the `sai-state` store is the one place every route reads a crystallized change from. `/sai-explore` and every reader of the store therefore switch from the `Ready to Propose` block to the change document together; otherwise the agreement keeps being converted between two formats, and a store that holds documents breaks every route that still reads blocks.

## What Changes

- `/sai-explore` crystallization composes one change document per change (first line `# <title>`, English section headings, a closing `## Change` section with `Change name:`, `Depends on:`, `Backlog origin:`, `Explore origin:`, and `Specs:` lines), checks each file with `change-document.js check` (`--slice` for a member of a slice set) and the set with `check-set`, and registers the set with one `sai-state emit <id> explore-slice@1 --document-file <path> [--verdicts-file <path>] ...` call in display order. The block emit and its `<<<VERDICTS>>>` composition are gone.
- `bin/sai-state.js` loads `change-document.js` instead of `ready-to-propose.js`. The document emit takes one repeatable `--document-file` per change, each optionally followed by its own `--verdicts-file`; it validates the whole set (structure, hygiene judgment, repeated change names, dependencies outside the set or in a cycle) before any session read, stores `{text, hash, verdicts}` per change name in dependency order, and records nothing when the set fails. `emit --amend <name> --document-file <path>` takes exactly one document and keeps the metadata-only amendment for the `Backlog origin:` and `Explore origin:` lines. `emit --ready-to-propose` and `--block-file` exit 2 as retired, and a block file given to `--document-file` answers `RETIRED_FORMAT`.
- `sai-state block <id> <name> --export` verifies the stored document and writes it as `document.md` in a private transfer directory, returning `document_file` beside `hash` and `transfer_dir`.
- Every wrapper, coordinator, and worker of Claude Code and opencode that carried `--block-file` and `--block-hash` now carries `--document-file` and `--document-hash`: `/sai-1-spec`, `/sai-plan`, `/sai-direct-build`, the explore Plan - Unattended and Direct Build - Unattended routes, the Direct Build implementer, and the backfill prepare envelope. Receivers verify with `change-document.js verify-file` and reject a retired block.
- Workers and coordinators read the document by its headings (`Goal` as what, `Problem` as why, `Scope`, `Non-goals`, `Capabilities`, `Edge cases`, `Implementation notes`, `Out-of-scope implementation notes`), and write `backlog_origin`, `explore_origin`, and `skip_specs` from the `## Change` lines.
- `/sai-1-spec` and backfill copy `## Additional notes` verbatim into the existing `## Request Additional Notes` section of `proposal.md`.
- `sai/tools/backfill-no-specs.js compose` takes `--document-file` and `--document-hash` and derives `.openspec.yaml` and `proposal.md` from the document's sections.
- Issue intake reads an issue with `change-document.js sections`, which also returns `proposed_change_name` and `declared_clean_note`; it no longer builds a block from an issue (`convert` is no longer part of the intake), and the document composed at `Crystallize` carries the declared-clean note in `## Additional notes`.
- `change-document.js` gains `isRetiredBlockFormat`, the `RETIRED_FORMAT` violation, and the issue reading's change-name proposal.
- The benchmark corpus brief moves from `block.md` to `document.md`, and the Docker backend stores and passes it through `--document-file` and `--document-hash`.
- Functional review fixes: `open-decisions.md` no longer points left-open decisions at the retired `Request Additional Notes` field, and the implement coordinator no longer names the `Ready to Propose` block as a decision source.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `crystallization-close`: the close composes, checks, registers, and prints change documents instead of blocks.
- `stored-block-dispatch`: the store keeps and exports change documents, dispatches send `--document-file` and `--document-hash`, and a retired block is rejected.
- `block-file-delivery`: the registration takes one document file per change, each with its own verdicts file.
- `spec-block-intake-validation`: `/sai-1-spec` and `/sai-plan` verify and validate a change document before any resolution or write.
- `direct-build-command`: `/sai-direct-build` takes, verifies, and provides a change document reference.
- `backfill-unattended-intake`: backfill and `backfill-no-specs.js` read a change document.
- `explore-issue-intake`: issue intake reads an issue through `change-document.js sections` and seeds the stages from it, building no block.

## Impact

- Tools: `bin/sai-state.js`, `sai/tools/change-document.js`, `sai/tools/backfill-no-specs.js`, `sai/tools/opencode-db.js`.
- Wrappers: `commands/claude/` and `commands/opencode/` `sai-1-spec.md`, `sai-plan.md`, `sai-direct-build.md`, `sai-explore.md`.
- Cards and steps: `sai/commands/backfill/{coordinator,instructions,worker}.md`, `sai/commands/spec/{coordinator,worker}.md` and `steps/`, `sai/commands/plan/{coordinator,cycle,worker-common}.md`, `sai/commands/design/coordinator.md`, `sai/commands/implement/coordinator.md`, `sai/commands/direct-build/coordinator.md`, `sai/commands/explore/{body,instructions,direct-build-coordinator,direct-build-worker}.md` and `steps/`.
- Policies: `stage-machine.md`, `tool-resolution.md`, `issue-origin-preservation.md`, `block-hygiene-judgment.md`, `artifact-review-contract.md`, `change-telemetry.md`, `decision-record-creation.md`; `sai/install-manifest.json` agent descriptions.
- Benchmark: `benchmark/corpus.js`, `benchmark/docker-backend.js`, `docs/benchmark.md`, `test/fixtures/benchmark-corpus/briefs/greeting/document.md` (replaces `block.md`).
- Docs: `AGENTS.md`, `README.md`, `docs/commands/`, `docs/on-demand-commands.md`, `docs/sequential-pipeline.md`.
- Tests: `test/sai-state-document-emit.test.js` (replaces `test/sai-state-ready-to-propose-emit.test.js`) and the updated contract tests.
- Known limitation: until `change-document-backlog` lands, publishing a slice set with `to-backlog` does not work, because its tools still expect blocks; single-change publication keeps working. Blocks already stored in `sai-state`, issues published in block form, and changes in progress are not supported.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
