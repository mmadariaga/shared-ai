# Direct Build Close

The Direct Build close: ask one round at the end, then fix the selected
findings and land the fix in one local commit. The calling coordinator supplies
`input` (the findings files) and `decline-close` (the text that closes the run
when no fix runs). Fixing anything in the round consents to delegated writes
and pre-authorizes exactly one local commit; nothing is dispatched before that
answer.

## Round

Fetch @sai/commands/meta-review/findings-selection.md and follow it. It holds
the whole round: the qualifying reports, one question per report, and the
validated selected and excluded sets. A fixable finding is any finding that is
not a Question (`@sai/policies/finding-state.md`); Questions are answered in
the round itself, so no finding is routed to another command.

1. When no report qualifies, there is no round; the caller's standard close
   runs.
2. When the round returns no selected findings, or the picker is dismissed,
   dispatch nothing and run `decline-close`.
3. Otherwise continue with the fix loop below, using the selected findings
   (answered Questions with their answers) and the exclusions.

## Fix loop

Fetch @sai/policies/command-execution.md and follow it exactly.
Fetch @sai/policies/unattended-runtime-recovery.md and use it in the failure handling below.
Fetch @sai/policies/autonomy-audit-log.md and use it for the terminal report below.

Guard the fix loop below per `@sai/policies/no-commit-guard.md` § Window
pairing: `snapshot` when its window opens and `verify` before the staging
below, which is the loop's closing boundary. On a `violation` verdict,
remediate exactly as the policy prescribes, then go straight to the caller's
close with no commit.

1. Fetch @sai/orchestration/workers/bindings/review-fix-worker.md and use it.
   Dispatch `sai-review-fix-worker` with one `arguments_value`: the marker line
   `--review-fix`, a newline, then the full **selected** findings input and a
   clearly labeled exclusion list with source-qualified ids and titles (excluded
   findings and unanswered Questions). Never forward an excluded finding as a
   requested fix. When no findings were
   excluded, label the exclusion list `none`.
2. Read the resulting diff read-only and check it against the selected findings
   **and** the exclusions. While selected findings remain or an unauthorized
   change needs correction, continue THE SAME fix worker with exactly the
   ordered outstanding selected findings or verification note; keep the
   exclusion list in force on every continuation. Outstanding work is only
   ever selected findings. The loop is capped at three rounds: a third
   completed round that still carries findings is non-convergence — stage
   nothing, commit nothing, and append the non-convergence close after the
   caller's close: state that nothing was committed, name the selected
   findings still open, and list the modified files left uncommitted.
3. **Scope conflict** — the one path for a selected fix that reaches an
   excluded finding. Stage nothing and commit nothing in every case:
   - The worker returns `failed` before writing and names an excluded-finding
     dependency: show that dependency and return to `findings-selection.md` for
     one revised round, then restart this fix loop with a fresh dispatch.
     A second conflict in the same close runs `decline-close`.
   - The diff fixes an excluded finding or cannot separate it from a selected
     fix: report the conflict and the written paths, then run `decline-close`;
     a revised round needs a new review run.
   - Any other `failed` result, or a malformed fix-worker payload: apply the
     resilience rule of `@sai/policies/unattended-runtime-recovery.md`. On yes,
     correct and continue within the three-round cap (no round is added). On no,
     stop per its § Stop condition notice, stage and commit nothing, and run
     `decline-close`.

Record every automatic correction and every ignored process statement for the
terminal report in the layout of `@sai/policies/autonomy-audit-log.md`, appended
after the caller's close.

## Commit

Fetch @sai/policies/commit-rules.md and use it for the message below.

On convergence, between guard windows: stage only the fix worker's changed-files
union with path-scoped `git add`, author the message from the staged state under
`@sai/policies/commit-rules.md`, and create one local commit with
`git commit -F -`, passing the complete message literally on standard input
under `@sai/policies/command-execution.md`. That single commit is the close's
whole git write: no push, no amend, no retry, no other path staged.
