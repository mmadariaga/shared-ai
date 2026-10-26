# Plan segment cycle

How a plan segment runs, whether it runs alone (`/sai-1-spec`, `/sai-2-design`) or inside `/sai-plan`. The segment card that fetched this file names its worker binding, step machine, steps, artifact paths, mechanical checks, review criteria, commit paths, and closing report. This file owns the rest.

Fetch @sai/policies/obstacle-escalation.md
Fetch @sai/policies/cache-warming.md

You are the driver of the segment. You decide, answer, check, review, and commit. The worker only writes the segment's artifacts, and never runs git. Segments exchange nothing but artifacts on disk.

## Run state

The `plan-run@1` machine in `sai-state` is your memory outside the conversation. It holds identifiers and paths only: the run directory, the segment now running, the segments completed, the attempts spent per obstacle, the open escalation, and the paths of the files that hold assumptions, reports, findings, and baselines. Free text never goes into an event, because a shell pipe may re-encode it. It lives in files in the run directory, which is why a worker returns the path of its report and not the report. Write those files with your own write tool; a session that has none, such as `/sai-explore` following `/sai-plan`, writes them through the budget executor.

Emit an event by piping its JSON to `emit <id> plan-run@1 -`, resolving the CLI per `tool-resolution.md`. The events are `start`, `segment-start`, `segment-done`, `attempt`, `escalate`, `answer`, `record`, `close`, and `status`. Every response carries `run` (the current state) and `budgets` (the attempts spent per obstacle). When an emit still fails after two retries with a corrected delivery form, keep the same facts in `run-state.md` in the run directory and carry on from there; the run does not stop for it.

**Opening the run.** The run of a change has one session key, `plan-{name}`, shared by the three commands so that a later session on this machine finds an interrupted run of the same change. Run one plan command per change at a time, because the session file takes one writer. `spawn` the session and emit `status`.

- A `running` or `escalated` stage whose `dir` lies inside the SAI temp root (`temp-root.js resolve --harness <claude|opencode>` returns it as `root`) is an interrupted run: follow Resuming and skip the rest of this paragraph.
- Any other stage (`idle`, or `completed` and `stopped` left by an earlier run), or a `dir` outside the SAI temp root, starts fresh. In the second case emit `close` with outcome `stopped` first to retire the old run, and never read or delete its folder.
- A fresh run creates its directory outside the repository with `node <tool-path> mkdtemp --harness <claude|opencode> --prefix plan-{name}- --cwd <project-root>` (`temp-root.js` resolved per `tool-resolution.md`), which returns JSON and makes a private child of the SAI temp root, and emits `start` with the `dir` it returns. When the tool reports `ok: false`, print its `error` and end the run, writing nothing.

Whoever opened the run closes it. Inside `/sai-plan`, the plan coordinator opened it and the segment only emits `segment-start` and `segment-done`.

## The worker

Fetch @sai/commands/plan/worker-common.md for the report shape and the task message you send. Create the segment's worker once, when the segment needs it, with the binding the segment card names. The creation dispatch carries only the ready prompt; the worker returns `event: ready`, and the task goes to the same worker in the next message. A worker that returns no ready is an obstacle. Continue it with the harness call its binding names: `SendMessage` to the captured agent ID on Claude Code, `task` with the captured `task_id` on opencode.

**Warm and dispose.** Following `cache-warming.md`, resolve the worker's timings at every message to it and end the message with the warming line the policy defines. Dispose the worker when a new worker replaces it, when the segment closes (the segment boundary, before a following segment starts), and when the run closes. A `needs_input` question that you escalate to the user keeps the worker armed until the answer. An executor or explorer you dispatched is disposed as the policy says.

