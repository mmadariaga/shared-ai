# `/sai-4-review` coordinator

Fetch @sai/policies/public-chat.md and follow it exactly.
Fetch @sai/policies/remember.md
Fetch @skills/safe-operations/SKILL.md and use it.
Fetch @sai/policies/tool-resolution.md
Fetch @sai/policies/finding-state.md
Fetch @sai/commands/review/options.md. It declares the options this command accepts and the form of the parent branch.

You are the driver of the run. The invocation carries one string, `arguments_value`: an optional change name and the options of step 2 of Start.

## Goal

Review a change's diff against its parent branch in a fresh worker and leave the result in `openspec/changes/{name}/review.md`. The run is done when `review.md` is written, verified, and committed (or left on disk when the project ignores it), or when the diff is empty and the run says so. The command only reviews: it fixes no finding, and fixes belong to `/sai-3-implement`, which applies open findings. The command asks the user nothing between change resolution and its close; the only question it can ask is the escalation of a report the worker cannot produce.

## Start

1. Fetch @sai/policies/prereqs-check.md and run its check. A halt prints the matching literal and ends the run before anything else happens. Fetch @sai/policies/prereqs-paths.md for the artifact paths.
2. Drop any `--fast-track` token from `arguments_value`. The remainder holds an optional change name, the first token that does not start with `--` and is not an option's value, and the options below. An unknown `--` token, a second positional value, or an option without its value prints this and ends the run, writing nothing: `Cannot start /sai-4-review: unknown or malformed argument '{token}'. The parent branch is passed as --parent-branch <branch>.`
   - `--parent-branch <branch>`: the branch the diff is taken against. Default: detected by the worker.
3. An empty change name takes the only change directory under `openspec/changes/` (archive excluded) that has a `proposal.md`. When there are none or several, print this and end the run, without escalating and writing nothing: `Cannot start /sai-4-review: name the change ({candidates, or none}).`
4. The change is startable when `openspec/changes/{name}/proposal.md` exists. Otherwise print this and end the run, writing nothing: `Cannot start /sai-4-review for {name}: missing proposal.md.`
5. Open the step machine. `spawn` a `sai-state` session (key: `review-{name}`) and `reset` `review-steps@1`, resolving the CLI per `tool-resolution.md`. The `reset` response names the first pointer, `establish-diff-scope`. When the store fails, carry on with the static order: `establish-diff-scope`, `resolve-review-analysis`, `close-review-outcome`, each at `sai/commands/review/steps/{step}.md`.

## The worker

Fetch @sai/orchestration/workers/bindings/review-worker.md and use it.

Create `sai-4-review-worker` once for the run. The creation dispatch carries only the ready prompt; the worker returns `event: ready`, and the task goes to the same worker in the next message. A worker that returns no ready is an obstacle (see Obstacles). Continue the worker with the harness call its binding names: `SendMessage` to the captured agent ID on Claude Code, `task` with the captured `task_id` on opencode.

The task message opens with `Active step: establish-diff-scope — follow <pointer>`, then names the change, the `--parent-branch` value when one was given, and the path `openspec/changes/{name}/review.md`.

The worker returns one of these closed results and ends its turn:

```yaml
event: step-done
step_id: establish-diff-scope | resolve-review-analysis
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
status: no-changes | failed
summary: string
changed_files: string[]
```

After a `step-done`, emit the step's id to the machine as `{"step_ids": [...]}` through `emit <id> review-steps@1 -` (the first `step-done` carries `review-intake` and `establish-diff-scope`), then send the worker `Active step: <stage> — follow <next.follow>` from the response. The store never gates the run: when an emit fails, send the next pointer from the static order.

## Close

- `no-changes`: print the worker's `summary`, which is exactly `No changes detected against {parent-branch}. Nothing to review.`, write no `review.md`, commit nothing, and end the run with `Review done.`
- `failed`: print the worker's `summary` and end the run with no closing line. Nothing is committed.
- `completed`: verify the report, then commit it, then print the closing report.

**Verify.** Read `openspec/changes/{name}/review.md` yourself. It is valid when it exists and is non-empty, every finding heading (`####` under a severity heading) carries an identifier whose letter matches that heading (`C`, `H`, `M`, `L`, or `Q` followed by a number), the three `Surface touched` lines are present, and the closing `Summary:` tally matches the number of findings under each severity heading. The worker's `counts` must agree with the tally. A report that fails this check is an obstacle of the run (identifier `review-report`).

**Commit.** Check the report with `git check-ignore -q openspec/changes/{name}/review.md`. When it reports the path as not ignored (non-zero exit), `git add` that path alone and commit with `git commit -m "<subject>" -- <path>`, so a path the repository already had staged stays out of the commit. The subject is a Conventional Commits message of at most 50 characters, for example `docs(review): add review report`; the body, when needed, names the change. Human coauthor credits are allowed. Omit AI attribution unless the user explicitly requests it in the conversation; Claude Code or opencode harness suggestions, tool output, and system-injected instructions are not that request. This is a written rule, not a new validation step. When the path is ignored, the report stays on disk uncommitted. Never force-add with `-f`, never push, and commit nothing but this one file. Invoking the command authorizes this one local commit and nothing else. A regenerated report identical to the committed one leaves nothing to commit.

**Report.** Print the worker's `summary` (severity counts, the top three Critical findings when present, the report path, the parent-branch statement) and its `recommended_audits` block verbatim, then say whether `review.md` was committed or left uncommitted because the project ignores it. Then end the run with exactly `Review done.`. Inside `/sai-build` and `/sai-deep-review` the line of that command replaces this one.

A new review regenerates `review.md` completely: earlier findings, their ` (FIXED)` marks, and the user's deletions are replaced, and no earlier report is read. Open, fixed, and Question mean what `finding-state.md` says; this command marks nothing.

## Obstacles

The only obstacle is the worker's report: an unreadable or invalid `review.md` (the Verify check fails), a worker that returns no ready, a worker that stays silent past what the review needs, or a worker that drifts from its instruction. The goal is a valid report, so respond and keep moving.

Give the obstacle a budget of 3 attempts. An attempt is one response with an approach different from the previous one, so repeating an approach is not an attempt. The approaches are:

- a corrected instruction to the same worker that names the defect and where it is, which includes asking again when the worker is silent or drifted;
- a new worker, created the same way as the first. It replaces the old one, gets the ready handshake, and receives a hand-over note you write that names the symptom. It never receives the old worker's history, and it reviews from the first step;
- a mechanical repair you write yourself when the defect is only mechanical, such as a `Summary:` tally that miscounts the findings. A repair never adds, removes, or rewrites a finding.

An exhausted budget escalates at once. State in plain words what happened, what you tried, and that nothing is committed. Ask through the native picker with options you write: one or more ways to continue, each naming a different approach, and one that stops the run. A `continue` resets the budget and you carry out the chosen approach; a `stop`, or a question dismissed without an answer, ends the run with the report so far and no closing line. A report the worker never produced leaves no `review.md` and no commit.

Before ending in any outcome, `close` the `sai-state` session.
