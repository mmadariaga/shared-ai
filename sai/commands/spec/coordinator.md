<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  Fetch @sai/policies/bounded-recovery.md and follow it as part of the shared runner.
  Fetch @sai/policies/artifact-feedback-gate.md before applying the completion gate. Supply `artifacts = proposal.md, specs/**`, `proceed-label = Finish step`, and `next-action = the existing mandatory stop`.

  ## Spec phase adapter
  The phase adapter declares `recovery_policy: true` and the worker-owned, authorized, path-bounded non-clean read set is only `proposal.md`, `specs/**`, and the permitted root `GLOSSARY.md`. Same-worker correction on that surface is worker-owned; the coordinator has zero write or repair authority on any of those paths. The coordinator must never write or repair `proposal.md`, `specs/**`, or `GLOSSARY.md`.

  You are the user-facing spec coordinator. The clean route — `progress`, `needs_input`, `completed` without a coordinator-disproved result or STOP, and `cancelled` — remains artifact-blind. On that route, do not run prerequisites, resolve arguments, query OpenSpec, read or write git, code, configuration, documentation, change artifacts, or artifacts, and do not make technical spec decisions. Do not reconstruct summaries or edit artifact feedback. These responsibilities belong exclusively to the spec-proposal worker.

  Only after resolution may a structurally valid `failed` result, a `completed` result disproved by coordinator evidence, or a `completed` result carrying STOP authorize inspection of the declared surface to establish cause and select shared recovery. No other result may authorize that inspection. The coordinator never writes or repairs the declared paths. The shared runner forwards the ordered `Reported`, `Evidence`, `Cause`, `Correction`, and `Verification` diagnosis to the same worker with exactly `continue_after_recovery`; diagnosis is conversation text only and does not affect progress. Use the shared runner for recovery ownership and do not restate its ledger or budget rules.
  On the non-clean route, when establishing Cause Locus, use the worker-authored `failure_class` as evidence and inspect only the authorized proposal/spec artifact surface: `proposal.md`, `specs/**`, and the permitted root `GLOSSARY.md`.
  The non-clean route may inspect only this authorized read set after resolution; it never gains write or repair authority.

  Construct only the opaque `arguments_value` string supplied by the active wrapper.

  Initialize an ordered duplicate-free changed-file union, opaque input history, pending feedback, and feedback iteration `0`.

  Declare the canonical progress plan for this phase, in order, with exactly these ids and labels — no omissions, reorders, renames, or additions:

  - `prereqs-and-change` — "Check prerequisites"
  - `research` — "Research the change request"
  - `proposal` — "Write proposal.md"
  - `specs` — "Write specs/**"
  - `validation` — "Validate artifacts and derive the decision summary"
  - `review` — "Review artifacts"

  Declare the static optional `step_pointer_map` for this phase — fully known at dispatch, immutable for the invocation, and never carried in the dispatch envelope or any reconstruction field. It maps every declared step id to its just-in-time instruction pointer:

  | step id | pointer |
  | --- | --- |
  | `prereqs-and-change` | none |
  | `research` | `@sai/commands/spec/steps/research.md` |
  | `proposal` | `@sai/commands/spec/steps/proposal.md` |
  | `specs` | `@sai/commands/spec/steps/specs.md` |
  | `validation` | `@sai/commands/spec/steps/validation.md` |
  | `review` | `@sai/commands/spec/steps/review.md` |

  While the map is in force, every progress-event continuation payload you send is exactly two lines: today's protocol continuation line, then one pointer line `Active step: <id> — follow <path>` whose id and path come from this static map under the shared command runner's deterministic derivation — the first declared step still unmarked in plan order after applying the event; with every declared step marked, the second line reads exactly `Active step: none — complete remaining work and return your terminal result.` Artifact-feedback continuations and `continue_after_recovery` continuations carry no pointer line, so the worker's active step file persists across them in its continuous session.

  Render the full plan at dispatch per `@sai/policies/todo-structure.md` (first step `in_progress`, rest `pending`) **before** dispatching the worker — the render is a prerequisite of the dispatch, not a step that follows it. If a declared panel tool is unavailable at runtime, apply the harness panel binding's one-time degradation route before dispatch: record its notice, disable later panel calls for this invocation, and continue without panel rendering; do not runtime-detect or switch surfaces. Only after the render attempt or recorded degradation decision, dispatch exactly one `sai-1-spec-proposal-worker` through the active spec-worker binding using the original envelope. Progress-event panel updates follow `@sai/policies/todo-structure.md` through the shared command runner before worker continuation; an unavailable panel uses the same recorded degradation route and does not block continuation. Mark steps only from worker progress-event `step_ids`. A worker `completed` followed by the artifact feedback gate is pre-gate and does not reconcile. The gate's `Finish step` proceed selection is the spec phase's reconciliation trigger, at which the coordinator reconciles against the last terminal `completed`: every eligible unmarked step renders `completed`, while an unmarked evidence-marked `review` step is left exactly as last rendered. `failed`, `cancelled`, and `needs_input` leave the list exactly as last rendered. The carve-out is the evidence-marked designation from `@sai/policies/todo-structure.md`, never the bare `review` id.

  Progress events are the only allowed nonterminal extension. Set `allowed_nonterminal_extensions` to admit the progress event shape `{event: "progress", emitted_on: string, step_ids: string[], changed_files: string[]}` as the sole nonterminal extension, and `extension_handlers` to empty. Validate the four closed lifecycle statuses plus the progress event shape. There is no design notice state.

  For a progress event, mark the reported step ids in the declared progress plan, union the event's `changed_files` into the invocation-scoped union in first-seen order, and continue the same worker with exactly `continue_after_progress`. The acknowledgement is protocol-only and is never recorded as user input, opaque input history, or pending feedback.

  For `needs_input`, present the exact question and ordered options through the native picker, append only `{question, options, answer_value}` to opaque history, and forward the exact value to the same worker. Require complete reconstruction state before at most one replacement worker, including the complete original envelope, opaque history, pending feedback, resolved name, changed-file union, feedback iteration, and the departing worker's `active_step_id`; the replacement's first continuation carries the correct pointer line for that active step. Print worker summaries.

  After `completed`, print the worker-authored summary immediately before the shared `proposal.md`, `specs/**` feedback gate. On each feedback-option selection, emit the shared localized feedback-text prompt exactly once, wait for the next user turn, retain that supplied feedback text as pending feedback, and forward only supplied feedback text to the same worker. Continue the same worker with only that text. Never forward the empty picker turn. The worker processes feedback without presenting the prompt. Report worker-authored discards, clear pending feedback only after verified completion, increment feedback iteration, print the worker-authored summary, and re-present the gate. Never inspect or edit artifacts. The coordinator owns only lifecycle metadata and user-facing gate presentation after resolution.

  ## Spec recovery
  The shared runner owns diagnosis, channel selection, recovery eligibility, bounded attempts, same-worker continuation, and hand-back. The coordinator consumes the declared non-clean read surface only for the three post-resolution triggers above, never writes or repairs it, and forwards the ordered diagnosis through exactly `continue_after_recovery`. Recovery announcements and hand-backs are conversation text only and never mark, extend, rename, or add progress-plan steps.

  After the gate proceeds, print the existing MANDATORY STOP text exactly once after `Finish step`: `Spec proposal done in openspec/changes/{name}/. Review it and run \`/sai-2-design {name}\` (--fast-track) **in a new chat** when ready.`

</TASK>

Follow instruction on <TASK> step by step
