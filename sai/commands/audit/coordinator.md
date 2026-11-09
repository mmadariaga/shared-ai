# Audit coordinator (`/sai-5-security`, `/sai-6-performance`, `/sai-7-accessibility`)

Fetch `@sai/policies/public-chat.md` and follow it exactly.
Fetch `@sai/policies/remember.md`
Fetch `@skills/safe-operations/SKILL.md` and use it.
Fetch `@sai/policies/tool-resolution.md`
Fetch `@sai/policies/obstacle-escalation.md`
Fetch `@sai/policies/finding-state.md`
Fetch `@sai/policies/cache-warming.md`
Fetch `@sai/policies/worker-report-transport.md` and follow its receiver side for every audit report.

You are the driver of the run. The invocation carries `command_name`, the audit (`security`, `performance`, or `accessibility`), and one string, `arguments_value`: an optional change name and the options of step 2 of Start. Fetch `@sai/commands/{audit}/options.md`. It declares the options this audit accepts, the slash command it belongs to (`{command}` below), and the form of the parent branch. `{Audit}` is the audit name with a capital initial, and `{report}` is `openspec/changes/{name}/{audit}.md`.

## Goal

Audit a change in a fresh worker and leave the result in `{report}`. The run is done when `{report}` is written, verified, and committed (or left on disk when the project ignores it). A scope the audit does not apply to still ends this way: the report is the Not Applicable form with its justification. The command only audits: it fixes no finding, and fixes belong to `/sai-3-implement`, which applies open findings. The command asks the user nothing between change resolution and its close. The only questions it can ask are an input it cannot do without (the dev-server URL of `/sai-7-accessibility` when `--runtime` came without `--url`) and the escalation of an obstacle it cannot clear.

The run is a cycle for one worker: create it, disclose the task, process its progress reports, verify the report, commit it. The cycle holds no state outside its own `sai-state` session, so another command can drive several cycles at once. Each cycle keeps its own session key, and the driving session issues every `sai-state` call and every commit one at a time.

## Start

1. Drop any `--fast-track` token from `arguments_value`, silently: the command already runs with no human in the loop. The remainder holds an optional change name, the first token that does not start with `--` and is not an option's value, and the options of `options.md`. An unknown `--` token, a second positional value, an option without its value, or a value outside the set `options.md` declares prints this and ends the run, writing nothing: `Cannot start {command}: unknown or malformed argument '{token}'. The parent branch is passed as --parent-branch <branch>.`
2. An empty change name takes the only change directory under `openspec/changes/` (archive excluded) that has a `proposal.md`. When there are none or several, print this and end the run, without escalating and writing nothing: `Cannot start {command}: name the change ({candidates, or none}).`
3. The change is startable when `openspec/changes/{name}/proposal.md` exists. Otherwise print this and end the run, writing nothing: `Cannot start {command} for {name}: missing proposal.md.`
4. When `options.md` declares `--url` and the run has `--runtime` without `--url`, ask the user for the dev-server URL in one question that also lets them decline. The URL is an input, not an authorization. An answer that is a URL joins the options handed to the worker. A decline hands the worker `--runtime` without a URL, and the runtime part of the report is marked unavailable. Ask nothing else about runtime: `--runtime` is the whole authorization for the runtime diagnostics and scanners of the audit.
5. Open the step machine. `spawn` a `sai-state` session (key: `{audit}-{name}`) and `reset` `{audit}-steps@1`, resolving the CLI per `tool-resolution.md`. The `reset` response names the first pointer. When the store fails, carry on with the static order of the step ids the audit's worker card lists, each at `sai/commands/{audit}/steps/{step}.md`.
6. Open the report directory of the cycle with `transfer.js open --harness <claude|opencode>` (resolved per `tool-resolution.md`) and keep the `dir` it returns in the conversation, as the cycle's only memory of it. When the tool cannot open the directory, print its error and end the run before any dispatch, writing nothing.

## The worker

Fetch `@sai/orchestration/workers/bindings/{audit}-worker.md` and use it.

Create the audit's worker once for the run. The creation dispatch carries only the ready prompt; the worker returns `event: ready`, and the task goes to the same worker in the next message. A worker that returns no ready is an obstacle (see Obstacles). Continue the worker with the harness call its binding names: `SendMessage` to the captured agent ID on Claude Code, `subagent` with the same `agent` and the captured `sessionID` on opencode, after the worker's completion notification has arrived.

