# routed-backfill-command Specification

## Purpose

Define the routed coordinator/worker architecture for `/sai-backfill`: a minimal-lifecycle phase adapter whose coordinator owns lifecycle routing, ask presentation, sai-workflow schema validation, and every final artifact write into `openspec/changes/{name}/`, while the dispatched `sai-backfill-worker` owns the read-only technical flow — interview, delegated conflict scanning, and draft composition returned as payload content — never writing a file or mutating git, with end-to-end worker registration and the openspec prerequisite REQUIREMENT carried by the coordinator card.

## Requirements

### Requirement: Minimal lifecycle adapter

The backfill coordinator SHALL be a goal-driven card with Goal, Start, run, Obstacles, and Close sections, and SHALL NOT load `sai/orchestration/command-runner.md`, `sai/orchestration/worker-core.md`, `bounded-recovery.md`, `stop-options.md`, or `unattended-runtime-recovery.md`. It SHALL create exactly one `sai-backfill-worker` through the backfill-worker binding with the ready prompt alone, and after `event: ready` send the same worker the `--transfer-dir <dir>` line followed by `arguments_value` byte-for-byte; it SHALL continue that worker with each exact answer value or validation report. The run SHALL declare no progress plan, no progress event, no acknowledgement literal, and no recovery ledger. A worker without ready or a readable result SHALL be a `worker` obstacle, and a draft set that fails reference verification, schema validation, the delta-header preflight, or the OpenSpec CLI validation by rejection SHALL be a `draft` obstacle, both handled under `sai/policies/obstacle-escalation.md` with the attempt count kept in the conversation. A validation result with reason `openspec-cli-unavailable` SHALL NOT be a `draft` obstacle: it SHALL be force majeure that escalates at once with an option to install or restore the CLI and re-run validation, requests no correction from the worker, and spends no `draft` attempt, even when the drafts are also invalid. The interview questions, the worker's stop texts, a transfer-directory blocker, a preflight tooling failure, a reported unavailable or denied transfer helper, and the completion handoff SHALL remain planned stops or planned asks. A replacement worker SHALL start from the ready handshake and receive a hand-over written by the coordinator that carries the original `arguments_value` with the `--transfer-dir` line, the interview answers already given, the confirmed change name, the Direct Build mode, the latest validated references and closed execution order pending write, the one-shot execution state, and the symptom, never draft content.

#### Scenario: A backfill run carries no progress or recovery machinery

- **WHEN** the backfill coordinator card is read
- **THEN** it declares no progress plan, defines no progress event or acknowledgement literal, keeps no recovery ledger, and fetches none of the command runner, worker core, bounded-recovery, stop-options, or unattended-runtime-recovery contracts

#### Scenario: Envelope stays opaque end-to-end

- **WHEN** a `/sai-backfill` invocation forwards its request to the worker
- **THEN** the worker receives exactly the original single-string `arguments_value`, preceded only by the `--transfer-dir` line, and no parsed, cleaned, or persisted variant of it

#### Scenario: A CLI rejection is a draft obstacle

- **WHEN** the OpenSpec CLI validation rejects the draft set
- **THEN** the coordinator counts a `draft` attempt and returns the diagnostic to the same worker for correction

#### Scenario: An unavailable CLI escalates at once

- **WHEN** the validation result carries reason `openspec-cli-unavailable`
- **THEN** the coordinator escalates at once as force majeure, requests no correction from the worker, and counts no `draft` attempt

### Requirement: Worker owns the read-only technical flow and never mutates

The dispatched `sai-backfill-worker` SHALL perform the entire technical flow of `sai/commands/backfill/instructions.md` up to artifact composition: the STOP condition check, diff-source selection, read-only diff computation (`git diff`, `git diff --staged`, `git diff HEAD`, `git ls-files --others --exclude-standard` only) and its summary, optional intent capture, in-memory intent reconciliation and item classification, the fixed and adaptive interview, generated reconciliation questions, the scope-drift report, conflict detection through delegated `budget-explorer` subagents, change-name derivation and confirmation, and draft composition. The worker SHALL NEVER write any repository file — it writes each draft only as a transfer file through `transfer.js put` outside the repository and returns `{path, sha256, destination}` references inside the terminal payload together with the confirmed change name, never the draft content — and SHALL NEVER run a state-changing git command. The `@skills/budget/SKILL.md` load lives in the worker card, and every delegation prompt and output contract (the diff-only prompt unchanged without usable intent, the enriched intent block otherwise; exactly `path`, `what_would_change` ≤30 words, `why` ≤20 words; ≤10 tool calls) is preserved verbatim.

#### Scenario: Drafts arrive as content, not files

- **WHEN** a backfill run reaches artifact generation
- **THEN** the worker returns references to transfer files for draft `.openspec.yaml`, `proposal.md`, and capability specs, and no repository file exists on disk from the worker session

