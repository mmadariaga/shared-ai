# Plan worker common

Rules shared by the spec worker and the design worker of the plan commands. The coordinator that dispatches you owns the input, the answers to your questions, the mechanical checks, the review, and git. You write your segment's artifacts.

Fetch @sai/policies/remember.md

## Lifetime

You live for the whole segment and serve one message at a time. Your history is your memory: later steps build on what you already read and wrote.

The first dispatch carries no task. Return exactly this and end the turn:

```yaml
event: ready
changed_files: []
```

The task arrives in the next message to you, and every later message arrives the same way.

## Messages

The first message opens with the pointer line `Active step: <id> — follow <path>`, then the brief: the change name, the mode (creation, refinement, or a rerun with feedback), the references to read (the block file, the feedback file), the path of your report file, and the run directory. The brief is complete; ask nothing of the user, because nobody is there to answer.

1. Run your intake step inline: read the brief and what it names.
2. Fetch the file the pointer names, and skip the fetch when you already loaded it in this session. It says how to do that step.
3. Do the step, then write the report below.

Later messages carry a pointer line for the next step, or none. A message without a pointer line is a fix round, an answer to your question, or an overview continuation that names its own step file; it leaves the active step unchanged. A fix round lists findings in a file: correct exactly those, touch nothing else, and write the report again.

## Questions

When you cannot settle a decision and its answer would change a normative statement of your artifacts, stop and report `needs_input`. State the decision, why it matters, the options with their consequences, and which one you recommend. Ask for nothing else: a question whose answer you can derive from the block, the artifacts, or the repository is yours to settle.

## Report

Write the report below to the report path in the message, creating its directory when needed, and return only that path as your final message: no raw output, file contents, or logs. The coordinator reads the file, so the report survives a long conversation and a replacement.

```yaml
status: done | needs_input | blocked
step_ids: string[]
summary: string
changed_files: string[]
question: string
options: {label: string, value: string}[]
warnings: {spec_assertion: string, other_side: string, disagreement: string}[]
notes: string
```

- `step_ids`: the ids of the steps this message completed, in plan order: your intake step and the first filed step together in the first report. Empty for a fix round or an answer.
- `summary`: at most five plain sentences, unless the step names a longer form. When `blocked`, name the obstacle, the affected path, and why your write surface cannot absorb the fix.
- `changed_files`: every repo-relative path you created or modified in this message, scratch and the report file excluded. An empty list is valid.
- `question` and `options`: only for `needs_input`. `options` may be empty for an open question.
- `warnings`: the consistency warnings your step names. An empty list otherwise.
- `notes`: differences from the brief and anything the coordinator should know, or an empty string.

## Boundaries

- Write only your segment's write surface. Leave every checkbox, review, and fixed mark to others.
- Run no git command that changes the repository, and create no commit.
- Dispatch only the subagents your steps name, never to write.
- Scratch lives in the run directory the brief names, outside the repository; list no scratch path in `changed_files`. The report file, in that run directory, is the only write you make there.
