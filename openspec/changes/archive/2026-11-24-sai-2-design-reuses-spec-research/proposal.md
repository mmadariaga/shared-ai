> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Inside one `/sai-plan` run, `/sai-2-design` repeated research that `/sai-1-spec` had already done (one measured opencode run: about 2-3 minutes and about 1.3 M cache-read tokens), because spec kept only paths in `proposal.md` and the `budget-explorer` reports were lost when the spec worker closed. Design now inherits that research as pointers to the original reports plus spec's exceptions, and spends explorer work only on design-specific gaps.

## What Changes

- The explorer contract (`sai/policies/explore-agent.md`) gains a `## Saved report` section: a task whose first line is `--report-dir <path>` (optionally followed by `--harness <name>`) makes the explorer save its complete response with `transfer.js put --exclusive` and reply with only `{path, sha256}` and its `warming` line; every other task is answered in text as before. Its shell restriction admits the `transfer.js put` call only for such a task. The Claude Code and opencode `budget-explorer` skills document the `--report-dir` line (Claude Code adds `--harness claude` for an explorer routed to opencode), and both agent descriptions say the explorer writes only the report a `--report-dir` line names.
- The `research` capability profile in `sai/install-manifest.json` gains `"write": "temp"` and the shell rule `node {sai}/tools/transfer.js put *`.
- `plan-run@1` admits the record kind `research-dir` (`research_dirs` in the run view).
- `sai/commands/plan/cycle.md` gains `## Research hand-over`: when the spec segment runs, the plan coordinator opens a research directory with `transfer.js open` right after the report directory and records it; the spec brief names `research_dir`, the spec watch lists it among the writable paths, each accepted `completed` spec report's `research_files` is written to `research-files.json` in the run directory, and before the design brief every reference is checked with `transfer.js verify`; valid ones go into the design brief, and failed ones produce one closing-report line. A completed run closes the research directory with the report directory; a stopped, blocked, or unanswered run keeps it.
- `/sai-plan`'s coordinator opens the research directory, passes it to the spec segment and the valid pointers to the design segment, and prints the hand-over line in its closing report.
- The spec worker (`sai/commands/spec/worker.md` § Research hand-over, `steps/common.md`) opens every explorer task with `--report-dir <research_dir>`, saves an exceptions-only `spec-annotations.md` (entries `corrected`, `rejected`, `own-read`, `gap`) in the research directory when it has at least one entry, and lists every reference in `research_files`. `sai/commands/plan/worker-common.md` admits that annotations write as the one exception to the scratch rule.
- `sai/tools/worker-report-validator.js` gives `spec` its own fields: `research_files` (a list of `{path, sha256}`) is required on `completed`; `design` keeps `step_ids`, `warnings`, `notes`. `sai/policies/worker-report-transport.md` mirrors it.
- The design brief carries an `inherited research:` list inside `/sai-plan`, and `sai/commands/design/steps/research.md` gains `## Inherited research`: annotations are read first and prevail over the report they contradict, no freshness check, a report is opened only for needed detail, explorers are dispatched only for design gaps and `gap` entries, and inherited research counts as verified.
- `AGENTS.md` and `docs/commands/sai-plan.md` describe the hand-over; tests cover the profile, the explorer contract, the validator, the machine, and the card wiring.

## Capabilities

### New Capabilities

- `budget-explorer-saved-report`: an explorer whose task carries `--report-dir` saves its verbatim report and returns only its reference; every other explorer keeps returning text.

### Modified Capabilities

- `contract-tool-capabilities`: the `research` profile declares the scoped temp write and the `transfer.js put` shell rule.
- `tool-preference-ladder`: the explorer's shell restriction admits `transfer.js put` only for a task that carries `--report-dir`.
- `plan-segment-cycle`: the spec report carries `research_files`, and the plan run hands spec research to design through a research directory.
- `design-research-reuse`: design starts from inherited spec research and counts it as verified.

## Impact

Modified files:
- `AGENTS.md`
- `agents/claude/budget-explorer.md`
- `agents/opencode/budget-explorer.md`
- `docs/commands/sai-plan.md`
- `sai-state/machines/plan-run.js`
- `sai/commands/design/coordinator.md`
- `sai/commands/design/steps/research.md`
- `sai/commands/plan/coordinator.md`
- `sai/commands/plan/cycle.md`
- `sai/commands/plan/worker-common.md`
- `sai/commands/spec/coordinator.md`
- `sai/commands/spec/steps/common.md`
- `sai/commands/spec/worker.md`
- `sai/install-manifest.json`
- `sai/policies/explore-agent.md`
- `sai/policies/worker-report-transport.md`
- `sai/tools/worker-report-validator.js`
- `skills/claude/budget-explorer/SKILL.md`
- `skills/opencode/budget-explorer/SKILL.md`
- `test/canonical-opencode-agent-behavior.test.js`
- `test/capability-profiles.test.js`
- `test/claude-default-preset-alignment.test.js`
- `test/explore-agent-tools.test.js`
- `test/plan-family.test.js`
- `test/read-only-shell-grants.test.js`
- `test/worker-report-transport.test.js`
- `test/worker-report-validator.test.js`

No new files.

Known limitations: design may act on stale evidence when cited code is edited between the spec and design segments of the same run; every budget-explorer, not only the spec ones, gains temp-root write access and the `transfer.js put` shell rule; standalone `/sai-2-design` gains no reuse. `/sai-explore`'s own research is never handed over.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
