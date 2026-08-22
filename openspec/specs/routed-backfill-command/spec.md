# routed-backfill-command Specification

## Purpose

Define the routed coordinator/worker architecture for `/sai-backfill`: a minimal-lifecycle phase adapter whose coordinator owns lifecycle routing, ask presentation, sai-workflow schema validation, and every final artifact write into `openspec/changes/{name}/`, while the dispatched `sai-backfill-worker` owns the read-only technical flow — interview, delegated conflict scanning, and draft composition returned as payload content — never writing a file or mutating git, with end-to-end worker registration and the openspec prerequisite REQUIREMENT carried by the coordinator card.

## Requirements

### Requirement: Routed card set and boot routing

`sai-backfill` SHALL be a routed-shaped command whose card set is exactly `sai/commands/backfill/coordinator.md` and `sai/commands/backfill/worker.md` (no `invocation.md`; the legacy utility `body.md` is retired). Both harness boot adapters (`sai/adapters/claude/boot.md` and `sai/adapters/opencode/boot.md`) SHALL classify `backfill` among the routed names so that selecting it fetches `@sai/commands/backfill/coordinator.md`, and SHALL exclude `backfill` from the utility-name lists byte-symmetrically; no boot path SHALL select a backfill `body.md`.

#### Scenario: Both boots route backfill to the coordinator card

- **WHEN** either supported harness boots with `command_name` set to `backfill`
- **THEN** `backfill` appears in that boot adapter's routed-name list and the selected card is `@sai/commands/backfill/coordinator.md`
- **AND** `backfill` does not appear in the boot's utility-name list

#### Scenario: The utility body surface is retired

- **WHEN** `sai/commands/backfill/` is inspected after the change
- **THEN** no `body.md` exists and no adapter, launcher, or test fixture selects one for `sai-backfill`

### Requirement: Minimal lifecycle adapter

The backfill coordinator SHALL declare the minimal phase-adapter field set: `original_envelope` is exactly the opaque single-string `arguments_value` received from the active wrapper byte-for-byte; `dispatch_operation` dispatches exactly one `sai-backfill-worker` through the active backfill-worker binding using that envelope; `continuation_operation` continues the same worker through the binding's continuation mechanism forwarding the exact answer value or the validation report; `allowed_nonterminal_extensions` is none. The adapter SHALL declare NO `progress_plan` — no progress event exists in this lifecycle, no panel plan renders, and no acknowledgement literal is defined — and NO `recovery_policy`: the coordinator SHALL NOT fetch `@sai/policies/bounded-recovery.md`, keep no recovery ledger, and perform no recovery continuations. A replacement worker SHALL reconstruct only from the complete original envelope, the opaque input history (including forwarded interview answers), the confirmed change name, the validated draft set pending write, and the ordered duplicate-free changed-files union.

#### Scenario: A backfill run carries no progress or recovery machinery

- **WHEN** the backfill coordinator card is read
- **THEN** it declares no `progress_plan`, defines no progress event or acknowledgement literal, declares no `recovery_policy`, and never fetches the bounded-recovery policy

#### Scenario: Envelope stays opaque end-to-end

- **WHEN** a `/sai-backfill` invocation forwards its request to the worker
- **THEN** the worker receives exactly the original single-string `arguments_value` and no parsed, cleaned, or persisted variant of it

### Requirement: Worker owns the read-only technical flow and never mutates

The dispatched `sai-backfill-worker` SHALL perform the entire technical flow of `sai/commands/backfill/instructions.md` up to artifact composition: the STOP condition check, diff-source selection, read-only diff computation (`git diff`, `git diff --staged`, `git diff HEAD`, `git ls-files --others --exclude-standard` only) and its summary, optional intent capture, in-memory intent reconciliation and item classification, the fixed and adaptive interview, generated reconciliation questions, the scope-drift report, conflict detection through delegated `budget-explorer` subagents, change-name derivation and confirmation, and draft composition. The worker SHALL NEVER write any file — draft artifact CONTENT travels as payload text inside the terminal payload together with the confirmed change name — and SHALL NEVER run a state-changing git command. The `@skills/budget/SKILL.md` load lives in the worker card, and every delegation prompt and output contract (the diff-only prompt unchanged without usable intent, the enriched intent block otherwise; exactly `path`, `what_would_change` ≤30 words, `why` ≤20 words; ≤10 tool calls) is preserved verbatim.

