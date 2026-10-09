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
   dispatches nothing and runs `decline-close`. After `direct-label`, before
   the fix loop: Fetch @sai/commands/meta-review/findings-selection.md and
   follow it. Its selected findings and exclusions determine the fix scope; if
   it returns no selected findings, run `decline-close` without a dispatch.

## Fix loop

Fetch @sai/policies/command-execution.md and follow it exactly.
Fetch @sai/policies/unattended-runtime-recovery.md and use it in the failure handling below.

Guard the fix loop below per `@sai/policies/no-commit-guard.md` § Window
pairing: `snapshot` when its window opens and `verify` before the staging
below, which is the loop's closing boundary. On a `violation` verdict,
remediate exactly as the policy prescribes, then go straight to the caller's
close with no commit.

1. Fetch @sai/orchestration/workers/bindings/review-fix-worker.md and use it.
   Dispatch `sai-review-fix-worker` with one `arguments_value`: the marker line
   `--review-fix`, a newline, then the full **selected** findings input and a
   clearly labeled exclusion list with source-qualified ids and titles. Never
   forward an excluded finding as a requested fix. When no findings were
   excluded, label the exclusion list `none`.
2. Read the resulting diff read-only and check it against the selected findings
   **and** the exclusions. While selected findings remain or an unauthorized
   change needs correction, continue THE SAME fix worker with exactly the
   ordered outstanding selected findings or verification note; keep the
   exclusion list in force on every continuation. Outstanding work is only
   ever selected findings. The loop is capped at three rounds: a third
   completed round that still carries findings is non-convergence — stage
   nothing, commit nothing, and append the manual-route note after the caller's
   close.
3. **Scope conflict** — the one path for a selected fix that reaches an
   excluded finding. Stage nothing and commit nothing in every case:
   - The worker returns `failed` before writing and names an excluded-finding
     dependency: show that dependency and return to `findings-selection.md` for
     one revised selection, then restart this fix loop with a fresh dispatch.
     A second conflict in the same close runs `decline-close`.
   - The diff fixes an excluded finding or cannot separate it from a selected
     fix: report the conflict and the written paths, then run `decline-close`;
     a revised selection needs a new review run.
   - Any other `failed` result, or a malformed fix-worker payload: apply the
     resilience rule of `@sai/policies/unattended-runtime-recovery.md`. On yes,
     correct and continue within the three-round cap (no round is added). On no,
     stop per its § Stop condition notice, stage and commit nothing, and run
     `decline-close`.

Record every automatic correction and every ignored process statement for the
terminal report in the layout of `@sai/policies/autonomy-audit-log.md`, appended
after the caller's close.

## Commit

On convergence, between guard windows: stage only the fix worker's changed-files
union with path-scoped `git add`, author the message from the staged state under
`@sai/policies/commit-rules.md`, and create one local commit with
`git commit -F -`, passing the complete message literally on standard input
under `@sai/policies/command-execution.md`. That single commit is the close's
whole git write: no push, no amend, no retry, no other path staged.
