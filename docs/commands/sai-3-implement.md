# `/sai-3-implement`

## Command function

Prepares `implementation.md`, the guide for carrying out the design in concrete Steps with code/content instructions and checks. It plans the work; it does not execute it.

## Flags and behavior modifiers

- `--fast-track`: automatically corrects a design-phase defect when there is only one correction that preserves the original intent, and automatically approves permission for changes in the documentation area. Defects in the initial specification still require intervention.

## In detail

The command reuses design's relevant documentation and project conventions. It researches only evidence needed for a specific planning gap, reports each researched gap in the final summary, and asks you when the gap cannot be resolved. This works the same in normal mode, fast-track, `/sai-build`, and reruns.

Steps keep the order and one-to-one correspondence of `tasks.md`. In a Step with
RED tests, production content ranges from signatures with `TODO(sai-4)` what/how
comments to partial or complete code, depending on the Step's difficulty. Every
non-obvious decision stays in the plan; GREEN completes routine work against the
tests. Steps without RED and normative text such as prompts, required literals,
and configuration values remain fully specified. Descriptive documentation can
be provided as writing instructions in a tested Step.

The guide includes the order of the steps, the tests that must demonstrate each behavior, and any documentation decisions that are needed. If a change could affect an important project decision, the command may suggest recording it so the context is not lost.

Each RED/GREEN pair runs the same Step-scoped test command. The full repository
suite is specified once for apply's final gate. Existing applied work is preserved
on reruns rather than regenerated wholesale.

The result is a written plan, not an executed implementation. The command does not change project code or perform the steps itself. It stops when the guide is complete so the next phase can apply it in a controlled way.

When review or audit reports already exist for the change, the command acts on their open findings only. A finding carrying the fixed mark, written by the Direct Build close of `/sai-5-review` or `/sai-review`, is already fixed: it is not planned again, and a report whose findings are all fixed adds no step. This holds on Claude Code and opencode.
