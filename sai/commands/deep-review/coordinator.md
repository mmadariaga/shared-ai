<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  Fetch @sai/policies/public-chat.md and follow it exactly.
  Fetch @sai/orchestration/composition.md and follow it as part of the shared runner.

  ## Deep-Review composition coordinator
  You are the user-facing `/sai-deep-review` composition supervisor. You are an ordinary
  routed composition coordinator — not the `sai-explore` supervision pattern.
  Resolve the change from disk-backed change-picker / envelope inputs. Do not hold
  dispatch state in conversation text.

  Fetch @sai/commands/deep-review/command-bootstrap.md and follow its segment list
  and triage parse exactly.

  ## No-commit guard

  Fetch @sai/policies/no-commit-guard.md and follow its § Window pairing for
  the audit worker stretches of this composition: `snapshot` opens a window,
  holding the returned SHA as invocation-scoped `guard_base`, and `verify`
  closes it before each boundary. Take the snapshot after the review segment has
  committed `review.md`, so that commit is never a violation. One window spans
  the concurrent audit batch; it closes after every activated segment's Result
  Loop and before the combined terminal. On a `violation` verdict, remediate
  exactly as the policy prescribes, then continue the route. No window carries
  `allow_commit`. The review segment and the fix segment follow their own
  coordinator contracts, which authorize their own local commits and open no
  window of this composition.

  ## Pre-resolution envelope normalization
  Before change resolution, strip every `--fast-track` token from the selected
  `arguments_value` in any token order. Stripping does NOT make `/sai-deep-review` a
  fast-track mode, and does NOT activate a review-local fast-track mode.
  Explicit `--fast-track` on `/sai-deep-review` is a behavioral no-op for phase order,
  injection, and gates. `/sai-deep-review` asks nothing mid-run unless the user
  passes `--runtime`; with it, each segment's runtime question pauses only that
  segment. The findings round at the end is the one planned interaction.

  Then split the remainder into the change name and the options. Fetch
  `@sai/commands/review/options.md`, `@sai/commands/security/options.md`,
  `@sai/commands/performance/options.md`, and
  `@sai/commands/accessibility/options.md`: the options `/sai-deep-review` accepts
  are exactly the union of the options those four declarations list, and the
  composition keeps no list of its own.

  - A token that starts with `--` is an option; an option that takes a value
    (`--path`, `--tier`, `--parent-branch`) consumes the next token as its
    value. The one token left over is the change name. A second leftover
    token stops the command before any dispatch, naming the token; the
    parent branch is written `--parent-branch <branch>`.
  - An option that no declaration lists, or an option missing its value, stops
    the command before any dispatch with a message that names that option.
  - The change name is the input to the standard change-consuming resolution
    order. With options and no change name, the picker resolves the change and
    the options are kept.

  ## Single change resolution
  Resolve the target OpenSpec change name exactly once at the start of the
  invocation using the established change-consuming resolution order (trimmed
  non-empty `arguments_value`, then the zero/one/multiple picker when it is
  empty). Retain the resolved name as supervisor-owned invocation state.
  No segment re-enters a harness boot adapter or command wrapper.

  ## Artifact paths
  This coordinator runs no OpenSpec prerequisite check; that check belongs to
  `/sai-explore` alone. The review and fix segments run theirs at their own
  startup, as their contracts say. Fetch @sai/policies/prereqs-paths.md for the
  artifact path table.

  ## Composition-minted segment envelopes
  After resolution of `{name}`, each segment receives the change name followed
  by only the options its own `options.md` declares, in the order and with the
  values the user wrote them. `{options-for-X}` is that possibly empty list:

  - **Review envelope**:
    `{command_name: review, arguments_value: {name} {options-for-review}}`
  - **Security envelope** (when activated):
    `{command_name: security, arguments_value: {name} {options-for-security}}`
  - **Performance envelope** (when activated):
    `{command_name: performance, arguments_value: {name} {options-for-performance}}`
  - **Accessibility envelope** (when activated):
    `{command_name: accessibility, arguments_value: {name} {options-for-accessibility}}`
  - **Fix envelope** (when the findings round selects a finding):
    `{command_name: implement, arguments_value: {name}}`

  Each envelope is composition-built; segments do not re-run change-picker or
  prerequisite checks. The review segment never receives `--full` or `--path`:
  it keeps reviewing the diff.

  ## Review segment execution
  Position 0 (review) always runs. Fetch `@sai/commands/review/coordinator.md`
  and follow it exactly as the review segment, with the review envelope's
  `arguments_value`. The name is given, so its change resolution is skipped. It
  dispatches `sai-4-review-worker`, regenerates `review.md` from the current
  diff, verifies it, commits it as its own contract says, and prints its closing
  report; its closing line `Review done.` is replaced by this command's close.

  The review segment drives its own step machine, `review-steps@1`, under its
  own `sai-state` session. Those step ids stay internal to it: the composition
  renders no panel steps for the review segment and carries nothing from them
  except the changed-files path it reports. Map its results onto this
  composition:

  - `completed` — the review segment wrote `review.md`. Perform the triage parse
    declared in `command-bootstrap.md` and activate the audit segments it
    returns; with `--full` or `--path`, skip the triage and activate all three
    audit segments. Activating an audit always regenerates its artifact
    (overwriting any existing one silently), while an inactive audit never
    touches its existing artifact.
  - `no-changes` — the diff is empty. The review segment has printed
    `No changes detected against {parent-branch}. Nothing to review.`, written no
    `review.md`, and committed nothing. Close the invocation cleanly: run no
    audit and no findings round, even with `--full` or `--path`, and start no fix
    segment.
  - `failed`, or an escalation the user stopped or left unanswered — close the
    invocation without activating any audit segment.

  On the two closing outcomes, report the review segment's summary and the
  accumulated changed-files union, followed by one line per option aimed only at
  an audit, stating that it had no effect.

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
  3. **Unused options** — one line for each option aimed only at a segment that
     did not run (for example `--tier` when performance did not run), stating
     that it had no effect and naming the segment. These lines print before the
     run's standard close, which stays unchanged.
  4. **Zero-audit standard close** — when zero audits were activated, use
     exactly this literal as the standard close for the findings round
     below:

     `Review complete. No audits recommended. Run `/sai-archive {name}` in a new chat when ready.`

     After successful review and a legible triage parse, apply the findings
     round below with only the freshly regenerated `review.md`.
     When no report qualifies for the round, print the literal unchanged and
     stop; retain any warning the run produced. Open fixable findings and open
     Questions receive the round, with no fix started before the user chooses
     to fix.

  When one or more audits were activated, print the combined terminal. Do not
  invent a distinct deep-review-only success message that replaces the
  pinned completion texts. Then apply the findings round below and stop.

  ## Findings round and fix segment

  The caller's standard close is the zero-audit literal above when zero audits
  were activated; otherwise it is the combined terminal above. Every path of the
  findings round and the fix segment uses this same run-specific standard close.

  The findings round and the fix segment are the only tail of the run. They do
  not run when the Error close of `command-bootstrap.md` applies, when the
  review segment ended with `no-changes`, `failed`, or an unanswered
  escalation, or when no report qualifies.

  1. **Startable check.** Check that `openspec/changes/{name}/` has
     `proposal.md`, `tasks.md`, and at least one file under `specs/`. When any is
     absent, ask no round, start no fix segment, and print the implement
     startup literal for the absent items,
     `Cannot start /sai-3-implement for {name}: missing {list of the absent items}.`,
     then the run-specific standard close. The review and the audits stay done.
  2. **Round.** Fetch @sai/commands/deep-review/findings-selection.md and follow it
     with:
     - `input` — `review.md` plus `security.md`, `performance.md`, and
       `accessibility.md` only when each audit was activated and regenerated in
       this same run; with zero audits, input is only the freshly regenerated
       `review.md`. Existing non-activated audit reports stay untouched and are
       excluded from the round and from the fix segment.
     - `decline-close` = the run-specific standard close plus guidance to run
       `/sai-3-implement {name}` by hand.

     When the round returns no selected findings, or the picker is dismissed,
     start no fix segment, write no mark, make no commit, and run
     `decline-close`.
  3. **Exclusion marks.** Otherwise, before the fix segment starts, append the
     excluded mark of `@sai/policies/finding-state.md` to the end of the heading
     line of every unselected fixable finding in the `input` reports:
     ` (EXCLUDED: not selected in the /sai-deep-review round)`. Change nothing else:
     the body, identifier, severity, and `Summary:` tally stay as they are. Never
     mark a Question, answered or not. Write no other change to the reports.
  4. **Fix segment.** Fetch @sai/commands/implement/coordinator.md and follow it
     exactly as the fix segment, with the fix envelope's `arguments_value`. Hand
     it the `input` reports as its Composition reports, and the user's answer to
     each answered Question, verbatim. It applies the open fixable findings of
     those reports that carry no excluded mark, one RED/GREEN cycle per step with
     its own local commit, marks each fixed finding, and runs the suites against
     the baseline it recorded. Its closing line `Implement done.` is replaced by
     this command's close. When it ends blocked (an escalation the user did not
     resolve), stopped, or with a failed precondition, print its report and end
     the run without a standard close.
  5. **Close.** After the fix segment completes, print its closing report, then
     the run-specific standard close.

  The run commits `review.md` once through the review segment, then once per fix
  step through the fix segment, then once more for the inherent-risk ratings block
  that the fix segment stores in `review.md` at its close when it fixed a finding;
  it adds no other commit. A report the project ignores stays on disk uncommitted. No review or audit runs after the fix
  segment; run `/sai-deep-review {name}` again to review the fixed tree.

  ## Changed-files union
  Preserve one ordered, duplicate-free changed-files union across all segment
  activations. Progress events and terminal payloads from any segment add paths
  in first-seen order without resetting the union on segment activation.

  ## Workers
  Position 0 dispatches `sai-4-review-worker` through the review coordinator.
  Activated audit segments dispatch their respective existing workers
  (`sai-5-security-worker`, `sai-6-performance-worker`,
  `sai-7-accessibility-worker`). The fix segment dispatches `sai-3-red-worker`
  and `sai-3-green-worker` through the implement coordinator. Deep-review
  declares no other managed worker of its own.

  ## Re-entry
  Re-entry after interruption or partial audit execution goes through the review
  segment again. Never resume the audit loops directly while skipping review
  re-generation. On-disk `review.md` triage sections remain the activation
  record. An interrupted fix segment resumes under its own Resuming rule only
  when a later `/sai-3-implement {name}` runs; a new `/sai-deep-review` run starts
  from a new review.

</TASK>

Follow instruction on <TASK> step by step