#### Scenario: Drafts arrive as content, not files

- **WHEN** a backfill run reaches artifact generation
- **THEN** the worker returns draft `.openspec.yaml`, `proposal.md`, and capability specs as payload text and no file exists on disk from the worker session

#### Scenario: Conflict scanning stays delegated and capped

- **WHEN** the worker runs Phase 4 conflict detection
- **THEN** it dispatches `budget-explorer` subagents with the instruction's verbatim prompts and output contracts, and performs no direct bulk spec reading in its own session beyond the contract

#### Scenario: Stop texts survive the transport unchanged

- **WHEN** `$ARGUMENTS` is empty with no derivable name, or the user aborts at the conflict gate
- **THEN** the worker returns a terminal payload whose summary is exactly `Change name required. Run: /sai-backfill <name>` or exactly `Backfill aborted. No files written.` respectively

### Requirement: Needs-input interview transport with byte-faithful forwarding

Every user-facing decision of the instruction SHALL be returned by the worker as a `needs_input` lifecycle result — one question at a time, in the instruction's order — and presented by the coordinator per its kind: closed-choice asks (the three-option diff-source selection with its plain-text fallback block preserved for picker-less surfaces, the two-option intent-capture choice under the canonical prompt string, the conflict decision with options `proceed (Recommended)` / `abort`, the change-name confirmation with `yes` / `no`) through the native option-picker carrying any worker-authored context (diff summary, conflict report, proposed name) unaltered; open-ended and free-text asks (the base-commit request, Question 1, Question 2, every generated reconciliation question, and the single clean intent follow-up) returned with an empty `options` array and rendered by the coordinator as ordinary conversation text exactly once per the Delivery rule, never routed through the picker and never echoed in the same turn. The coordinator SHALL append only `{question, options, answer_value}` to the opaque input history and forward each answer value verbatim to the same worker; an invalid free-text reply re-asks without writing anything.

#### Scenario: A closed-choice answer travels untouched

- **WHEN** the user selects an option at the diff-source, intent-capture, conflict, or name-confirmation ask
- **THEN** the coordinator presents the exact question and ordered options through the native option-picker and forwards the selected value verbatim through the binding continuation

#### Scenario: Open-ended questions render once as conversation text

- **WHEN** the worker returns an interview question with empty options
- **THEN** the coordinator renders that question string exactly once as ordinary conversation text, ends the turn, and forwards the user's full response verbatim

### Requirement: Worker-drafts and coordinator-validates-and-writes split

Schema validation against `openspec/schemas/sai-workflow/schema.yaml` and every final write into `openspec/changes/{name}/` SHALL belong exclusively to the coordinator. On the worker's completed run carrying its draft set, the coordinator SHALL validate before writing anything: the `.openspec.yaml` key set matches the no-intent three-key form or the usable-intent four-key form (plus `prior_intent`) with date-only `created`; the proposal opens with the exact applicable POST-HOC RECORD blockquote and carries `## Why`, `## What Changes`, `## Capabilities`, `### New Capabilities`, `### Modified Capabilities`, and `## Impact` in order, ending with the Out-of-scope line; every capability spec follows the sai-workflow delta format with concrete `### Requirement:` headings using SHALL/MUST language and at least one `#### Scenario:` block containing exactly one `- **WHEN**` line and one `- **THEN**` line; and the draft set contains only `.openspec.yaml`, `proposal.md`, and capability specs — never `design.md`, `tasks.md`, or `implementation.md`. On any validation failure the coordinator SHALL write nothing and resume the same worker with the failure report; only fully valid drafts are written, byte-for-byte from the draft content.

#### Scenario: Invalid drafts write nothing

- **WHEN** a returned draft violates the schema contract (a missing heading, a scenario without WHEN/THEN, or a prohibited planning artifact in the set)
- **THEN** the coordinator writes no file, resumes the same worker with the failure report, and re-validates the corrected drafts

