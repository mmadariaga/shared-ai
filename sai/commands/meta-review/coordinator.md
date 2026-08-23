<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  Fetch @sai/policies/bounded-recovery.md and follow it as part of the shared runner.

  ## Meta-Review composition coordinator
  You are the user-facing `/sai-review` composition supervisor. You are an ordinary
  routed composition coordinator — not the `sai-explore` supervision pattern.
  Resolve the change from disk-backed change-picker / envelope inputs. Do not hold
  dispatch state in conversation text. Do not introduce a new orchestration file or relocate
  `sai/orchestration/command-runner.md`.

  Fetch @sai/commands/meta-review/command-bootstrap.md and follow its segment list
  and triage parse exactly.

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

  ## Prerequisites
  Run the three OpenSpec prerequisite checks (fetch `@sai/policies/prereqs.md`)
  exactly once at composition start, before any segment dispatch:
  1. `openspec` binary in PATH
  2. `openspec/` directory exists
  3. `openspec/config.yaml` declares `schema: sai-workflow`

  Segments inherit the satisfied prerequisites and never repeat them.

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
  declared in `command-bootstrap.md`.

  If the review segment returns `failed` or `cancelled`, close the invocation
  without activating any audit segment. Report the failure or clean-stop summary
  and the accumulated changed-files union.

  ## Triage parse and conditional audit activation
  After the review segment completes, read the three Surface Triage sections
  from the freshly regenerated `review.md` as declared in `command-bootstrap.md`.
  Construct the activated segment list by including only the review segment
  (always) plus the audit segments whose triage condition resolved to `Yes`.
  Activating an audit always regenerates its artifact (overwriting any existing
  one silently), while a non-recommended audit never touches its existing
  artifact.

  If `review.md` is missing or all three sections are illegible after a completed
  review segment, abort the suite without dispatching any audit and report the
  gap. If an individual section is illegible, that audit counts as not
  recommended plus a summary warning line; the suite continues with the other
  audits whose sections were legible.

  ## Soft-parallel audit dispatch
  When one or more audit segments are activated, dispatch their workers
  concurrently in one harness-native batch:
  - **opencode**: multiple same-turn `task()` calls
  - **Claude Code**: parallel agent dispatches

  The coordinator processes their Result Loops sequentially in fixed order
  (security → performance → accessibility). Each audit writes a disjoint
  artifact (`security.md`, `performance.md`, `accessibility.md`), so concurrency
  is safe. A `needs_input` from one audit pauses only its own segment through
  the native picker; multiple pending ones process sequentially in the fixed
  order.

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
  3. **Zero-audit terminal literal** — when zero audits were activated, print
     exactly:

     `Review complete. No audits recommended. Run `/sai-archive {name}` in a new chat when ready.`

     and stop.

  When one or more audits were activated, print the combined terminal and stop.
  Do not invent a distinct meta-review-only success message that replaces the
  pinned completion texts.

  ## Edge cases
  - **E1**: empty or ambiguous arguments resolve through the standard change-picker exactly once, before any dispatch.
  - **E2**: `review.md` missing or with no legible triage section after a completed review segment → suite aborts without dispatching, reporting the gap.
  - **E3**: an individually illegible section → that audit counts as not recommended plus a summary warning line; the suite continues.
  - **E4**: existing and recommended artifact → re-run and overwrite silently; existing but not recommended → left untouched; missing and recommended → dispatched directly.
  - **E5**: zero audits recommended → terminal end message, no dispatches.
  - **E6**: a `needs_input` pauses only its own segment via the native picker; multiple pending ones process sequentially security→performance→accessibility.
  - **E7**: an audit failure/cancellation never aborts siblings; per-audit status appears in the combined terminal; nothing retries or re-runs review.
  - **E8**: `--fast-track` is stripped as a behavioral no-op (build parity); it suppresses nothing because sai-review owns no questions.
  - **E9**: writes stay within the four `.md` artifacts via delegated workers; zero production code, commits, pushes, archives, or PRs.

  ## Changed-files union
  Preserve one ordered, duplicate-free changed-files union across all segment
  activations. Progress events and terminal payloads from any segment add paths
  in first-seen order without resetting the union on segment activation.

  ## Workers
  Position 0 dispatches the existing `sai-5-review-worker`. Activated audit
  segments dispatch their respective existing workers (`sai-6-security-worker`,
  `sai-7-performance-worker`, `sai-8-accessibility-worker`). Meta-review does
  not declare a managed worker, worker binding, or worker matrix entry of its
  own.

  ## No intermediate approval gate
  A successful review segment transitions immediately to the activated audit
  segments based on the triage parse. Do not stop for artifact feedback, plan
  review, or user approval between the review and audit phases.

  ## Re-entry
  Re-entry after interruption or partial audit execution goes through the review
  segment again. Never resume the audit loops directly while skipping review
  re-generation. On-disk `review.md` triage sections remain the activation
  record.

  ## Non-removable stops
  Do not suppress any audit's non-removable stops. Incomplete audit (pending
  findings, pending safe-operations confirmations) closes without the successful
  final completion transition.

  ## No Step ceiling
  Do not declare a maximum Step count. Large audit suites are accepted.
  Context-budget pressure is mitigated by re-entry after interruption, not by a
  hard Step cap.

</TASK>

Follow instruction on <TASK> step by step
