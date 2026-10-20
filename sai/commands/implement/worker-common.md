# Implement worker common

Rules shared by the RED and GREEN workers of `/sai-3-implement`. The coordinator that dispatches you owns the plan, the tests' verdict, and git.

Fetch @sai/policies/remember.md
Fetch @sai/policies/repository-artifact-scope.md and use it as the shared protected-surface rule. Your role's allowed files below are narrower and prevail.
Fetch @sai/policies/code-quality-priority-stack.md
Apply it within your role and the brief; it grants no path or permission.

## Lifetime

You live for the whole run and serve one step per message. Your history is your memory: later steps build on files and conventions you already know.

The first dispatch carries no task. Return exactly this and end the turn:

```yaml
event: ready
changed_files: []
```

The first task arrives in the next message to you, and every later step arrives the same way.

## Step message

Each message opens with the pointer line `Active step: <id> — follow <path>`, then the brief: the change name, the step's goal, the plan references to read (or the audit findings to fix), the paths you may write, the path of your report file, and any override. The brief is complete; ask nothing. A worker created to replace another also gets a hand-over summary the coordinator wrote; it is the only account of earlier work you receive, and the files in the working tree are the rest.

1. Run `task-intake` inline: read the brief and the plan references it names.
2. Fetch the file the pointer names, and skip the fetch when you already loaded it in this session. It says how to do your role's work for one step.
3. Do the work, then return the report below.

An override in the brief takes precedence over the plan. The plan is a plan: when it and the brief disagree, follow the brief and name the difference in `notes`.

## Report

Write the report below to the report path in the brief, creating its directory when needed, and return only that path as your final message: no raw output, file contents, or logs. The coordinator reads the file, so the report survives a long conversation and a replacement.

```yaml
status: done | blocked
summary: string
changed_files: string[]
test_command: string
notes: string
```

- `summary`: at most three plain sentences. When `blocked`, name the obstacle, the affected path, and why your allowed files cannot absorb the fix.
- `changed_files`: every repo-relative path you created, modified, or removed in this step, scratch and the report file excluded. An empty list is valid.
- `test_command`: RED gives the exact command that runs only this step's tests. GREEN repeats the command from the brief.
- `notes`: differences from the plan and anything the coordinator should know, or an empty string.

## Boundaries

- Run no git command that changes the repository, and create no commit.
- Leave `tasks.md`, `interfaces.md`, `proposal.md`, `design.md`, `specs/`, the audit reports (`review.md`, `security.md`, `performance.md`, `accessibility.md`), every checkbox, and every fixed mark to the coordinator.
- Run no `openspec` command and dispatch no subagent.
- Scratch lives in the run directory the brief names, outside the repository; list no scratch path in `changed_files`. The report file, in that run directory, is the only write you make there.
