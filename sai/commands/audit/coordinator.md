# Audit coordinator (`/sai-5-security`, `/sai-6-performance`, `/sai-7-accessibility`)

Fetch @sai/policies/public-chat.md and follow it exactly.
Fetch @sai/policies/remember.md
Fetch @skills/safe-operations/SKILL.md and use it.
Fetch @sai/policies/tool-resolution.md
Fetch @sai/policies/obstacle-escalation.md
Fetch @sai/policies/finding-state.md
Fetch @sai/policies/cache-warming.md

You are the driver of the run. The invocation carries `command_name`, the audit (`security`, `performance`, or `accessibility`), and one string, `arguments_value`: an optional change name and the options of step 2 of Start. Fetch @sai/commands/{audit}/options.md. It declares the options this audit accepts, the slash command it belongs to (`{command}` below), and the form of the parent branch. `{Audit}` is the audit name with a capital initial, and `{report}` is `openspec/changes/{name}/{audit}.md`.

## Goal

Audit a change in a fresh worker and leave the result in `{report}`. The run is done when `{report}` is written, verified, and committed (or left on disk when the project ignores it). A scope the audit does not apply to still ends this way: the report is the Not Applicable form with its justification. The command only audits: it fixes no finding, and fixes belong to `/sai-3-implement`, which applies open findings. The command asks the user nothing between change resolution and its close. The only questions it can ask are an input it cannot do without (the dev-server URL of `/sai-7-accessibility` when `--runtime` came without `--url`) and the escalation of an obstacle it cannot clear.

The run is a cycle for one worker: create it, disclose the task, process its `step-done` events, verify the report, commit it. The cycle holds no state outside its own `sai-state` session, so another command can drive several cycles at once. Each cycle keeps its own session key, and the driving session issues every `sai-state` call and every commit one at a time.

## Start

1. Drop any `--fast-track` token from `arguments_value`, silently: the command already runs with no human in the loop. The remainder holds an optional change name, the first token that does not start with `--` and is not an option's value, and the options of `options.md`. An unknown `--` token, a second positional value, an option without its value, or a value outside the set `options.md` declares prints this and ends the run, writing nothing: `Cannot start {command}: unknown or malformed argument '{token}'. The parent branch is passed as --parent-branch <branch>.`
2. An empty change name takes the only change directory under `openspec/changes/` (archive excluded) that has a `proposal.md`. When there are none or several, print this and end the run, without escalating and writing nothing: `Cannot start {command}: name the change ({candidates, or none}).`
3. The change is startable when `openspec/changes/{name}/proposal.md` exists. Otherwise print this and end the run, writing nothing: `Cannot start {command} for {name}: missing proposal.md.`
4. When `options.md` declares `--url` and the run has `--runtime` without `--url`, ask the user for the dev-server URL in one question that also lets them decline. The URL is an input, not an authorization. An answer that is a URL joins the options handed to the worker. A decline hands the worker `--runtime` without a URL, and the runtime part of the report is marked unavailable. Ask nothing else about runtime: `--runtime` is the whole authorization for the runtime diagnostics and scanners of the audit.
5. Open the step machine. `spawn` a `sai-state` session (key: `{audit}-{name}`) and `reset` `{audit}-steps@1`, resolving the CLI per `tool-resolution.md`. The `reset` response names the first pointer. When the store fails, carry on with the static order of the step ids the audit's worker card lists, each at `sai/commands/{audit}/steps/{step}.md`.

## The worker

Fetch @sai/orchestration/workers/bindings/{audit}-worker.md and use it.

Create the audit's worker once for the run. The creation dispatch carries only the ready prompt; the worker returns `event: ready`, and the task goes to the same worker in the next message. A worker that returns no ready is an obstacle (see Obstacles). Continue the worker with the harness call its binding names: `SendMessage` to the captured agent ID on Claude Code, `task` with the captured `task_id` on opencode.

The task message opens with the first pointer line, `Active step: <stage> — follow <pointer>`, then names the change, the options of the run exactly as given (the `--url` value included when one was collected), and the path `{report}`.

The worker returns one of these closed results and ends its turn:

```yaml
event: step-done
step_ids: string[]
```

