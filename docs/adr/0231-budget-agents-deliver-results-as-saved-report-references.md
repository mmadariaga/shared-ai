# ADR 0231: Budget agents deliver results as saved report references

## Status

Accepted.

## Context

`budget-explorer`, `budget-subagent`, and `budget-executor` returned their results as inline text, outside the file transport that SAI workers use. An inline result has no copy on disk: in an opencode session a `budget-explorer` finished, but both completion notifications carried only its closing line and never the report body. The dispatcher did not detect the missing report, the user had to point it out, and about 22 minutes were lost before a second, stricter request produced the report. With nothing on disk, the dispatcher had nothing to check or recover, and the agent had to rewrite the report. `sai/policies/worker-report-transport.md` kept the budget helpers outside its transport and its undelivered-report recovery.

## Decision

1. **One delivery mode for all budget agents.** Whoever dispatches them (an SAI coordinator, a worker that dispatches its own helpers, a main session in budget mode, or a plain session), the three agents save their result as a report file with `transfer.js put --exclusive` and reply with only the `{path, sha256}` reference and the `warming:` line. There is no inline-text mode, and no dual mode of a file under a coordinator and text elsewhere.
2. **`budget-executor` and `budget-subagent` are included** for a single delivery contract, although no lost delivery was observed for them.
3. **The dispatcher, never the agent, creates the report directory.** It opens a helper report directory with `transfer.js open`, passes `--report-dir` as the first line of every task (with `--harness claude` as the second line when a Claude Code dispatcher's agent runs in opencode), and closes the directory once no live agent uses it. When the agent's message is lost, the dispatcher already knows where to look. A task without the `--report-dir` line gets no work, and a failed save is reported as one line that names the failure and the draft path.
4. **The dispatcher verifies delivery with `transfer.js accept` only**, before it reads the report. No content validator applies, because the observed failure was a delivery failure and a budget report's fields are defined per task. `already: true` marks a repeat of an accepted reference.
5. **Undelivered reports use the existing recovery.** A message without a valid reference is handled through the `.sai-accepted` ledger and `transfer.js watch` of `sai/policies/worker-report-transport.md`: the dispatcher scans its helper directory first and asks the agent again only when the scan finds nothing.
6. **The executor writes natively only inside the SAI temp root.** The `executor` capability profile gains `write: "temp"`, like the `research` profile of the explorer, and neither agent has native write access to the repository.

At the end of this run the code does this: `sai/policies/worker-report-transport.md` holds a `## Budget agents` section with the agent side and the dispatcher side, written once. `sai/policies/explore-agent.md`, `executor-agent.md`, and `budget-agent.md` fetch it and describe no text reply, and the six budget skills (`skills/claude/` and `skills/opencode/`) carry the dispatcher rule, with the `--harness claude` line only on the Claude Code skills. `transfer.js` gained no sub-command.

## Alternatives Considered

- **The agent opens its own report directory when none is given** — rejected: a lost message leaves the dispatcher without the directory path, so the report cannot be recovered.
- **`transfer.js accept` plus a new `--command budget` validator kind with a minimal envelope** — rejected: extra code and tests for a failure that is about delivery, not shape.
- **`transfer.js verify` only** — rejected: it records nothing in the ledger, so `watch` cannot detect undelivered reports.
- **A dual mode (file under a coordinator, inline text elsewhere)** — rejected: one channel is more maintainable and predictable.

## Consequences

- About 3 extra tool calls per budget dispatch (the draft write and `put` by the agent, `accept` by the dispatcher), plus `open` and `close` once per run. The cost is measured after rollout with the `/sai-retrospective` `cost` report, without a threshold.
- `budget-executor` gains native write access to the SAI temp root.
- Every dispatcher, a plain main session in budget mode included, opens a helper report directory and closes it when it no longer needs it. A worker's own report directory stays apart, so the watch of a coordinator never mistakes a helper report for a worker report.
- Claude Code and opencode behave alike, and the explorer, executor, and subagent share one contract on both harnesses.

## Provenance

Change `budget-agents-deliver-file-references`, decision "One delivery mode for all budget agents".
