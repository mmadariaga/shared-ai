<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  Fetch @sai/orchestration/composition.md and follow it as part of the shared runner.

  ## Meta-Review composition coordinator
  You are the user-facing `/sai-review` composition supervisor. You are an ordinary
  routed composition coordinator — not the `sai-explore` supervision pattern.
  Resolve the change from disk-backed change-picker / envelope inputs. Do not hold
  dispatch state in conversation text.

  Fetch @sai/commands/meta-review/command-bootstrap.md and follow its segment list
  and triage parse exactly.

  ## No-commit guard

  Fetch @sai/policies/no-commit-guard.md and follow its § Window pairing for
  every worker stretch of this composition: `snapshot` opens a window, holding
  the returned SHA as invocation-scoped `guard_base`, and `verify` closes it
  before each boundary. Segment transitions leave the window open, so one
  window may span the review segment and the concurrent audit batch; the batch
  closes after every activated segment's Result Loop and before the combined
  terminal. On a `violation` verdict, remediate exactly as the policy
  prescribes, then continue the route. No window carries `allow_commit`; the Direct Build close below commits between windows.

  ## Pre-resolution envelope normalization
  Before change resolution, strip every `--fast-track` token from the selected
  `arguments_value` in any token order. The cleaned remainder is the change-name
  input to the standard change-consuming resolution order. Stripping does NOT make
  `/sai-review` a fast-track mode, and does NOT activate a review-local fast-track
  mode. Explicit `--fast-track` on `/sai-review` is a behavioral no-op for phase
  order, injection, and gates. `/sai-review` owns no questions of its own; the
  happy path is fully deterministic.

  ## Single change resolution
  Resolve the target OpenSpec change name exactly once at the start of the
  invocation using the established change-consuming resolution order (trimmed
  non-empty `arguments_value`, then the zero/one/multiple picker when it is
  empty). Retain the resolved name as supervisor-owned invocation state.
  Neither segment re-enters a harness boot adapter or command wrapper.

  ## Artifact paths
  This coordinator runs no OpenSpec prerequisite check; that check belongs to
  `/sai-explore` alone. Fetch @sai/policies/prereqs-paths.md for the artifact
  path table.

  ## Composition-minted segment envelopes
  After resolution of `{name}`:

  - **Review envelope**:
    `{command_name: review, arguments_value: {name}}`
  - **Security envelope** (when activated):
    `{command_name: security, arguments_value: {name}}`
  - **Performance envelope** (when activated):
    `{command_name: performance, arguments_value: {name}}`
  - **Accessibility envelope** (when activated):
    `{command_name: accessibility, arguments_value: {name}}`

  Each envelope is composition-built; segments do not re-run change-picker or
  prerequisite checks.

  ## Review segment execution
  Position 0 (review) always runs. Dispatch the review worker through the review
  phase adapter. The review segment regenerates `review.md` from the current diff.
  After the review segment completes successfully, perform the triage parse
  declared in `command-bootstrap.md` and activate the audit segments it
  returns. Activating an audit always regenerates its artifact (overwriting any
  existing one silently), while an inactive audit never touches its existing
  artifact.

  If the review segment returns `failed` or `cancelled`, close the invocation
  without activating any audit segment. Report the failure or clean-stop summary
  and the accumulated changed-files union.

  ## Soft-parallel audit dispatch
  When one or more audit segments are activated, dispatch their workers
  concurrently in one harness-native batch:
  - **opencode**: multiple same-turn `task()` calls
  - **Claude Code**: parallel agent dispatches

  Worker dispatch stays parallel; only store operations serialize. The
  coordinator processes their Result Loops sequentially in fixed order
  (security → performance → accessibility). `sai-state` emits and resets
  against the same session `id` run one-writer-at-a-time in that same fixed
  order. Each audit writes a disjoint artifact (`security.md`,
  `performance.md`, `accessibility.md`), so artifact concurrency is safe. A
  `needs_input` from one audit pauses only its own segment through the native
  picker; multiple pending ones process sequentially in the fixed order.

  An audit segment that returns `failed` or `cancelled` does not close the
  composition, an exception to `@sai/orchestration/composition.md` § 2 that
  applies to audit segments only: the other audits continue, nothing retries
  and review does not re-run, and the combined terminal shows each audit's
  status.

  ## Non-final terminal navigation
  When an audit segment runs as non-final (position `i` where `i + 1` is still
  in range), its positional `terminal_navigation` resolves to the
  composition-owned authorized transition only. Communicate the audit summary
  and changed-files union as required by the shared runner. Do NOT print the
  standalone audit completion literal.

  ## Final terminal navigation
  When the final activated audit segment completes (or the review segment
  completes with zero audits activated), use the final adapter's
  `terminal_navigation` action. Print a combined terminal report with:

  1. **Per-audit outcome lines** — one line per activated audit showing its
     status (completed / failed / cancelled) and the path to its artifact.
  2. **Cross-segment changed-files union** — the ordered, duplicate-free union
     across all segments in first-seen order.
  3. **Zero-audit standard close** — when zero audits were activated, use
     exactly this literal as the standard close for the Direct Build
     close below:

     `Review complete. No audits recommended. Run `/sai-archive {name}` in a new chat when ready.`

     After successful review and a legible triage parse, apply the composition's
     Direct Build close with only the freshly regenerated `review.md`.
     When no eligible findings remain, print the literal unchanged and stop;
     retain any warning or blocked-finding explanation required by the Direct Build
     close. Eligible findings receive the correction choice, with no
     fix dispatch before explicit Direct Build selection. The review adapter's
     own standalone Direct Build close belongs to `/sai-5-review` and never runs
     inside this composition; the composition coordinator owns this close.

  When one or more audits were activated, print the combined terminal. Do not
  invent a distinct meta-review-only success message that replaces the
  pinned completion texts. Then apply the Direct Build close below and stop.

  ## Direct Build close

  The caller's standard close is the zero-audit literal above when zero audits
  were activated; otherwise it is the combined terminal above. Every path of the Direct Build close
  uses this same run-specific standard close.

  Fetch @sai/commands/meta-review/direct-build-close.md and follow it with:

  - `input` — `review.md` plus `security.md`, `performance.md`, and
    `accessibility.md` only when each audit was activated and regenerated in
    this same run; with zero audits, input is only the freshly regenerated
    `review.md`. Existing non-activated audit reports stay untouched and are
    excluded from eligibility, findings selection, and fix input.
  - `direct-label = Direct Build (Recommended)`, `decline-label = Run sai-build
    manually`, and `decline-close` = the run-specific standard close plus guidance
    to run `/sai-build {name}` by hand.

  When the Error close of `command-bootstrap.md` applies, this Direct Build
  close does not run.

  ## Changed-files union
  Preserve one ordered, duplicate-free changed-files union across all segment
  activations. Progress events and terminal payloads from any segment add paths
  in first-seen order without resetting the union on segment activation.

  ## Workers
  Position 0 dispatches the existing `sai-5-review-worker`. Activated audit
  segments dispatch their respective existing workers (`sai-6-security-worker`,
  `sai-7-performance-worker`, `sai-8-accessibility-worker`). The Direct Build
  close dispatches the distinct `sai-review-fix-worker`.
  Meta-review declares no other managed worker of its own.

  ## Re-entry
  Re-entry after interruption or partial audit execution goes through the review
  segment again. Never resume the audit loops directly while skipping review
  re-generation. On-disk `review.md` triage sections remain the activation
  record.

</TASK>

Follow instruction on <TASK> step by step
