> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

In opencode, a `budget-explorer` report dispatched by `/sai-explore` never reached its coordinator: both completion notifications carried only the subagent's closing line, never the report body. The coordinator did not detect the missing report, the user had to point it out, and about 22 minutes were lost before a stricter re-request brought the report.

Budget agents returned their results as inline text. Unlike SAI workers, which save a report file and return a reference, an inline result has no copy on disk: when the message is lost, the dispatcher has nothing to validate or recover, and the agent must rewrite the report. `sai/policies/worker-report-transport.md` kept the budget helpers outside the file transport and outside the undelivered-report recovery.

## What Changes

- `sai/policies/worker-report-transport.md` gains a `## Budget agents` section, the single source of how `budget-explorer`, `budget-subagent`, and `budget-executor` deliver their results, and drops the budget-helper exclusions from its schema-literal list and from § Undelivered reports:
  - **Agent side.** A task opens with `--report-dir <absolute path>`, optionally followed by `--harness <claude|opencode>`. A task without `--report-dir` gets no work and a one-line reply naming the missing line. The agent writes its complete result to a draft in the report directory, saves it with `transfer.js put --exclusive` under a new name for every response, runs the cache-warming arm check first, and ends with a final message that holds only the `{path, sha256}` reference and the `warming:` line, with no text pointing at earlier text. When `put` fails twice, it replies with one line naming the failure and the path of the draft.
  - **Dispatcher side.** The dispatcher opens one helper report directory with `transfer.js open`, sends `--report-dir <dir>` as the first line of every task message (with `--harness claude` as the second line for an opencode-routed agent dispatched from Claude Code), shares the directory between parallel helpers, runs `transfer.js accept` before reading a report (`already: true` is a wake acknowledgement), treats a message without a valid reference as an undelivered report recovered through the scan and watch of § Undelivered reports before asking the agent once again, and closes the directory with `transfer.js close` when no live helper uses it; the `/sai-plan` research directory is closed by its creator at the end of its run.
  - Budget reports follow the output contract of their task: no schema, no validator `--command` row, and no `outcome`.
- `sai/policies/explore-agent.md`, `sai/policies/executor-agent.md`, and `sai/policies/budget-agent.md` point to § Budget agents, agent side, and no longer describe a text reply. The explorer's shell restriction admits `transfer.js put` for every task, and a task without `--report-dir` gets no research.
- The Claude Code and opencode `budget-explorer`, `budget-subagent`, and `budget-executor` skills state that every spawn prompt opens with `--report-dir <dir>` and that there is no text reply, and point to the dispatcher side; only the Claude Code skills name the `--harness claude` line.
- `sai/install-manifest.json`: the `executor` profile (`budget-executor`) gains `write: "temp"`; the `research` and `task` profiles are unchanged.
- `sai/policies/cache-warming.md`: a budget agent that received the warming switch repeats its last reference on a wake like a worker, and returns its reference with the `warming:` line beside it.
- `sai/policies/opencode-dispatch.md`: the `--harness claude` line also applies to an opencode-routed budget agent.
- Dispatch sites: the spec worker opens every explorer task with `--report-dir`, using `research_dir` when its brief names it and otherwise a helper directory it opens and closes itself, and accepts each reference before reading; the design research step and the `/sai-explore` explorer continuations do the same with their own helper directories.
- `AGENTS.md` and `docs/skills.md` describe the single delivery mode.
- Tests: the new `test/budget-report-delivery.test.js` covers the agent and dispatcher rules, the profiles, the skills of both harnesses, and a lost-message recovery through the ledger scan; existing tests that expected text replies from budget agents are updated.

## Capabilities

### New Capabilities

- `budget-agent-report-delivery`: the three budget agents deliver every result as a saved report reference, and their dispatchers open, tag, accept, recover, and close the helper report directory.

### Modified Capabilities

- `budget-explorer-saved-report`: every budget-explorer task carries `--report-dir`; the text return is removed.
- `undelivered-report-recovery`: the single-source requirement is replaced by one that covers workers and the budget agents; only the `--no-specs` POC stays outside the recovery.
- `budget-subagent-behavior`: the completion report is the content of a saved report file, returned as a reference.
- `helper-dispose`: the executor and task-subagent `warming:` line is carried beside the returned reference.
- `plan-segment-cycle`: a standalone spec worker's explorers save their reports in a helper directory instead of replying in text.
- `tool-preference-ladder`: the explorer's `transfer.js put` is no longer limited to tasks that carry `--report-dir`, because every task carries it.
- `contract-tool-capabilities`: the `executor` profile gains `write: "temp"`.

## Impact

- New: `test/budget-report-delivery.test.js`.
- Modified: `AGENTS.md`, `docs/skills.md`, `sai/commands/design/steps/research.md`, `sai/commands/explore/body.md`, `sai/commands/spec/steps/common.md`, `sai/commands/spec/worker.md`, `sai/install-manifest.json`, `sai/policies/budget-agent.md`, `sai/policies/cache-warming.md`, `sai/policies/executor-agent.md`, `sai/policies/explore-agent.md`, `sai/policies/opencode-dispatch.md`, `sai/policies/worker-report-transport.md`, `skills/claude/budget-executor/SKILL.md`, `skills/claude/budget-explorer/SKILL.md`, `skills/claude/budget-subagent/SKILL.md`, `skills/opencode/budget-executor/SKILL.md`, `skills/opencode/budget-explorer/SKILL.md`, `skills/opencode/budget-subagent/SKILL.md`, `test/claude-default-preset-alignment.test.js`, `test/explore-agent-tools.test.js`, `test/plan-family.test.js`, `test/undelivered-report-recovery.test.js`, `test/worker-report-transport.test.js`.
- Accepted trade-offs: about 3 extra tool calls per budget dispatch (draft write and `put` by the agent, `accept` by the dispatcher; `open` and `close` once per run), and `budget-executor` gains write access to the SAI temp root.
- Known limitations: the `/sai-retrospective` collector check on a new opencode session (I7) and the cost comparison against the `docs/measurements/` baseline (I8) are not part of the selected diff.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
