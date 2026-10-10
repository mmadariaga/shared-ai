# `/sai-3-implement`

## Command function

Prepares a complete guide for carrying out the implementation. The guide turns the design into concrete work steps, including the code to add or change and the checks associated with each step.

## Flags and behavior modifiers

- `--fast-track`: automatically corrects a design-phase defect when there is only one correction that preserves the original intent, and automatically approves permission for changes in the documentation area. Defects in the initial specification still require intervention.

## In detail

The command reviews the design and turns it into an implementation guide precise enough for another run to follow step by step. For each part of the work, it states what must be done, what result is expected, and how to check it.

The guide includes the order of the steps, the tests that must demonstrate each behavior, and any documentation decisions that are needed. If a change could affect an important project decision, the command may suggest recording it so the context is not lost.

The result is a written plan, not an executed implementation. The command does not change project code or perform the steps itself. It stops when the guide is complete so the next phase can apply it in a controlled way.

When review or audit reports already exist for the change, the command acts on their open findings only. A finding carrying the fixed mark, written by the Direct Build close of `/sai-5-review` or `/sai-review`, is already fixed: it is not planned again, and a report whose findings are all fixed adds no step. This holds on Claude Code and opencode.
