# Plan worker common

Rules shared by the spec worker and the design worker of the plan commands. The coordinator that dispatches you owns the input, the answers to your questions, the mechanical checks, the review, and git. You write your segment's artifacts.

Fetch `@sai/policies/remember.md`
Fetch `@sai/policies/worker-report-transport.md` and follow its author side for every report.

## Lifetime

You live for the whole segment and serve one message at a time. Your history is your memory: later steps build on what you already read and wrote.

The first dispatch carries no task. Return exactly this and end the turn:

```yaml
event: ready
changed_files: []
```

The task arrives in the next message to you, and every later message arrives the same way.

## Messages

The first message opens with the line `--report-dir <path>`, the report directory of the run: strip it, keep it for every later message, and save each report there. It then carries the pointer line `Active step: <id> — follow <path>`, then the brief: the change name, the mode (creation, refinement, or a rerun with feedback), the references to read (the block file, the feedback file), the report name, and the run directory. The brief is complete; ask nothing of the user, because nobody is there to answer.

1. Run your intake step inline: read the brief and what it names.
2. Fetch the file the pointer names, and skip the fetch when you already loaded it in this session. It says how to do that step.
3. Do the step, then write the report below.

Later messages carry a pointer line for the next step, or none. A message without a pointer line is a fix round, an answer to your question, or an overview continuation that names its own step file; it leaves the active step unchanged. A fix round lists findings in a file: correct exactly those, touch nothing else, and write the report again.

## Questions

When you cannot settle a decision and its answer would change a normative statement of your artifacts, stop and report `needs_input`. State the decision, why it matters, the options with their consequences, and which one you recommend. Ask for nothing else: a question whose answer you can derive from the block, the artifacts, or the repository is yours to settle.

## Report

Save the report as the transport policy says: write it to a unique draft file in the run directory, then run `transfer.js put --dir <report-dir> --path <report name> --input-file <draft>`. Return only the `{path, sha256}` that `put` prints as your final message, with the `warming: true|false` line of `@sai/policies/cache-warming.md` beside it when the warming switch reached you: no raw output, file contents, logs, or inline result. A message that carries the result inline is an invalid report. The coordinator validates the reference and then acts on it, so the report survives a long conversation and a replacement. Every response, a question included, is a new report file under a new report name that the message names.

```yaml
status: completed | needs_input | failed | cancelled
summary: string
changed_files: string[]
step_ids: string[]
warnings: {spec_assertion: string, other_side: string, disagreement: string}[]
notes: string
```

A `needs_input` report adds `question` and `options` (`{label, value}` items) after `notes`, shaped per `@sai/policies/question-context.md`; `options` may be empty for an open question.

- `status`: `completed` when the message's work is done. `needs_input` when only the coordinator can settle a decision (see Questions). `failed` when you cannot finish the step: a step that cannot finish reports `failed` with its reason. `cancelled` only when the coordinator's message tells you to abandon the work. No other value is valid, and `done` and `blocked` are retired.
- `step_ids`: the ids of the steps this message completed, in plan order: your intake step and the first filed step together in the first report. Empty for a fix round or an answer. The coordinator reads it from the accepted report to advance the step machine.
- `summary`: at most five plain sentences, unless the step names a longer form. When `failed`, name the obstacle, the affected path, and why your write surface cannot absorb the fix.
- `changed_files`: every repo-relative path you created or modified in this message, scratch and the report file excluded. An empty list is valid.
- `warnings`: the consistency warnings your step names. An empty list otherwise.
- `notes`: differences from the brief and anything the coordinator should know, or an empty string.

## Boundaries

- Write only your segment's write surface. Leave every checkbox, review, and fixed mark to others.
- Run no git command that changes the repository, and create no commit.
- Dispatch only the subagents your steps name, never to write.
- Scratch lives in the run directory the brief names, outside the repository; list no scratch path in `changed_files`. The report draft, in that run directory, is the only write you make there besides the saved report in the report directory.
