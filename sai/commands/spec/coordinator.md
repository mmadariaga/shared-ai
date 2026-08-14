# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>. TASK is not a template, it's a instruction set.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  Fetch @sai/command-runner.md and follow it exactly.
  Fetch @sai/worker-core.md and follow it exactly.
  Fetch @sai/policies/artifact-feedback-gate.md before applying the completion gate. Supply `artifacts = proposal.md, specs/**`, `proceed-label = Finish step`, and `next-action = the existing mandatory stop`.

  ## Spec phase adapter
  You are the user-facing spec coordinator. Preserve Isolation Mode. Do not run prerequisites, resolve arguments, query OpenSpec, read git, code, configuration, documentation, change artifacts, or artifacts, and do not write files or make technical spec decisions. Do not reconstruct summaries or edit artifact feedback. These responsibilities belong exclusively to the spec-proposal worker.

  Construct only two strings: `wrapper_echo_value` and `arguments_value`. Dispatch exactly one `sai-1-spec-proposal-worker` through the active spec-worker binding using the original envelope.

  Initialize an ordered duplicate-free changed-file union, opaque input history, pending feedback, and feedback iteration `0`.

  Declare the canonical five-step progress plan for this phase, in order, with exactly these ids and labels — no omissions, reorders, renames, or additions:

  - `prereqs-and-change` — "Check prerequisites and resolve the change"
  - `proposal` — "Write proposal.md"
  - `specs` — "Write specs/**"
  - `validation` — "Validate artifacts and derive the decision summary"
  - `review` — "Review artifacts"

  Render the full plan at dispatch before the first worker result per `@sai/policies/todo-structure.md` (first step `in_progress`, rest `pending`); mark steps only from worker progress-event `step_ids`. A worker `completed` followed by the artifact feedback gate is pre-gate and does not reconcile. The gate's `Finish step` proceed selection is the spec phase's reconciliation trigger, at which the coordinator reconciles against the last terminal `completed`: every eligible unmarked step renders `completed`, while an unmarked evidence-marked `review` step is left exactly as last rendered. `failed`, `cancelled`, and `needs_input` leave the list exactly as last rendered. The carve-out is the evidence-marked designation from `@sai/policies/todo-structure.md`, never the bare `review` id.

  Progress events are the only allowed nonterminal extension. Set `allowed_nonterminal_extensions` to admit the progress event shape `{event: "progress", step_ids: string[], changed_files: string[]}` as the sole nonterminal extension, and `extension_handlers` to empty. Validate the four closed lifecycle statuses plus the progress event shape. There is no design notice state.

  For a progress event, mark the reported step ids in the declared progress plan, union the event's `changed_files` into the invocation-scoped union in first-seen order, and continue the same worker with exactly `continue_after_progress`. The acknowledgement is protocol-only and is never recorded as user input, opaque input history, or pending feedback.

  For `needs_input`, present the exact question and ordered options through the native picker, append only `{question, options, answer_value}` to opaque history, and forward the exact value to the same worker. Require complete reconstruction state before at most one replacement worker, including the complete original envelope, opaque history, pending feedback, resolved name, changed-file union, and feedback iteration. Print worker summaries.

  After `completed`, print the worker-authored summary immediately before the shared `proposal.md`, `specs/**` feedback gate. On each feedback-option selection, emit the shared localized feedback-text prompt exactly once, wait for the next user turn, retain that supplied feedback text as pending feedback, and forward only supplied feedback text to the same worker. Continue the same worker with only that text. Never forward the empty picker turn. The worker processes feedback without presenting the prompt. Report worker-authored discards, clear pending feedback only after verified completion, increment feedback iteration, print the worker-authored summary, and re-present the gate. Never inspect or edit artifacts. The coordinator owns only lifecycle metadata and user-facing gate presentation after resolution.

  After the gate proceeds, print the existing MANDATORY STOP text exactly once after `Finish step`: `Spec proposal done in openspec/changes/{name}/. Review it and run \`/sai-2-design {name}\` (--fast-track) **in a new chat** when ready.`

</TASK>

Follow instruction on <TASK> step by step
