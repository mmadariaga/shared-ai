# Implement worker common

Rules shared by the RED and GREEN workers of `/sai-3-implement`. The coordinator that dispatches you owns the plan, the tests' verdict, and git.

Fetch `@sai/policies/remember.md`
Fetch `@sai/policies/repository-artifact-scope.md` and use it as the shared protected-surface rule. Your role's allowed files below are narrower and prevail.
Fetch `@sai/policies/code-quality-priority-stack.md`
Apply it within your role and the brief; it grants no path or permission.
Fetch `@sai/policies/worker-report-transport.md` and follow its author side for every report.

## Lifetime

You live for the whole run and serve one step per message. Your history is your memory: later steps build on files and conventions you already know.

The first dispatch carries no task. Return exactly this and end the turn:

```yaml
event: ready
changed_files: []
```

The first task arrives in the next message to you, and every later step arrives the same way.

## Step message

Your first task message opens with the line `--report-dir <path>`, the report directory of the run: strip it, keep it for every later message, and save each report there. Each message then opens with the pointer line `Active step: <id> — follow <path>`, followed by the brief: the change name, the step's goal, the plan references to read (or the audit findings to fix), the paths you may write, the run directory for scratch, the report name, and any override. The brief is complete; ask only through a `needs_input` report, under § Report. A worker created to replace another also gets a hand-over summary the coordinator wrote; it is the only account of earlier work you receive, and the files in the working tree are the rest.

1. Run `task-intake` inline: read the brief and the plan references it names.
2. Fetch the file the pointer names, and skip the fetch when you already loaded it in this session. It says how to do your role's work for one step.
3. Do the work, then return the report below.

An override in the brief takes precedence over the plan. The plan is a plan: when it and the brief disagree, follow the brief and name the difference in `notes`.

## Report

Save the report as the transport policy says: write it to a unique draft file in the run directory, then run `transfer.js put --dir <report-dir> --path <report name>.yaml --input-file <draft>`. Return only the `{path, sha256}` that `put` prints as your final message, with the `warming: true|false` line of `@sai/policies/cache-warming.md` beside it when the warming switch reached you: no raw output, file contents, logs, or inline result. A message that carries the result inline is an invalid report. The coordinator validates the reference and then acts on it, so the report survives a long conversation and a replacement. Every response, a question included, is a new report file under a new report name.

```yaml
status: completed | needs_input | failed | cancelled
summary: string
changed_files: string[]
test_command: string
notes: string
```

A `needs_input` report adds `question` and `options` (`{label, value}` items) after `notes`, shaped per `@sai/policies/question-context.md`.

- `status`: `completed` when the step's work is done. `needs_input` when only the coordinator can settle a decision the step depends on (the brief and the interfaces contradict each other, a behavior cannot be tested or implemented without a change outside your allowed files): the coordinator answers from the change's artifacts or the repository and continues you with the answer. `failed` when you cannot finish the step for another reason. `cancelled` only when the coordinator's message tells you to abandon the step. No other value is valid, and `done` and `blocked` are retired.
- `summary`: at most three plain sentences. For `needs_input` and `failed`, name the obstacle, the affected path, and why your allowed files cannot absorb the fix.
- `changed_files`: every repo-relative path you created, modified, or removed in this step, scratch and the report file excluded. An empty list is valid.
- `test_command`: RED gives the exact command that runs only this step's tests. GREEN repeats the command from the brief.
- `notes`: differences from the plan and anything the coordinator should know, or an empty string.

## Boundaries

- Run no git command that changes the repository, and create no commit.
- Leave `tasks.md`, `interfaces.md`, `proposal.md`, `design.md`, `specs/`, the audit reports (`review.md`, `security.md`, `performance.md`, `accessibility.md`), every checkbox, and every fixed mark to the coordinator.
- Run no `openspec` command and dispatch no subagent.
- Scratch, the report draft included, lives in the run directory the brief names, outside the repository; list no scratch path in `changed_files`. The saved report in the report directory is your only other write outside the repository.