#### Scenario: Validated drafts are written coordinator-side

- **WHEN** the draft set fully validates
- **THEN** the coordinator itself creates `.openspec.yaml`, `proposal.md`, and each capability spec under `openspec/changes/{name}/` byte-for-byte and adds every written path to the changed-files union

### Requirement: Openspec prerequisite REQUIRED carried by the coordinator card

Unlike the commit exemption, `sai-backfill` SHALL require the openspec project: the backfill coordinator card SHALL fetch `@sai/policies/prereqs.md` and apply the full three checks — the `openspec` binary in PATH, the `openspec/` directory present, and `openspec/config.yaml` declaring `schema: sai-workflow` — halting with the check's own message on failure, before any worker dispatch.

#### Scenario: Backfill halts outside openspec projects

- **WHEN** `sai-backfill` runs in a project where any prerequisite check fails
- **THEN** the coordinator halts with that check's message before dispatching the worker, because no exemption exists for this command

### Requirement: End-to-end worker registration

The `sai-backfill-worker` identity SHALL be registered across the full projection chain: `bin/worker-matrix.js` gains the `backfill` phase entry bringing the matrix to twelve entries and extends the worker-identity regex to admit `sai-backfill-worker`; `sai/install-manifest.json` (and its generator) declare the claude and opencode managed-agent projections for the worker; the installed-worker roster and binding validators in `bin/install-flow.js` accept the twelve-worker roster; and `sai/commands/backfill/launcher.md` carries exactly the binding fetch `Fetch @sai/orchestration/workers/bindings/backfill-worker.md and use it.`

#### Scenario: Install validates the twelve-worker roster

- **WHEN** install-time roster and binding validation runs after the change
- **THEN** the derived roster contains twelve workers including `sai-backfill-worker` and both harness projections for it are present exactly once

### Requirement: Terminal completion literal and Ready-to-Archive handoff

On a run closed by validated artifacts written into `openspec/changes/{name}/`, terminal navigation SHALL print the worker-authored summary verbatim, then print exactly `Backfill complete in openspec/changes/{name}/.` with the confirmed name substituted — today's established MANDATORY STOP text, preserved — then print the `## Ready to Archive` block (change name plus "**Open a new chat** and run `/sai-archive {name}` (--fast-track).") with the confirmed name substituted, as the LAST output of the command: no tool call, no follow-up command, and no further prose follows it, and the coordinator never invokes or prefetches anything from the archive flow. Every other closure prints the worker-authored summary verbatim and stops without the completion literal, without the block, and without any file write.

#### Scenario: Completed run ends with the block last

- **WHEN** validated artifacts have been written into `openspec/changes/{name}/`
- **THEN** the output closes with the exact `Backfill complete in openspec/changes/{name}/.` line followed by the `## Ready to Archive` block, and nothing is printed after the block

#### Scenario: Non-completing closures carry neither literal nor block

- **WHEN** a run stops at the STOP condition, an abort answer, or a validation failure loop
- **THEN** the worker-authored summary is printed verbatim with no completion literal and no Ready-to-Archive block, and no file was written

### Requirement: Fixed content assignment across the two cards

The split of today's technical content SHALL be fixed and single-sourced: `sai/commands/backfill/instructions.md` belongs to the WORKER as read-only inspection, interviewing, reconciliation, delegation, and draft-composition procedure plus every user-facing ask, with a routed-ownership header documenting the transport mapping (print/display/surface → payload summary carried verbatim; ask/offer → `needs_input` result; conditionals → forwarded answers; Phase 6 create/write → compose-draft-and-return); safe-operations and remember are fetched by the COORDINATOR, the budget skill load and every `budget-explorer` dispatch belong to the WORKER session, and schema validation plus every final file write belong HERE, in this coordinator. Neither card SHALL perform the other's half.

#### Scenario: Each technical duty lives in exactly one card

- **WHEN** the backfill card set is audited after the change
- **THEN** every check, question, and draft traces to the worker's instruction load and schema validation plus every final write traces to the coordinator card