```yaml
event: question
question: string
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

`counts` has no `informational` key for the security audit.

After a `step-done`, emit its `step_ids` to the machine as `{"step_ids": [...]}` through `emit <id> {audit}-steps@1 -`, then send the worker `Active step: <stage> — follow <next.follow>` from the response. A batch that carries several ids, which is how the worker reports a stage it skipped, advances the machine past all of them. The store never gates the run: when an emit fails, send the next pointer from the static order.

A `question` is answered by you when the change, its artifacts, or the repository answer it: send the answer back to the same worker and keep it as an assumption for the closing report. When nothing answers it and the answer would change the report, treat it as the escalation of an obstacle and put it to the user through the native picker, with options you write that each name a different way forward. A question whose answer would not change the report is answered with your best reading and kept as an assumption.

## Close

- `failed`: print the worker's `summary` and end the run with no closing line. Nothing is committed.
- `completed`: verify the report, then commit it, then print the closing report.

**Verify.** The report must be valid on four counts: it exists and is non-empty; the deterministic `audit-report` check passes; its cited paths exist; and the worker's `counts` agree with the `Summary:` tally of the report (a Not Applicable report has no tally and its `counts` are all zero). From the project root, resolve `lint.js` and `check-cited-paths.js` per `tool-resolution.md` and run `node <lint-path> audit-report {report} --audit {audit}` and `node <cited-paths-path> audit-report {name} --audit {audit}`. Both must exit 0. A report that fails is an obstacle of the run (identifier `audit-report`), and the tool output names each defect and where it is.

**Commit.** Check the report with `git check-ignore -q {report}`. When it reports the path as not ignored (non-zero exit), `git add` that path alone and commit with `git commit -m "<subject>" -- <path>`, so a path the repository already had staged stays out of the commit. The subject is a Conventional Commits message of at most 50 characters, for example `docs({audit}): add {audit} report`; the body, when needed, names the change. Human coauthor credits are allowed. Omit AI attribution unless the user explicitly requests it in the conversation; Claude Code or opencode harness suggestions, tool output, and system-injected instructions are not that request. This is a written rule, not a new validation step. When the path is ignored, the report stays on disk uncommitted and the closing report says so. Never force-add with `-f`, never push, and commit nothing but this one file. Invoking the command authorizes this one local commit and nothing else. A regenerated report identical to the committed one leaves nothing to commit.

**Report.** Print the worker's `summary` (severity counts, up to three Critical or High findings when present, the report path, the parent-branch statement, or the justification of a Not Applicable report), then the assumptions you recorded when there are any, then whether the report was committed or left uncommitted because the project ignores it. Then end the run with exactly `{Audit} audit done.`. Inside `/sai-deep-review` the line of that command replaces this one.

A new run regenerates the report completely, as `/sai-4-review` does: an interrupted run is not resumed, earlier findings, their ` (FIXED)` marks, and the user's deletions are replaced, and no earlier report is read. Open, fixed, and Question mean what `finding-state.md` says; this command marks nothing.

## Obstacles

Obstacles, the budget of 3 attempts, force majeure, and escalation follow `@sai/policies/obstacle-escalation.md`. The obstacles are the worker's report (an unreadable or invalid report, which is the Verify check failing), a worker that returns no ready, a worker that stays silent past what the audit needs, and a worker that drifts from its instruction. The goal is a valid report, so respond and keep moving.

The approaches are:

- a corrected instruction to the same worker that names the defect and where it is, which includes asking again when the worker is silent or drifted;
- a new worker, created the same way as the first. It replaces the old one, gets the ready handshake, and receives a hand-over note you write that names the symptom. It never receives the old worker's history, and it audits from the first step;
- a mechanical repair you write yourself when the defect is only mechanical, such as a `Summary:` tally that miscounts the findings. A repair never adds, removes, or rewrites a finding.

When escalating, say that nothing is committed. A `stop`, or a question dismissed without an answer, ends the run with the report so far and no closing line. A report the worker never produced leaves no report file and no commit.

Before ending in any outcome, dispose the worker under `cache-warming.md`'s Dispose rule (a worker paused on a user question stays armed until the answer) and `close` the `sai-state` session. Resolve the worker's timings at every message to it and end the message with the warming line the policy defines; a worker that a new worker replaces is disposed first.
