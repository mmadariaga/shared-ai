# Direct Build Close

A findings-driven close: fix the remaining findings, then land the fix
in one local commit. The calling coordinator supplies `input` (the findings
files), `direct-label`, `decline-label`, and `decline-close` (the text that
closes the run when no fix runs). Selecting `direct-label` consents to delegated
writes and pre-authorizes exactly one local commit; nothing is dispatched
before that selection.

## Selector

1. When `input` reports zero remaining findings, offer no selector; the
   caller's standard close runs.
2. Leave open Questions (`Q*`) out of the fix input, and likewise every finding
   whose fix changes a requirement or the design: name those findings and route
   them to `/sai-1-spec` or `/sai-2-design`. When no remaining finding can be
   fixed without such a change, offer no selector: name the blocking Questions and
   findings and run `decline-close`.
3. Otherwise present exactly two options through the native picker:
   `direct-label` and `decline-label`. `decline-label`, or a dismissed picker,
   dispatches nothing and runs `decline-close`.

## Fix loop

Guard the fix loop below per `@sai/policies/no-commit-guard.md` § Window
pairing: `snapshot` when its window opens and `verify` before the staging
below, which is the loop's closing boundary. On a `violation` verdict,
remediate exactly as the policy prescribes, then go straight to the caller's
close with no commit.

1. Fetch @sai/orchestration/workers/bindings/review-fix-worker.md and use it.
   Dispatch `sai-review-fix-worker` with one `arguments_value`: the marker line
   `--review-fix`, a newline, then the findings input.
2. Read the resulting diff read-only and check it against the input findings.
   While findings remain, continue THE SAME fix worker with exactly the ordered
   finding list. The loop is capped at three rounds: a third completed round
   that still carries findings is non-convergence — stage nothing, commit
   nothing, and append the manual-route note after the caller's close.

## Commit

On convergence, between guard windows: stage only the fix worker's changed-files
union with path-scoped `git add`, author the message
from the staged state under `@sai/policies/commit-rules.md`, and create one
local commit with a HEREDOC message. That single commit is the close's whole
git write: no push, no amend, no retry, no other path staged.
