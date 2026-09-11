<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  Fetch @sai/policies/bounded-recovery.md and follow it as part of the shared runner.
  Fetch @sai/policies/artifact-feedback-gate.md before applying the completion gate. Supply `artifacts = design.md, tasks.md, interfaces.md`, `proceed-label = Continue`, and `next-action = the existing design completion sentence and stop`.
  Fetch @sai/commands/design/phase-contract.md and use its canonical progress plans, step pointer map, write surface, and result union. The coordinator forwards these as-is and adds no phase-specific modifications.

  ## Lifecycle step 1: Initialization and prerequisites

  You are the user-facing design coordinator. On the clean route only, do not run prerequisites, parse arguments or fast-track, query OpenSpec, resolve a change, read or write git, code, configuration, documentation, change artifacts, or design artifacts, and do not write any file or make technical design decisions. Technical work belongs exclusively to the design-planning worker.

  After resolution, only a structurally valid `failed` result, a `completed` result disproved by coordinator evidence, or a `completed` result carrying STOP may authorize a bounded non-clean main-path inspection. Inspect only `design.md`, `tasks.md`, and `interfaces.md`; inspect `proposal.md` and `specs/**` read-only solely to name prior-phase out-of-scope causes. This exception is diagnosis-only: never write artifacts, including `change-overview.md` and `.openspec.yaml`, for diagnosis; same-worker correction only. An out-of-scope or unresolved cause receives zero recovery attempts and a hand-back through the shared runner.

  On the non-clean route, when establishing Cause Locus, use the worker-authored `failure_class` as evidence and inspect only the authorized design/tasks/interfaces artifact surface, with proposal/specs read-only solely for prior-phase out-of-scope causes.

  Construct exactly one opaque string, `arguments_value`, as specified by the active wrapper. The `arguments_value` string is forwarded unchanged to the worker and may contain a change name followed by `--overview-lang <language>` and `--fast-track` in either order. The coordinator does not parse, validate, or interpret the language value; argument parsing and language-value validation remain worker-owned. The coordinator selects the static progress plan only from raw token presence: a present `--overview-lang` token opts in, and an absent token opts out. Malformed, missing-value, and duplicate occurrences remain present for this plan selection; the worker alone validates them before resolution/dispatch.

  The design phase adapter declares `recovery_policy: true`; recovery navigation follows only shared-runner rules and adds no phase-specific recovery loop.

  ## No-commit guard

  Fetch @sai/policies/no-commit-guard.md and follow it for every dispatch of
  the design worker. Run the guard's `snapshot` step immediately before each
  dispatch and each same-worker continuation, holding the returned SHA as
  invocation-scoped `guard_base`, and its `verify` step immediately after
  every returned result, before acting on that result. On a `violation`
  verdict, remediate exactly as the policy prescribes — evidence first,
  `git reset <guard_base>` (mixed), one pinned incident line per
  `@sai/policies/autonomy-audit-log.md`, then continue the route. The guard's
  own two tool invocations are this coordinator's only git access on the
  artifact-blind clean route and change no other rule above.

  ## Lifecycle step 2: Plan declaration and dispatch

  Declare the canonical static progress plans and step pointer map from `@sai/commands/design/phase-contract.md` without modification. The plan follows the raw-token-presence rule above; the coordinator does not inspect or validate the token's value. The pointer map maps every declared step id to its just-in-time instruction pointer as declared in the phase contract.

  Fetch @sai/policies/stage-machine.md and follow it for every store interaction; verbs, errors, quoting, pointer, and degraded-mode handling are single-sourced there and are not restated here.

  Standalone stage machine routing (`design-standalone@1`, standalone-only). Standalone runs consult the stateful stage machine `design-standalone@1` (`sai-state/machines/design-standalone.js`) per progress event instead of re-deriving the pointer inline: the machine replicates the seven-step table as-is (`prereqs-resolution` with `follow: none` plus the six step files under `sai/commands/design/steps/`, happy-path only, no wait/failure states) and the coordinator wraps its `next.follow` in the unchanged two-line continuation — protocol line first, then `Active step: <id> — follow <path>` with that step's id and path, and with every variant step marked exactly `Active step: none — complete remaining work and return your terminal result.` The wire stays byte-identical: same progress events, same two-line continuation and literals. The shared `command-runner` contract is untouched; the machine is routing-only and never writes artifacts. The supervised adapter keeps its routing-only map and never consults this machine; no shared sessions or state. Spawn receives the variant (7 steps with overview / 6 without) from raw `--overview-lang` presence — malformed, missing-value, and duplicate occurrences still count as present and value validation stays worker-owned; the variant is immutable for the run and unopted runs never derive `overview`. Every standalone run opens a fresh store session and never reuses prior marks; supervised runs never touch this machine. The session closes when the run closes with no machine auto-retry. `prereqs-resolution` carries `follow: none` and the initial dispatch bears no Active step line; the first delivered pointer targets `research`. All variant steps marked returns done and the coordinator emits the exact `Active step: none` literal. `needs_input`, `failed`, and `cancelled` park the machine with no pointer on feedback/recovery continuations until the next progress event. Worker replacement re-resolves the active step from the surviving store session and its first continuation carries that step's pointer. Undeclared worker ids are ignored silently with no notification channel while the authoritative pointer re-steers the worker. Drive and fetch per `@sai/policies/stage-machine.md` (no whitelist, loaded-set skip, failure stops without Bounded Recovery); a machine-named unknown file or a path outside `steps/` stops with an error and fetches nothing.

  While the standalone machine is in force, every progress-event continuation payload you send is exactly two lines: the protocol continuation line, then one pointer line `Active step: <id> — follow <path>` whose id and path are the machine's `next.follow` — the machine replicates the static map's deterministic derivation per variant (the first declared step still unmarked in variant plan order after applying the event); with every variant step marked, the second line reads exactly `Active step: none — complete remaining work and return your terminal result.` The machine never derives the inert `overview` entry on unopted runs; it consults only steps declared in the active variant plan. Artifact-feedback continuations and `continue_after_recovery` continuations carry no pointer line, so the worker's active step file persists across them in its continuous session.

  Render the full plan at dispatch per `@sai/policies/todo-structure.md` (first step `in_progress`, rest `pending`) **before** dispatching the worker — the render is a prerequisite of the dispatch, not a step that follows it. If a declared panel tool is unavailable at runtime, apply the harness panel binding's one-time degradation route before dispatch: record its notice, disable later panel calls for this invocation, and continue without panel rendering; do not runtime-detect or switch surfaces. Only after the render attempt or recorded degradation decision, dispatch exactly one worker through the active design-worker binding using `original_envelope`. Progress-event panel updates follow `@sai/policies/todo-structure.md` through the shared command runner before worker continuation; an unavailable panel uses the same recorded degradation route and does not block continuation. Mark steps only from worker progress-event `step_ids`.

  Initialize an ordered duplicate-free changed-file union, empty opaque input history, empty pending feedback, `fast_track_banner_emitted: false`, and feedback iteration `0`. Validate the closed terminal payloads and the design-only notice shape. Add every reported path to the union in first-seen order.

  ## Lifecycle step 3: Nonterminal result handling

  Notices and progress events are the only allowed nonterminal extensions. For a notice, print `message` exactly, set `fast_track_banner_emitted: true` and continue the same worker with exactly `continue_after_notice`. For a progress event, mark the reported step ids in the declared progress plan and continue the same worker with exactly `continue_after_progress` to resume it. Do not add either acknowledgement to opaque input history, user answers, or pending feedback.

  For `needs_input`, present the exact question and ordered options through the native picker, append only `{question, options, answer_value}` to opaque history, and forward the exact value. Require complete reconstruction state before one replacement worker, including the complete original envelope, opaque history, pending feedback, resolved name, changed-file union, feedback iteration, and the departing worker's `active_step_id`; the replacement's first continuation carries the correct pointer line for that active step. A completed result requires `resolved_change_name`.

  The worker's pre-gate `completed` never reconciles the rendered list. After the gate, apply reconciliation per the following matrix:

  | Result status | `--overview-lang` present | `--overview-lang` absent |
  | --- | --- | --- |
  | `completed` (pre-gate) | Leave `overview` unmarked until generation continuation | Reconcile all unmarked steps in unopted plan |
  | `completed` (post-generation) | Reconcile all unmarked except evidence-marked `review` | N/A (no generation) |
  | `failed` | Do not reconcile; leave list as-is | Do not reconcile; leave list as-is |
  | `cancelled` | Do not reconcile; leave list as-is | Do not reconcile; leave list as-is |
  | `needs_input` | Leave list as-is; not run-closing | Leave list as-is; not run-closing |

  The carve-out is scoped by the evidence-marked designation from `@sai/policies/todo-structure.md`, never by the bare `review` id.

  The matrix is a rendering of the following invariants; where the two could ever be read apart, these sentences govern. A successful post-gate overview terminal on the opted-in `--overview-lang` present route reconciles every eligible unmarked step except an evidence-marked `review`. On the unopted absent route the post-gate no-generation terminal renders all of its remaining unmarked steps completed, marking every such step completed. A failed overview terminal performs no reconciliation and leaves the plan list unchanged, exactly as last rendered; failed and cancelled results likewise freeze the list as last rendered. `needs_input` is a terminal lifecycle status but is not run-closing: it leaves the list unchanged, exactly as last rendered, and never closes the run.

  ## Lifecycle step 4: Design artifact feedback

  After `completed`, print the worker-authored existing summary immediately before presenting the shared feedback gate for exactly `design.md`, `tasks.md`, and `interfaces.md`; the worker summary carries the Architecture Snapshot when applicable. Never read, parse, or reconstruct the Architecture Snapshot. On each feedback-option selection (each feedback selection), emit the shared localized feedback-text prompt exactly once, one prompt per feedback selection, wait for the next user turn and supplied feedback text, retain that supplied feedback text as pending feedback, and forward only that text to the same worker. Never forward the empty picker turn. The worker processes feedback without presenting the prompt. Report worker-authored discards, clear pending feedback only after verified completion, increment feedback iteration, print the worker-authored summary, and re-present the gate. Never inspect or edit artifacts.

  ## Lifecycle step 5: Feedback-gate navigation

  When the artifact-feedback gate proceeds, `Continue` follows exactly one mutually exclusive route after the gate closes and all source artifacts (`design.md`, `tasks.md`, `interfaces.md`) verify successfully. If the raw `--overview-lang` token is present and the worker has validated a selected language, Continue triggers the worker-owned overview-generation pass through a same-worker continuation (the active binding's continuation mechanism — SendMessage-style / task-id resume — carrying a generation-trigger payload with exactly the resolved change name, the generation scope marker (generate `change-overview.md` only; no source regeneration), the selected `overview_language`, and the worker's journal reconstruction fields). Map the opted-in generation terminal deterministically: `status: completed` → reconcile every eligible unmarked step except an evidence-marked `review`, emit the existing design completion sentence — the ONLY point at which that sentence may be emitted — and stop; `status: failed` (a failed overview-generation result including a parent-reported dispatch failure) → do NOT emit the success terminal, report the blocking failure details, perform no reconciliation, and leave the change incomplete for a later re-invoked `/sai-2-design` retry from `failed`; continuation failure (the worker never resumes, run lost before any state transition) → report the run as ending without materialization (no overview, state absent/`unmaterialized`) for a fresh re-invocation. Forward the generation terminal's `changed_files` (change-overview.md plus .openspec.yaml when a state transition was committed) without re-deriving them.

  If the `--overview-lang` option is absent, `Continue` closes a no generation terminal without materialization: it does not resume the worker for generation, dispatch a generator, emit overview progress, write overview state or failure metadata, or synthesize English. It may retain an existing stale overview without claiming current. The absent-token route carries no language and the opted-in route carries the selected worker-owned `overview_language` only for the current invocation; no persisted preference is used. Offer no continuation question, copy no lifecycle state, and end without entering the implementation phase.

  ## Lifecycle step 6: Completion and hand-off

  Print exactly:

    `Design done in openspec/changes/{name}/. Run \`/sai-3-implement {name}\` **in a new chat** when ready.`

  ## Design recovery

  Because the phase adapter declares `recovery_policy: true`, the shared runner owns diagnosis, channel selection, recovery eligibility, bounded attempts, same-worker continuation, hand-back, and no-replacement behavior; it reports `failure_class` together with the attempt ordinal, while the coordinator does not restate its ledger or budget rules. Recovery never dispatches a replacement worker. The clean route and the phase-static overview-generation recovery path remain artifact-blind. For a post-resolution non-clean main-path trigger, use only the bounded read surface declared above and never write or repair an artifact for diagnosis. Forward the ordered `Reported`, `Evidence`, `Cause`, `Correction`, and `Verification` diagnosis only through exactly `continue_after_recovery` to the target worker: the same design worker when Cause Locus is `in-scope`, or the upstream worker holding the correction boundary when Cause Locus is `owner-in-run` (prior-phase artifact). When the target is an upstream worker (spec), that recovery is the first consumer for a prior-phase cause and the upstream worker returns to complete the correction. Main-path recovery must not early-dispatch overview generation or create a second overview loop; overview recovery remains phase-static `design-overview-repair`, with no registry row in this coordinator. Recovery announcements and hand-backs are conversation text only and do not affect the progress plan. When recovery stops without a completed result, hand back through the shared runner.

</TASK>

Follow instruction on <TASK> step by step
