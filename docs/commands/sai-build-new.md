# `/sai-build-new`

## Command function

Runs a change's build in one invocation. Today it chains one segment, [`/sai-3-implement-new`](sai-3-implement-new.md), and reserves the next position for a future `/sai-4-review`.

## Flags and behavior modifiers

- `--fast-track`: accepted and ignored. Local commits are authorized by invoking the command.

## In detail

The command resolves the change once and runs the implementation segment in the same session, with no approval between segments. All behavior, preconditions, checks, and stops are the ones described in [`/sai-3-implement-new`](sai-3-implement-new.md).

When the segment completes, the command prints its closing report and ends with `Build-new done.`. When the segment is blocked, stopped, or fails its preconditions, the command prints that report, names `build-log.md` when the segment wrote one, ends without the closing line, and starts no later segment.

The command does not replace `/sai-build`, `/sai-3-implement`, or `/sai-4-apply`. They stay as they are while the new commands coexist with them.