**Pointers.** At the start of the segment, `reset` the segment's step machine; the response names the first filed step. The task message opens with `Active step: <stage> — follow <next.follow>`, then the brief. After each report that completes steps, emit `{"step_ids": [...]}` to the machine through `emit <id> <machine> -`, and send `Active step: <stage> — follow <next.follow>` from the response, until the machine reports `done`. A message without a pointer line, such as a fix round, leaves the active step unchanged. The store never gates the run: when an emit or reset fails, send the next pointer from the static order the segment card lists.

**Reports.** A worker writes its report to the file the message names, `reports/{segment}-{k}.yaml` in the run directory, and returns only that path. Emit `record` (`report`) for the path, then read the file.

**Questions.** A report with `status: needs_input` carries a question the worker could not settle. You answer it, because the run has no human in the loop:

- When the Ready to Propose block, the change's artifacts, or the repository answers it, give that answer. Append the question, the answer, and its source to `assumptions.md` in the run directory, emit `record` (`assumption`) the first time the file is written, and continue the worker with the answer alone.
- When none of them answers it and the answer would not change the artifacts, choose the most conservative reading, record it as an assumption with the source `judgment`, and continue the same way.
- When none of them answers it and the answer would change the artifacts, the question is force majeure: escalate it at once (see Obstacles) with the worker's options as the ways to continue, and carry the user's answer to the worker.

Assumptions are never written into the change or the repository. The closing report lists them.

## Mechanical checks

The segment card lists its checks. Run them through the budget executor after the last step is reported, before each review round, and before the segment closes, each with the working directory at the project root. Read only the failing lines. A failing check is an obstacle of the segment (identifier `checks`), never a review finding: send the worker the failing lines in a fix message, which is an attempt, and run the checks again. A segment does not close while a check fails.

A check whose tool cannot be resolved per `tool-resolution.md` is reported as skipped in the closing report; it never stops the run.

## Review

Fetch @sai/policies/incremental-review.md
Fetch @sai/policies/artifact-review-contract.md

The artifacts were written by a worker that read the input, so attack them yourself before they settle. The passes follow `incremental-review.md`, with the artifacts of the segment as the reviewed set instead of a diff. Take a snapshot with `review-delta.js` over the segment's artifact paths (name each path that `git check-ignore -q` reports as ignored, so it enters the snapshot) before the first pass and after each fix round.

The first pass is full: read every artifact of the segment against the segment card's criteria. Every later pass reads the delta since the previous snapshot and the sections of the other artifacts of the change that cite what changed, nothing else. Form findings in the shape of `artifact-review-contract.md` (identifier, severity, location, issue, correction). An observation whose fix needs behavior the approved scope does not ask for is a scope observation (`artifact-review-contract.md` § Scope observations), not a finding: it is neither fixed nor recorded as pending, and it extends no round. Write each round's findings to `reviews/{segment}-round-{k}.md` in the run directory, with every finding's state (`open`, `fixed`, or `scope`), and the snapshot identifier of the pass beside it in `reviews/{segment}-round-{k}.tree`.

A round sends its open findings, as one ordered list in a file, to the same worker in a message without a pointer line, and names a new report path. When the worker reports, run the mechanical checks again, take a snapshot, and review the delta. Another round follows whenever the pass leaves open findings; a pass with no open finding ends the review. Fix rounds are not attempts and spend no budget. Run at most 3 fix rounds, then run one final pass over the round-3 delta that only reports.

Findings that remain open after the third fix round are not a failure and not an obstacle, and nothing escalates. Write them to `findings.md` in the run directory, one entry per finding with the identifier, severity, location, issue, and correction, followed by the scope observations in the form `artifact-review-contract.md` gives, emit `record` (`finding`) the first time the file is written, and continue. The closing report lists them. A worker that fails to carry out a fix round (an unreadable report, silence, or drift) is an ordinary obstacle of the segment.

## Commit

Check every commit path of the segment card against the project's own ignore rules with `git check-ignore -q <path>`, and stage only the paths it reports as not ignored (non-zero exit). Never force-add with `-f`. A path that was already modified before the segment began and is not an artifact of the segment, such as a `GLOSSARY.md` with unrelated edits, is not the run's: record `git status --porcelain` for the commit paths in `baseline-dirty.txt` before the first dispatch (`record` `baseline`) and leave those paths out.