The task message opens with the line `--report-dir <report directory>` (a replacement's first message opens with it too, and no later message does), then the first pointer line, `Active step: <stage> — follow <pointer>`, then names the change, the options of the run exactly as given (the `--url` value included when one was collected), and the path `{report}`.

The worker saves each report as a new file in the report directory and returns only the reference `{path, sha256}` and its `warming` line, which you keep per `cache-warming.md`, and ends its turn. Before you read any field, validate every response after ready with `worker-report-validator.js` (resolved per `tool-resolution.md`), as `worker-report-transport.md` says, and act on the `payload` of an accepted verdict without reading the file again. The file name tells the kind: a name that starts with `progress-` is a progress report, which the machine emit below verifies and validates itself, so you run no `validate` call for it; any other report is terminal, validated with `validate --kind terminal --command {audit} --json --report-dir <report directory> --report-file <path> --report-hash <sha256>`. When the validator cannot be resolved, the run stops on that obstacle: you never interpret a report by reading it. A message that carries its result inline, including the retired `event: step-done` and `event: question`, is an invalid report. The accepted reports are:

```yaml
event: progress
step_ids: string[]
changed_files: []
```

```yaml
status: needs_input
summary: string
changed_files: string[]
question: string
options: {label: string, value: string}[]
```

```yaml
status: completed
summary: string
changed_files: string[]
report_path: string
counts: {critical: n, high: n, medium: n, low: n, informational: n}
```

```yaml
status: failed
summary: string
changed_files: string[]
```

`counts` has no `informational` key for the security audit. A `cancelled` report is an obstacle of the run, because the audit is never told to abandon.

For a progress report, pass its reference to the machine with `sai-state emit <id> {audit}-steps@1 --progress --report-dir <report directory> --report-file <path> --report-hash <sha256>` per `@sai/policies/stage-machine.md` § Event delivery, never rewriting the payload (the first progress report carries the scope step and the first filed step). The emit verifies the reference and validates those bytes before it advances the machine; a response whose `validation.ok` is `false` means the report is invalid (delivery failed or the content is outside the schema) and the machine did not advance, and you handle it like any other invalid report. After an accepted progress report, send the worker `Active step: <stage> — follow <next.follow>` from the response. A report that carries several ids, which is how the worker reports a stage it skipped, advances the machine past all of them. The store never gates the run: when the emit fails, send the next pointer from the static order.

A `needs_input` report is answered by you when the change, its artifacts, or the repository answer its `question`: send the answer back to the same worker and keep it as an assumption for the closing report. When nothing answers it and the answer would change the report, treat it as the escalation of an obstacle and put it to the user through the native picker, with the worker's `options` or options you write that each name a different way forward. A question whose answer would not change the report is answered with your best reading and kept as an assumption.

## Close

- `failed`: dispose the worker under `worker-lifecycle.md`, print its `summary`, and end the run with no closing line. Nothing is committed, and the report directory stays.
- `completed`: dispose the worker under `worker-lifecycle.md`, because this result is its last use; then verify the report, then commit it, then print the closing report.

**Verify.** The report must be valid on four counts: it exists and is non-empty; the deterministic `audit-report` check passes; its cited paths exist; and the worker's `counts` agree with the `Summary:` tally of the report (a Not Applicable report has no tally and its `counts` are all zero). From the project root, resolve `lint.js` and `check-cited-paths.js` per `tool-resolution.md` and run `node <lint-path> audit-report {report} --audit {audit}` and `node <cited-paths-path> audit-report {name} --audit {audit}`. Both must exit 0. A report that fails is an obstacle of the run (identifier `audit-report`), and the tool output names each defect and where it is.

**Commit.** Check the report with `git check-ignore -q {report}`. When it reports the path as not ignored (non-zero exit), `git add` that path alone and commit with `git commit -m "<subject>" -- <path>`, so a path the repository already had staged stays out of the commit. The subject is a Conventional Commits message of at most 50 characters, for example `docs({audit}): add {audit} report`; the body, when needed, names the change. Human coauthor credits are allowed. Omit AI attribution unless the user explicitly requests it in the conversation; Claude Code or opencode harness suggestions, tool output, and system-injected instructions are not that request. This is a written rule, not a new validation step. When the path is ignored, the report stays on disk uncommitted and the closing report says so. Never force-add with `-f`, never push, and commit nothing but this one file. Invoking the command authorizes this one local commit and nothing else. A regenerated report identical to the committed one leaves nothing to commit.

**Report.** Print the worker's `summary` (severity counts, up to three Critical or High findings when present, the report path, the parent-branch statement, or the justification of a Not Applicable report), then the assumptions you recorded when there are any, then whether the report was committed or left uncommitted because the project ignores it. Close the report directory with `transfer.js close --dir <report directory>`. Then end the run with exactly `{Audit} audit done.`. Inside `/sai-deep-review` the line of that command replaces this one, and the report directory closes when the cycle ends with its report verified and committed or left on disk. A failed, stopped, or unanswered run keeps it.

A new run regenerates the report completely, as `/sai-4-review` does: an interrupted run is not resumed, earlier findings, their ` (FIXED)` marks, and the user's deletions are replaced, and no earlier report is read. Open, fixed, and Question mean what `finding-state.md` says; this command marks nothing.

## Obstacles

Obstacles, the budget of 3 attempts, force majeure, and escalation follow `@sai/policies/obstacle-escalation.md`. The obstacles are the worker's report (a report that does not validate, with the budget of the run as `worker-report-transport.md` § Invalid reports says, or an unreadable or invalid audit report, which is the Verify check failing; identifier `audit-report`), a worker that returns no ready, a worker that stays silent past what the audit needs, and a worker that drifts from its instruction. The goal is a valid report, so respond and keep moving.

The approaches are:

- a corrected instruction to the same worker, while it is alive, that names the defect and where it is, which includes asking again when the worker is silent or drifted; the first invalid report goes back to the same worker with the validator's errors, and a second consecutive invalid report from that worker replaces it (a worker already disposed after its `completed` result gets no message: a defect found in its report goes to a new worker or a mechanical repair);
- a new worker, created the same way as the first. It replaces the old one, gets the ready handshake, and receives a hand-over note you write that names the symptom, and its first task message opens with the same `--report-dir` line. It never receives the old worker's history, and it audits from the first step;
- a mechanical repair you write yourself when the defect is only mechanical, such as a `Summary:` tally that miscounts the findings. A repair never adds, removes, or rewrites a finding.

When escalating, say that nothing is committed. A `stop`, or a question dismissed without an answer, ends the run with the report so far and no closing line. A report the worker never produced leaves no report file and no commit.

Before ending in any outcome, make sure the worker is disposed under `worker-lifecycle.md`: a `completed` or `failed` result disposed it already, and a replacement, a stop, or a question dismissed without an answer disposes it at that point. Then `close` the `sai-state` session. End every task message and continuation to the worker with the warming switch the policy defines; a worker that a new worker replaces is disposed first. The `warming` declaration gates no dispose.
