# `/sai-4-review` coordinator

Fetch `@sai/policies/public-chat.md` and follow it exactly.
Fetch `@sai/policies/remember.md`
Fetch `@skills/safe-operations/SKILL.md` and use it.
Fetch `@sai/policies/tool-resolution.md`
Fetch `@sai/policies/obstacle-escalation.md`
Fetch `@sai/policies/finding-state.md`
Fetch `@sai/policies/cache-warming.md`
Fetch `@sai/policies/worker-report-transport.md` and follow its receiver side for every review report.
Fetch `@sai/commands/review/options.md`. It declares the options this command accepts and the form of the parent branch.

You are the driver of the run. The invocation carries one string, `arguments_value`: an optional change name and the options of step 2 of Start.

## Goal

Review a change's diff against its parent branch in a fresh worker and leave the result in `openspec/changes/{name}/review.md`. The run is done when `review.md` is written, verified, and committed (or left on disk when the project ignores it), or when the diff is empty and the run says so. The command only reviews: it fixes no finding, and fixes belong to `/sai-3-implement`, which applies open findings. The command asks the user nothing between change resolution and its close; the only question it can ask is the escalation of a report the worker cannot produce.

## Start

1. Fetch `@sai/policies/prereqs-check.md` and run its check. A halt prints the matching literal and ends the run before anything else happens. Fetch `@sai/policies/prereqs-paths.md` for the artifact paths.
2. Drop any `--fast-track` token from `arguments_value`. The remainder holds an optional change name, the first token that does not start with `--` and is not an option's value, and the options below. An unknown `--` token, a second positional value, or an option without its value prints this and ends the run, writing nothing: `Cannot start /sai-4-review: unknown or malformed argument '{token}'. The parent branch is passed as --parent-branch <branch>.`
   - `--parent-branch <branch>`: the branch the diff is taken against. Default: detected by the worker.
3. An empty change name takes the only change directory under `openspec/changes/` (archive excluded) that has a `proposal.md`. When there are none or several, print this and end the run, without escalating and writing nothing: `Cannot start /sai-4-review: name the change ({candidates, or none}).`
4. The change is startable when `openspec/changes/{name}/proposal.md` exists. Otherwise print this and end the run, writing nothing: `Cannot start /sai-4-review for {name}: missing proposal.md.`
5. Open the step machine. `spawn` a `sai-state` session (key: `review-{name}`) and `reset` `review-steps@1`, resolving the CLI per `tool-resolution.md`. The `reset` response names the first pointer, `establish-diff-scope`. When the store fails, carry on with the static order: `establish-diff-scope`, `resolve-review-analysis`, `close-review-outcome`, each at `sai/commands/review/steps/{step}.md`.
6. Open the report directory of the run with `transfer.js open --harness <claude|opencode>` (resolved per `tool-resolution.md`) and keep the `dir` it returns in the conversation, as the run's only memory of it. When the tool cannot open the directory, print its error and end the run before any dispatch, writing nothing.

## The worker

Fetch `@sai/orchestration/workers/bindings/review-worker.md` and use it.

Create `sai-4-review-worker` once for the run. The creation dispatch carries only the ready prompt; the worker returns `event: ready`, and the task goes to the same worker in the next message. A worker that returns no ready is an obstacle (see Obstacles). Continue the worker with the harness call its binding names: `SendMessage` to the captured agent ID on Claude Code, `subagent` with the same `agent` and the captured `sessionID` on opencode, after the worker's completion notification has arrived.

**Warm and dispose.** Following `cache-warming.md`, end every task message and continuation to the worker with the warming switch the policy defines. Under `worker-lifecycle.md`, dispose the worker when a new worker replaces it and, in every outcome, at the close of the run or of this segment inside `/sai-build` or `/sai-deep-review`, before the next segment starts. Dispose each executor after its result and each explorer you dispatched at that close. The `warming` declaration gates no dispose.