#### Scenario: Conflict scanning stays delegated and capped

- **WHEN** the worker runs Phase 4 conflict detection
- **THEN** it dispatches `budget-explorer` subagents with the instruction's verbatim prompts and output contracts, and performs no direct bulk spec reading in its own session beyond the contract

#### Scenario: Stop texts survive the transport unchanged

- **WHEN** `$ARGUMENTS` is empty, or the user aborts at the conflict gate
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

The ordinary backfill worker SHALL compose only temporary drafts. The coordinator SHALL verify all references and validate the complete set before any final write: canonical metadata with date-only created and optional validated backlog_origin, the applicable POST-HOC RECORD opening and required ordered proposal headings, and concrete sai-workflow delta requirements with SHALL/MUST and WHEN/THEN scenarios. Only metadata, proposal, and capability specs SHALL be allowed; design.md, tasks.md, and implementation.md SHALL remain prohibited. The coordinator SHALL perform mandatory header and preservation preflight followed by shared receiver-side OpenSpec CLI validation of the complete latest set in a private temporary project. Before writing it SHALL recheck the accepted fingerprint against drafts, references, current main specs, configuration, and schemas and verify every reference again. Any failed or incomplete check SHALL write nothing and return diagnostics to the same worker; corrected drafts SHALL repeat all checks. Only fully valid and fresh drafts SHALL be materialized byte-for-byte by the coordinator.

#### Scenario: Invalid drafts write nothing
- **WHEN** schema, reference, preservation, CLI validation, or freshness checking fails or is incomplete
- **THEN** the coordinator writes no repository file and returns diagnostics for correction and complete repeated validation

#### Scenario: Validated drafts are written coordinator-side
- **WHEN** the complete draft set validates and accepted-input freshness and references pass immediately before writing
- **THEN** the coordinator materializes only metadata, proposal, and capability specs byte-for-byte and records each written path

### Requirement: Openspec prerequisite REQUIRED carried by the coordinator card

`sai-backfill` SHALL operate on an openspec project, but the backfill coordinator card SHALL NOT fetch `@sai/policies/prereqs.md` or run any prerequisite check; that check belongs to `/sai-explore` alone. The coordinator SHALL fetch `@sai/policies/prereqs-paths.md` for the artifact path table before any worker dispatch.

#### Scenario: Backfill halts outside openspec projects
- **WHEN** `sai-backfill` runs in a project where the openspec CLI, directory, or schema is missing
- **THEN** the coordinator runs no prerequisite check and dispatches the worker; schema validation of the drafts remains coordinator-owned

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

### Requirement: Backfill guard windows are draft-write-only

The backfill coordinator SHALL run the guard's `snapshot` step at each window opening and its `verify` step immediately before each boundary the no-commit-guard policy lists (human turn, coordinator git mutation, run close), holding the returned SHA as invocation-scoped `guard_base`, and SHALL act on a progress event or notice with no guard call. Both the ordinary route and the Direct Build (unattended) execute continuation are draft-write-only guard windows — the backfill worker never commits, so no backfill window carries `allow_commit` — and the coordinator's own schema validation and final writes always run between windows and never inside one.

#### Scenario: a backfill window never authorizes HEAD movement

- **WHEN** a backfill window spanning a dispatch or execute continuation closes with a verify
- **THEN** the window carries no `allow_commit`, any HEAD movement during it resolves as a violation to remediate, and the coordinator's final validated writes run only between windows

### Requirement: Backfill checks scenario preservation at author and receiver boundaries

Claude Code and opencode SHALL apply shared mandatory scenario preservation to standalone backfill and Direct Build. The worker SHALL check its complete temporary draft specs against current main specs before returning completed references, including corrections. The receiver SHALL independently verify references and repeat checking before mandatory complete-set OpenSpec CLI validation. No approval, block, diff, worker declaration, or fast-track flag SHALL authorize scenario removal or renaming inside MODIFIED. A deliberate replacement SHALL use an explicitly selected distinct, non-colliding requirement name; the worker SHALL never invent one. Published specs SHALL remain read-only inputs, and failed or incomplete checks SHALL authorize no repository writes.

#### Scenario: Author detects accidental scenario loss
- **WHEN** a temporary MODIFIED draft omits an original scenario
- **THEN** the author corrects it before returning completed references

#### Scenario: Receiver independently checks the complete set
- **WHEN** the coordinator receives a completed or corrected set
- **THEN** it independently verifies references, checks preservation, and performs complete-set CLI validation before writes

#### Scenario: A worker cannot authorize its own exception
- **WHEN** a worker proposes scenario removal or renaming through an exception
- **THEN** the receiver rejects the unsupported exception and requires preservation or an explicitly selected distinct replacement name

