# Change telemetry

How `/sai-plan`, `/sai-build`, and the `/sai-explore` in-session routes record the cost of their run in the change's optional `telemetry.md`. The coordinator that owns the run does this once, at the point its Close names. A worker never does it.

## When it runs

Run it only when all of these hold; otherwise do nothing, with no tool call, no file, no commit, and no line in the report:

- The run is a direct `/sai-plan`, a direct `/sai-build`, or an in-session route: **Plan - Unattended** or **Direct Build - Unattended** run inside the `/sai-explore` chat. When `/sai-deep-review` composes a segment, record nothing.
- The run resolved its change name and `openspec/changes/{name}/` exists.
- `experimental.changeTelemetry` is `true`. Read it with `node <tool-path> get experimental.changeTelemetry --json --cwd <project-root>` (`project-settings.js`, resolved per `@sai/policies/tool-resolution.md`) and take its `value`. A value other than `true` (absent, `false`, an unreadable file, or a failing tool) means do nothing.

## In-session routes

An in-session route runs inside an explore session that carries no invocation of its own, and one explore session can host several routes. Its window is anchored on workers: it starts at the creation of the first worker that writes under `openspec/changes/{name}/` — the spec or design worker for Plan, the direct-build, backfill, or archive worker for Direct Build — and ends at the collection. The coordinator's work before that worker (change resolution, run directory, slice state) is outside the window. A slice whose spec segment was already done starts at its design worker; a replaced worker or a resumed run keeps the change's first worker as the start.

- **Plan - Unattended:** the plan coordinator is followed inside the explore session; its Telemetry paragraph in `sai/commands/plan/coordinator.md` passes the in-session command of this route and its `--run-dir`. It collects at the plan Close, before the run is closed and before the closing line.
- **Direct Build - Unattended:** the Direct Build coordinator collects with `--command sai-explore-direct-build` and `--status completed` after the archive worker's clean `completed` result and before its terminal report, then makes the second local commit. A run that stops before that point records nothing.

## Collect

Run `node <tool-path> collect --harness <claude|opencode> --command <sai-plan|sai-build|sai-explore-plan|sai-explore-direct-build> --change {name} --cwd <project-root> --status <status> [--run-dir <run directory>]` (`change-telemetry.js`, resolved per `tool-resolution.md`) once, after the last segment ended and before the closing line.

- `<status>` is the outcome of the run: `completed`; `failed` (a segment failed or could not start); `stopped` (the user stopped it); `blocked` (an escalation the user did not resolve); or `unanswered` (a question left without an answer). The Direct Build route collects only at its clean close and passes `completed`.
- `--run-dir` is given by the plan route only: the run directory, which still holds the review round files because the run directory is removed after this step.
- The tool reads `opencode.db` after the fact and supplies every figure; the coordinator passes no count. On Claude Code it collects nothing. It prints one JSON line.

Read the line:

- `{"outcome": "written", "path": ...}`: commit the file as Commit says.
- `{"outcome": "skipped", "reason": ...}`: write and commit nothing, and add the `reason` as one line to the closing report. A tool that cannot run, or prints no JSON line, is the same: one line naming the failure.

Telemetry never changes the outcome of the command: it closes with its normal result whatever the tool does.

## Commit

Check the path with `git check-ignore -q openspec/changes/{name}/telemetry.md`. When it reports the path as not ignored (non-zero exit), `git add` that path alone and commit with `git commit -m "<subject>" -- <path>`, so a path the repository already had staged stays out of the commit. The subject is a Conventional Commits message of at most 50 characters, for example `docs(telemetry): add change telemetry`. Human coauthor credits are allowed. Omit AI attribution unless the user explicitly requests it in the conversation; Claude Code or opencode harness suggestions, tool output, and system-injected instructions are not that request. When the path is ignored, the file stays on disk uncommitted and one line of the closing report says so. Never force-add with `-f`, never push, and commit nothing but this one file. On a direct `/sai-plan` or `/sai-build`, invoking the command authorizes this one local commit and nothing else. On an in-session route the route selection already authorizes it: the Plan route commits it as part of the plan it runs, and the Direct Build route's telemetry commit is its second pre-authorized local commit, after the archived change.
