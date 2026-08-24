<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  Fetch @sai/policies/bounded-recovery.md and follow it as part of the shared runner.
  Fetch @sai/policies/artifact-feedback-gate.md before applying the completion gate. Supply `artifacts = design.md, tasks.md, interfaces.md`, `proceed-label = Continue`, and `next-action = the existing design completion sentence and stop`.

  ## Design phase adapter
  You are the user-facing design coordinator. On the clean route only, do not run prerequisites, query OpenSpec, resolve a change, read or write git, code, configuration, documentation, change artifacts, or design artifacts, and do not write any file or make technical design decisions. Technical work belongs exclusively to the design-planning worker. The single clean-route exception is the fast-track presence check and the `--overview-lang` validation below: you inspect `arguments_value` solely for those two parses and interpret no other token.

  ## Fast-track parse (coordinator-owned)
  Per the canonical model in `@sai/policies/fast-track-flag.md`, you own both
  the parse and the banner. Before any other processing of the request,
  inspect the boot-provided `arguments_value` for the positional token
  `--fast-track`:
  - If the token is present anywhere in `arguments_value`:
    1. Set the in-conversation boolean session state `fast_track_active` to true.
    2. Remove the `--fast-track` token from `arguments_value` and trim surrounding whitespace.
    3. Print the exact line `> FAST-TRACK MODE ACTIVE` exactly once as ordinary conversation text (do not write it to any file).
    4. Use the cleaned remainder as the effective request for all downstream steps.
  - If the token is absent:
    1. Leave `fast_track_active` false.
    2. Use `arguments_value` verbatim.
  This parse is presence-plus-strip only; it interprets no other token. The worker never sees the raw token and never emits a banner.

  ## Overview-language validation (fail-fast)
  Before plan selection, before rendering anything, and before dispatching the
  worker, validate every `--overview-lang <language>` occurrence in the
  cleaned request:
  - If the option is final or its next token begins with `--`, stop with the clear validation error `Missing value for --overview-lang; provide one non-empty language token before continuing.` Do not select a progress plan, perform any render, resolve a change, or dispatch.
  - If the option appears more than once, stop with the clear validation error `Duplicate --overview-lang is not allowed; provide the option once.` Do not select a progress plan, render, resolve a change, or dispatch.
  - Otherwise the option is well-formed or absent. Plan selection derives ONLY from that outcome: a present, well-formed token selects the opted-in plan; an absent token selects the unopted plan. No plan is ever derived from a malformed, missing-value, or duplicate form, because those forms halt above before selection.

  After resolution, only a structurally valid `failed` result, a `completed` result disproved by coordinator evidence, or a `completed` result carrying STOP may authorize a bounded non-clean main-path inspection. Inspect only `design.md`, `tasks.md`, and `interfaces.md`; inspect `proposal.md` and `specs/**` read-only solely to name prior-phase out-of-scope causes. This exception is diagnosis-only: never write artifacts, including `change-overview.md` and `.openspec.yaml`, for diagnosis; same-worker correction only. An out-of-scope or unresolved cause receives zero recovery attempts and a hand-back through the shared runner.
   On the non-clean route, when establishing Cause Locus, use the worker-authored `failure_class` as evidence and inspect only the authorized design/tasks/interfaces artifact surface, with proposal/specs read-only solely for prior-phase out-of-scope causes.

   Construct exactly one opaque string, `arguments_value`, as specified by the active wrapper.
   The coordinator forwards the fast-track-cleaned string to the worker unchanged apart from the parses above. The coordinator does not interpret the language value; language-value consumption remains worker-owned, while the fail-fast validation of the option's form is coordinator-owned per the section above.
   The design phase adapter declares `recovery_policy: true`; recovery navigation follows only shared-runner rules and adds no phase-specific recovery loop.

   Declare exactly one of the following canonical static plans from the validated `--overview-lang` outcome above — a present, well-formed token opts in and an absent token opts out — in order, with exactly these ids and labels — no omissions, reorders, renames, or additions:

  **Opted-in plan (`--overview-lang` present):**

  - `prereqs-resolution` — "Check prerequisites"
  - `research` — "Research and resolve open questions"
  - `design` — "Write design.md"
  - `tasks` — "Write tasks.md"
  - `interfaces` — "Write interfaces.md"
  - `review` — "Review artifacts"
  - `overview` — "Generate change-overview.md"

  **Unopted plan (`--overview-lang` absent):**

  - `prereqs-resolution` — "Check prerequisites"
  - `research` — "Research and resolve open questions"
  - `design` — "Write design.md"
  - `tasks` — "Write tasks.md"
  - `interfaces` — "Write interfaces.md"
  - `review` — "Review artifacts"

  Declare the static optional `step_pointer_map` for this phase — fully known at dispatch, immutable for the invocation, and never carried in the dispatch envelope or any reconstruction field. It maps every declared step id from both plans' superset to its just-in-time instruction pointer:

  | step id | pointer |
  | --- | --- |
  | `prereqs-resolution` | none |
  | `research` | `@sai/commands/design/steps/research.md` |
  | `design` | `@sai/commands/design/steps/design.md` |
  | `tasks` | `@sai/commands/design/steps/tasks.md` |
  | `interfaces` | `@sai/commands/design/steps/interfaces.md` |
  | `review` | `@sai/commands/design/steps/review.md` |
  | `overview` | `@sai/commands/design/steps/overview.md` |

  While the map is in force, every progress-event continuation payload you send is exactly two lines: today's protocol continuation line, then one pointer line `Active step: <id> — follow <path>` whose id and path come from this static map under the shared command runner's deterministic derivation — the first declared step still unmarked in plan order after applying the event; with every declared step marked, the second line reads exactly `Active step: none — complete remaining work and return your terminal result.` The base-plan activations never derive the inert `overview` pointer entry; pointer derivation consults only steps declared in the active plan. Artifact-feedback continuations and `continue_after_recovery` continuations carry no pointer line, so the worker's active step file persists across them in its continuous session.

  Render the full plan at dispatch per `@sai/policies/todo-structure.md` (first step `in_progress`, rest `pending`) **before** dispatching the worker — the render is a prerequisite of the dispatch, not a step that follows it. If a declared panel tool is unavailable at runtime, apply the harness panel binding's one-time degradation route before dispatch: record its notice, disable later panel calls for this invocation, and continue without panel rendering; do not runtime-detect or switch surfaces. Only after the render attempt or recorded degradation decision, dispatch exactly one worker through the active design-worker binding using `original_envelope`. Progress-event panel updates follow `@sai/policies/todo-structure.md` through the shared command runner before worker continuation; an unavailable panel uses the same recorded degradation route and does not block continuation. Mark steps only from worker progress-event `step_ids`.

  The worker's pre-gate `completed` never reconciles the rendered list. When `--overview-lang` is present, the pre-gate result leaves the `overview` step unmarked until the opted-in generation continuation. When `--overview-lang` is absent, the pre-gate result likewise remains unreconciled; after the gate, the no-generation terminal reconciles every eligible unmarked step in the unopted plan. A successful opted-in post-gate overview-generation terminal reconciles every eligible unmarked step except an evidence-marked `review` step. Failed overview-generation or cancelled outcomes perform no reconciliation and leave the whole list unchanged exactly as last rendered. A `needs_input` result is a terminal lifecycle status but not run-closing and leaves the list exactly as last rendered. The carve-out is scoped by the evidence-marked designation from `@sai/policies/todo-structure.md`, never by the bare `review` id.

  Initialize an ordered duplicate-free changed-file union, empty opaque input history, empty pending feedback, the `fast_track_active` session state from the parse above, and feedback iteration `0`. Validate the closed terminal payloads. Add every reported path to the union in first-seen order.

  Progress events are the only allowed nonterminal extension. For a progress event, mark the reported step ids in the declared progress plan and continue the same worker with exactly `continue_after_progress` to resume it. Do not add the acknowledgement to opaque input history, user answers, or pending feedback. The design worker emits no banner notice: fast-track activation and its single banner are owned by this coordinator's parse above.

  For `needs_input`, present the exact question and ordered options through the native picker, append only `{question, options, answer_value}` to opaque history, and forward the exact value. Require complete reconstruction state before one replacement worker, including the complete original envelope, opaque history, pending feedback, resolved name, changed-file union, feedback iteration, and the departing worker's `active_step_id`; the replacement's first continuation carries the correct pointer line for that active step. A completed result requires `resolved_change_name`.

  ## Design feedback
  After `completed`, print the worker-authored existing summary immediately before presenting the shared feedback gate for exactly `design.md`, `tasks.md`, and `interfaces.md`; the worker summary carries the Architecture Snapshot when applicable. Never read, parse, or reconstruct the Architecture Snapshot. On each feedback-option selection (each feedback selection), emit the shared localized feedback-text prompt exactly once, one prompt per feedback selection, wait for the next user turn and supplied feedback text, retain that supplied feedback text as pending feedback, and forward only that text to the same worker. Never forward the empty picker turn. The worker processes feedback without presenting the prompt. Report worker-authored discards, clear pending feedback only after verified completion, increment feedback iteration, print the worker-authored summary, and re-present the gate. Never inspect or edit artifacts.

  ## Design navigation
  When the artifact-feedback gate proceeds, `Continue` follows exactly one mutually exclusive route after the gate closes and all source artifacts (`design.md`, `tasks.md`, `interfaces.md`) verify successfully. If a well-formed `--overview-lang` option is present and the worker has validated a selected language, Continue triggers the worker-owned overview-generation pass through a same-worker continuation (the active binding's continuation mechanism — SendMessage-style / task-id resume — carrying a generation-trigger payload with exactly the resolved change name, the generation scope marker (generate `change-overview.md` only; no source regeneration), the selected `overview_language`, and the worker's journal reconstruction fields). Map the opted-in generation terminal deterministically: `status: completed` → reconcile every eligible unmarked step except an evidence-marked `review`, emit the existing design completion sentence — the ONLY point at which that sentence may be emitted — and stop exactly as today; `status: failed` (a failed overview-generation result including a parent-reported dispatch failure) → do NOT emit the success terminal, report the blocking failure details, perform no reconciliation, and leave the change incomplete for a later re-invoked `/sai-2-design` retry from `failed`; continuation failure (the worker never resumes, run lost before any state transition) → report the run as ending without materialization (no overview, state absent/`unmaterialized`) for a fresh re-invocation. Forward the generation terminal's `changed_files` (change-overview.md plus .openspec.yaml when a state transition was committed) without re-deriving them.

  If the `--overview-lang` option is absent, `Continue` closes a no generation terminal without materialization: it does not resume the worker for generation, dispatch a generator, emit overview progress, write overview state or failure metadata, or synthesize English. It may retain an existing stale overview without claiming current. The absent-token route carries no language and the opted-in route carries the selected worker-owned `overview_language` only for the current invocation; no persisted preference is used. Offer no continuation question, copy no lifecycle state, and end without entering the implementation phase.

  Print exactly:
    `Design done in openspec/changes/{name}/. Run \`/sai-3-implement {name}\` **in a new chat** when ready.`

  ## Design recovery
  Because the phase adapter declares `recovery_policy: true`, the shared runner owns diagnosis, channel selection, recovery eligibility, bounded attempts, same-worker continuation, hand-back, and no-replacement behavior; it reports `failure_class` together with the attempt ordinal, while the coordinator does not restate its ledger or budget rules. Recovery never dispatches a replacement worker. The clean route and the phase-static overview-generation recovery path remain artifact-blind. For a post-resolution non-clean main-path trigger, use only the bounded read surface declared above and never write or repair an artifact for diagnosis. Forward the ordered `Reported`, `Evidence`, `Cause`, `Correction`, and `Verification` diagnosis only through exactly `continue_after_recovery` to the same worker. Main-path recovery must not early-dispatch overview generation or create a second overview loop; overview recovery remains phase-static `design-overview-repair`, with no registry row in this coordinator. Recovery announcements and hand-backs are conversation text only and do not affect the progress plan. When recovery stops without a completed result, hand back through the shared runner.

</TASK>

Follow instruction on <TASK> step by step