The task message opens with the line `--report-dir <report directory>` (a replacement's first message opens with it too, and no later message does), then `Active step: establish-diff-scope — follow <pointer>`, then names the change, the `--parent-branch` value when one was given, and the path `openspec/changes/{name}/review.md`.

The worker saves each report as a new file in the report directory and returns only the reference `{path, sha256}` and its `warming` line, which you keep per `cache-warming.md`, and ends its turn. Before you read any field, validate every response after ready with `worker-report-validator.js` (resolved per `tool-resolution.md`), as `worker-report-transport.md` says, and act on the `payload` of an accepted verdict without reading the file again. The file name tells the kind: a name that starts with `progress-` is a progress report, which the machine emit below verifies and validates itself, so you run no `validate` call for it; any other report is terminal, validated with `validate --kind terminal --command review --json --report-dir <report directory> --report-file <path> --report-hash <sha256>`. When the validator cannot be resolved, the run stops on that obstacle: you never interpret a report by reading it. A message that carries its result inline, including the retired `event: step-done`, is an invalid report. The accepted reports are:

```yaml
event: progress
step_ids: string[]
changed_files: string[]
```

```yaml
status: completed
summary: string
changed_files: string[]
review_path: string
counts: {critical: n, high: n, medium: n, low: n, questions: n}
recommended_audits: string
```

```yaml
status: completed
outcome: no-changes
summary: string
changed_files: []
```

```yaml
status: failed
summary: string
changed_files: string[]
```

**Undelivered reports.** While you wait for the worker's result, follow `worker-report-transport.md` § Undelivered reports: watch the report directory, ignore a reference you already accepted, and record each reference you process.

A `completed` report without `outcome` carries the review's role fields; the validator admits no `outcome` but `no-changes` for this command. A `needs_input` or `cancelled` report is an obstacle of the run, because the review asks nothing and is never told to abandon.

For a progress report, pass its reference to the machine with `sai-state emit <id> review-steps@1 --progress --report-dir <report directory> --report-file <path> --report-hash <sha256>` (the first progress report carries `review-intake` and `establish-diff-scope`). The emit verifies the reference and validates those bytes before it advances the machine; a response whose `validation.ok` is `false` means the report is invalid (delivery failed or the content is outside the schema) and the machine did not advance, and you handle it like any other invalid report. After an accepted progress report, send the worker `Active step: <stage> — follow <next.follow>` from the response. The store never gates the run: when the emit fails, send the next pointer from the static order.

## Close

- `completed` with `outcome: no-changes`: print the worker's `summary`, which is exactly `No changes detected against {parent-branch}. Nothing to review.`, write no `review.md`, commit nothing, and end the run with `Review done.` Inside `/sai-build` and `/sai-deep-review`, the empty-diff case is this accepted payload's `outcome: no-changes`; those commands decide on that field and never on the summary text.
- `failed`: print the worker's `summary` and end the run with no closing line. Nothing is committed.
- `completed` without `outcome`: verify the report, then commit it, then print the closing report.

**Verify.** Read `openspec/changes/{name}/review.md` yourself. It is valid when it exists and is non-empty, every finding heading (`####` under a severity heading) carries an identifier whose letter matches that heading (`C`, `H`, `M`, `L`, or `Q` followed by a number), the three `Surface touched` lines are present, and the closing `Summary:` tally matches the number of findings under each severity heading. The worker's `counts` must agree with the tally. A report that fails this check is an obstacle of the run (identifier `review-report`).

**Commit.** Check the report with `git check-ignore -q openspec/changes/{name}/review.md`. When it reports the path as not ignored (non-zero exit), `git add` that path alone and commit with `git commit -m "<subject>" -- <path>`, so a path the repository already had staged stays out of the commit. The subject is a Conventional Commits message of at most 50 characters, for example `docs(review): add review report`; the body, when needed, names the change. Human coauthor credits are allowed. Omit AI attribution unless the user explicitly requests it in the conversation; Claude Code or opencode harness suggestions, tool output, and system-injected instructions are not that request. This is a written rule, not a new validation step. When the path is ignored, the report stays on disk uncommitted. Never force-add with `-f`, never push, and commit nothing but this one file. Invoking the command authorizes this one local commit and nothing else. A regenerated report identical to the committed one leaves nothing to commit.

**Report.** Print the worker's `summary` (severity counts, the top three Critical findings when present, the report path, the parent-branch statement) and its `recommended_audits` block verbatim, then say whether `review.md` was committed or left uncommitted because the project ignores it. Then end the run with exactly `Review done.`. Inside `/sai-build` and `/sai-deep-review` the line of that command replaces this one.

A new review regenerates `review.md` completely: earlier findings, their ` (FIXED)` marks, and the user's deletions are replaced, and no earlier report is read. Open, fixed, and Question mean what `finding-state.md` says; this command marks nothing.

## Obstacles

Obstacles, the budget of 3 attempts, force majeure, and escalation follow `@sai/policies/obstacle-escalation.md`. The only obstacle is the worker's report: a report that does not validate (identifier `review-report`, with the budget of the run, as `worker-report-transport.md` § Invalid reports says), an unreadable or invalid `review.md` (the Verify check fails), a worker that returns no ready, a worker that stays silent past what the review needs, or a worker that drifts from its instruction. The goal is a valid report, so respond and keep moving.

The approaches are:

- a corrected instruction to the same worker that names the defect and where it is, which includes asking again when the worker is silent or drifted; the first invalid report goes back to the same worker with the validator's errors, and a second consecutive invalid report from that worker replaces it;
- a new worker, created the same way as the first. It receives a hand-over note you write that names the symptom, and it reviews from the first step;
- a mechanical repair you write yourself when the defect is only mechanical, such as a `Summary:` tally that miscounts the findings. A repair never adds, removes, or rewrites a finding.

When escalating, say that nothing is committed. A `stop`, or a question dismissed without an answer, ends the run with the report so far and no closing line. A report the worker never produced leaves no `review.md` and no commit.

Before ending in any outcome, dispose the worker as Warm and dispose says, and `close` the `sai-state` session. A run that ended with `Review done.` also closes its report directory with `transfer.js close --dir <report directory>`; a failed, stopped, or unanswered run keeps it.