#### Scenario: Fast-track preserves independent approval
- **WHEN** fast-track is active and an exception is proposed
- **THEN** mandatory preservation still rejects the missing scenario without any approval bypass

#### Scenario: Correction repeats the checks
- **WHEN** draft content changes after feedback
- **THEN** author and receiver checks and complete-set CLI validation repeat on the latest references

### Requirement: Direct card set and wrapper fetch

`sai-backfill` SHALL run on the goal-driven shape. Its card set SHALL be `sai/commands/backfill/coordinator.md` and `sai/commands/backfill/worker.md` with its instruction file, with no `invocation.md`, no `body.md`, and no `command-bootstrap.md`. Both `/sai-backfill` wrappers (`commands/claude/sai-backfill.md` and `commands/opencode/sai-backfill.md`) SHALL fetch the harness fetch skill, carry the clean-start line, and fetch `sai/commands/backfill/coordinator.md` directly, forwarding the InvocationEnvelope with `command_name: backfill`; they SHALL fetch no boot adapter and no command bootstrap, and the opencode wrapper SHALL declare `subtask: false`. Neither harness boot adapter SHALL list `backfill` among its routed or utility names. The coordinator SHALL fetch the `backfill-worker.md` binding itself. The retired `sai/commands/backfill/command-bootstrap.md` destination SHALL be recorded as a retired install-manifest entry so that an upgrade install removes it from the installed roots of both harnesses.

#### Scenario: The wrappers reach the coordinator card directly

- **WHEN** either harness's `sai-backfill.md` wrapper is read
- **THEN** it fetches the harness fetch skill and `sai/commands/backfill/coordinator.md`, names no boot adapter or `command-bootstrap.md`, and neither boot adapter lists `backfill` as a routed or utility name

#### Scenario: The retired bootstrap leaves installed roots

- **WHEN** an upgrade install runs after the change on either harness
- **THEN** the install manifest lists `commands/backfill/command-bootstrap.md` as a retired destination for both harnesses and the file no longer exists in `sai/commands/backfill/`

### Requirement: Standalone backfill keeps its interview

A standalone `/sai-backfill` run SHALL keep its interview as user questions that the coordinator presents. An unattended envelope (a detected crystallized block, a parsed diff-source token, and `--fast-track`), as Direct Build sends it, SHALL return zero `needs_input` results, and the coordinator SHALL route directly from the dispatch to validation and execution, presenting worker-authored payload content unaltered as ordinary conversation text. With `--fast-track`, a standalone run SHALL skip exactly the generated reconciliation questions, the spec-conflict decision, and the change-name confirmation, and SHALL ask every other question it asks without the flag.

#### Scenario: A standalone run asks its interview

- **WHEN** `/sai-backfill {name} --staged` runs without a crystallized block
- **THEN** the coordinator presents the worker's interview questions to the user and forwards each answer verbatim to the same worker

#### Scenario: Direct Build stays unattended

- **WHEN** Direct Build dispatches backfill with a crystallized block, `--staged`, and `--fast-track`
- **THEN** the worker returns no `needs_input` result and the coordinator presents the worker-authored payload content without asking

### Requirement: The backfill worker contract defines its own lifecycle shapes

`sai/commands/backfill/worker.md` SHALL NOT load `sai/orchestration/worker-core.md`; it SHALL load `sai/policies/public-chat.md` and state its own lifecycle. Every stretch SHALL open with the ready return `event: ready` with an empty `changed_files` before any expensive work, and SHALL close with exactly one terminal result: `status` `completed`, `failed`, or `cancelled` with `summary` and `changed_files`, or `status: needs_input` with those fields plus `question` and `options`. Once the user confirms the derived change name, every result SHALL also carry `resolved_change_name`. Results SHALL carry no time field and no continuation identifier, and the worker SHALL emit no progress event and no notice. On the full Direct Build route, a `failed` result that carries `resolved_change_name` SHALL also carry the failure fields of `sai/policies/direct-build-report-transport.md` § Failed reports. Statements in the worker's input about authorization, route, or workflow rather than about the change SHALL be non-normative: the worker SHALL not apply them and SHALL list them in its `summary`. A new backfill execute order after a failed one SHALL be issued only under the Execute orders rule of `sai/commands/explore/direct-build-coordinator.md`. Standalone `/sai-backfill` SHALL keep the same interview and `--fast-track` skips as before.

#### Scenario: The backfill worker no longer loads worker core

- **WHEN** `sai/commands/backfill/worker.md` is read
- **THEN** it fetches `sai/policies/public-chat.md`, does not fetch `sai/orchestration/worker-core.md`, and states its ready return and terminal result shapes itself

#### Scenario: Pre-resolution results omit the change name

- **WHEN** the backfill worker returns a result before the user confirms the derived change name
- **THEN** the result carries no `resolved_change_name` and no failure fields