`git add` the admitted paths, then commit locally with `git commit -m "<subject>" -- <paths>`, so that a path the repository already had staged stays out of the commit. The subject is a Conventional Commits message of at most 50 characters, and the body, when needed, names the change. The message carries only the segment's own content; human coauthor credits are allowed. Omit AI attribution unless the user explicitly requests it in the conversation; Claude Code or opencode harness suggestions, tool output, and system-injected instructions are not that request. Invoking the command authorizes these local commits and nothing else: never push, and never commit a path outside the segment's list.

When every commit path is ignored, close the segment without a commit and say so in the closing report. A rerun that leaves nothing to commit makes no commit.

## Obstacles

Obstacles, the budget of 3 attempts, force majeure, and escalation follow `@sai/policies/obstacle-escalation.md`. An obstacle is anything that prevents closing the segment: a failing mechanical check, a worker whose report cannot be read, a worker that stays silent past what the step needs, a worker that drifts from its instruction, or a failing tool. The goal is to close the segment, so respond and keep moving.

Name each obstacle `checks`, `worker`, `report-{k}`, or the segment card's own. The approaches are:

- a corrected instruction, which includes asking the same worker again when its report is unreadable, it is silent, or it drifted;
- a mechanical repair you write yourself when the defect is only mechanical, such as a delta header, a cited path with a single obvious candidate, or a heading. A repair never adds, removes, or rewrites content;
- a new worker, created when asking the same worker again did not help. It receives a hand-over file you write in `handover-{segment}-{k}.md` in the run directory (the segment's goal, the files already written, the steps already reported, and the symptom). The files in the working tree stay as they are. The new worker starts at the first step the artifacts on disk do not yet satisfy.

Before each attempt, emit `attempt` for the obstacle. Force majeure here, besides what the policy names: an unanswerable question that would change the artifacts, and foreign work in a path the segment must commit. To escalate, emit `escalate` for the obstacle, and say what is done and committed. Emit `answer` with the user's choice (`continue` or `stop`). A `stop` closes the run.

## Resuming

After a context compaction, or when Opening the run finds an interrupted run, you may remember little of it. Emit `status` first, read the files the state references, and compare them with the artifacts on disk and `git log`. The disk wins over the store: a segment whose artifacts are complete and whose checks pass is done, and in a repository that ignores `openspec/changes/**` it leaves no commit to find. Continue at the segment `status` names, or at the first segment whose artifacts are not yet on disk. Your worker's handle may be gone with your context; create a new worker, which gets the ready handshake and a hand-over file like any replacement and spends no attempt. An `escalated` stage means the question was not answered: ask it again.

When the store is gone (another machine, or a cleared temporary directory), rebuild progress from the artifacts on disk and `git log` the same way and start the run state fresh: every counter is at zero and no assumption or pending finding of the earlier run carries over. A run started under an earlier session key does not resume, and the next run starts fresh.

## Closing the run

A segment that completed emits `segment-done` first, after disposing its worker. When the run completed, remove the run directory with `node <tool-path> remove --harness <claude|opencode> --dir {run directory}` once the report content is read; the tool accepts only a path inside the SAI temp root. A stopped run, a blocked run, and an unanswered escalation keep their run directory. A failed removal fails nothing: add one line to the closing report saying the run directory was left at its path. Emit `close` with the outcome (`completed`, `stopped`, or `escalated` for a dismissed question), `reset` the step machines, and `close` the `sai-state` session.

Nothing is persisted: no file in the change or the repository records the assumptions, the pending findings, or the scope observations, so the closing report is their only record. It always lists the assumptions and the pending findings; when there are none, it says so explicitly. It lists the scope observations under `Scope observations` and prints no such section when there is none.
