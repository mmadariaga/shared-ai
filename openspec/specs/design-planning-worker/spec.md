# Design Planning Worker Specification

## Purpose

Define the design planning worker lifecycle: change resolution, prerequisite checks, fast-track parsing, notice protocol, reconstruction metadata, and output contract.

## Interfaces

### DesignWorkerPayload

```yaml
status: "completed" | "needs_input" | "failed" | "cancelled"
emitted_on: string
summary: string
changed_files: string[]
resolved_change_name?: string
question?: string
options?: Array<{ label: string, value: string }>
```

### DesignNotice

```yaml
event: "notice"
emitted_on: string
message: string
changed_files: string[]
```

### DesignReconstructionMetadata

```yaml
opaque_input_history: OpaqueInputEntry[]
pending_feedback?: string
fast_track_banner_emitted: boolean
```

### OpaqueInputEntry

```yaml
question: string
options: Array<{ label: string, value: string }>
answer_value: string
```

## Requirements

### Requirement: fast-track-parsing-before-prerequisites

The worker SHALL parse the `--fast-track` flag before running prerequisite checks.

#### Scenario: fast-track runs first
- **WHEN** the planning worker receives an invocation with `--fast-track`
- **THEN** it parses the flag before checking for the openspec CLI, openspec directory, or schema
- **AND** if the fast-track preflight passes, it emits the `> FAST-TRACK MODE ACTIVE` notice before any prerequisite check failure text

### Requirement: fast-track-banner-single-emission

A reconstructed worker with `fast_track_banner_emitted: true` SHALL NOT emit the `> FAST-TRACK MODE ACTIVE` notice again.

### Requirement: prerequisite-failure-texts

Each missing prerequisite SHALL return its pinned actionable failure text.

#### Scenario: missing openspec CLI
- **WHEN** `openspec --version` fails
- **THEN** the worker returns `failed` with summary containing text about installing openspec

#### Scenario: missing openspec directory
- **WHEN** `openspec/` does not exist
- **THEN** the worker returns `failed` with summary containing text about running openspec init

#### Scenario: wrong schema
- **WHEN** `openspec/config.yaml` does not declare `schema: sai-workflow`
- **THEN** the worker returns `failed` with summary containing text about the schema declaration

### Requirement: change-resolution

A provided `arguments_value` name SHALL bypass `openspec list --json`. Zero changes SHALL return the pinned failure. One change SHALL request yes/no then continue or cancel. Multiple changes SHALL preserve CLI order and re-request options without a retry cap. No wrapper-echo source SHALL be consulted.

#### Scenario: provided name bypasses list
- **WHEN** `arguments_value` is non-empty after trimming
- **THEN** the worker uses it directly and does NOT run `openspec list --json`

#### Scenario: zero changes returns failure
- **WHEN** `openspec list --json` returns zero changes
- **THEN** the worker returns `failed` with summary containing "No active changes found"

#### Scenario: one change requests yes/no
- **WHEN** exactly one change is found
- **THEN** the worker returns `needs_input` with question containing "Use change" and options yes/no
- **AND** a yes answer resolves the change; a no answer returns cancelled

#### Scenario: multiple changes preserve order
- **WHEN** two or more changes are found
- **THEN** the worker returns `needs_input` with question "Which change?" and options in CLI-preserved order
- **AND** for every invalid answer, it returns the same request again without imposing a retry cap

### Requirement: resolved-change-name-field

Every payload after change resolution has `resolved_change_name`. Pre-resolution payloads omit it.

#### Scenario: resolved_change_name present post-resolution
- **WHEN** change resolution completes
- **THEN** every subsequent worker payload includes the `resolved_change_name` field set to the resolved name

#### Scenario: resolved_change_name absent pre-resolution
- **WHEN** no change has been resolved yet
- **THEN** the worker payload does NOT contain the `resolved_change_name` field

### Requirement: completion-requires-three-artifacts

Completion follows disk verification of `design.md`, `tasks.md`, and `interfaces.md`.

#### Scenario: all three artifacts verified
- **WHEN** the worker completes planning
- **THEN** it verifies `design.md`, `tasks.md`, and `interfaces.md` exist and are non-empty before returning `completed`

#### Scenario: missing artifact returns failure
- **WHEN** any of the three artifacts is missing or empty after planning
- **THEN** the worker returns `failed` with a blocking summary

### Requirement: three-artifact-completion

Completion SHALL verify `design.md`, `tasks.md`, AND `interfaces.md` before claiming completion.

### Requirement: Design lifecycle payloads carry emission time

The design worker SHALL include worker-authored `emitted_on` in notices, progress events, and terminal payloads while preserving worker-owned design workflow and continuation.

#### Scenario: Design composes a closed result
- **WHEN** the design worker emits a notice, progress event, or terminal result
- **THEN** the payload includes its actual composition instant in `emitted_on`.

### Requirement: The design worker owns the complete technical design workflow
The design worker SHALL own prerequisite checks, fast-track parsing, change selection, proposal and spec validation, specs approval state, codebase research, technical question resolution, design decisions, artifact generation, and artifact verification. The coordinator SHALL not share ownership. The worker SHALL parse the sole `arguments_value` request; wrapper-echo precedence and wrapper-label extraction do not exist.

#### Scenario: worker stamps the approval without asking
- **WHEN** the design worker has verified `proposal.md` and at least one `specs/**/*.md` for the resolved change
- **THEN** it SHALL stamp `approval.specs.approved_at` (skipping the write when the key is already present and non-empty) and `approval.specs.notes` as an empty string, and SHALL NOT return a `needs_input` result for specs approval

#### Scenario: startup act reports the stamp
- **WHEN** the worker completes its startup act
- **THEN** the act — fast-track parsing, prerequisites, resolution, and stamping the specs approval — SHALL report as one progress batch carrying only `prereqs-resolution`, with no standalone step and no `skipped` field for the gate

#### Scenario: Worker starts from an invocation envelope
- **WHEN** a design worker receives `arguments_value`
- **THEN** it runs universal prerequisites, parses its supported flags, resolves the change, and continues from durable OpenSpec state

#### Scenario: Fast-track prerequisites succeed
- **WHEN** universal prerequisites pass and worker-owned parsing finds the discrete `--fast-track` token while `fast_track_banner_emitted` is false
- **THEN** the worker SHALL return the design-scoped nonterminal notice `> FAST-TRACK MODE ACTIVE`, await coordinator continuation, and only then apply fast-track gate semantics

#### Scenario: Fast-track prerequisites fail
- **WHEN** a universal prerequisite fails before fast-track parsing
- **THEN** the worker SHALL return `failed` with the existing prerequisite error and SHALL NOT emit a fast-track notice

#### Scenario: Replacement worker reconstructs after the banner
- **WHEN** a fresh design worker receives reconstruction metadata with `fast_track_banner_emitted` true
- **THEN** it SHALL preserve fast-track semantics but SHALL NOT return the banner notice again


#### Scenario: Prerequisite or source artifact is missing
- **WHEN** a prerequisite fails or required `proposal.md` or `specs/**/*.md` is absent
- **THEN** the worker SHALL return `failed` with the existing actionable error semantics and the files changed before failure

#### Scenario: OpenSpec CLI prerequisite fails
- **WHEN** `openspec --version` cannot verify an OpenSpec binary in PATH
- **THEN** the worker SHALL return `failed` with exactly `openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec` and SHALL NOT parse fast-track or emit a notice

#### Scenario: OpenSpec project prerequisite fails
- **WHEN** the project-root `openspec/` directory does not exist
- **THEN** the worker SHALL return `failed` with exactly `OpenSpec not initialized in this project. Run: openspec init` and SHALL NOT parse fast-track or emit a notice

#### Scenario: SAI schema prerequisite fails
- **WHEN** `openspec/config.yaml` does not declare `schema: sai-workflow`
- **THEN** the worker SHALL return `failed` with exactly "openspec/config.yaml does not declare `schema: sai-workflow`. The sai commands require this schema. Add `schema: sai-workflow` to the top of openspec/config.yaml." and SHALL NOT parse fast-track or emit a notice

#### Scenario: Provided change name bypasses the picker
- **WHEN** the cleaned explicit `arguments_value` produces a non-empty change name
- **THEN** the worker SHALL use that name without running `openspec list --json` or requesting picker input

#### Scenario: No active changes exist
- **WHEN** no name is provided and `openspec list --json` returns an empty `changes` array
- **THEN** the worker SHALL return `failed` with exactly "No active changes found. Run `/sai-1-spec` to create one." and SHALL NOT request input

#### Scenario: One active change requires confirmation
- **WHEN** no name is provided and `openspec list --json` returns exactly one change
- **THEN** the worker SHALL return `needs_input` with `Use change '{name}'?`, ordered options `yes` then `no`, and no resolved change name

#### Scenario: One active change is confirmed
- **WHEN** the coordinator forwards `yes` for the one-change confirmation
- **THEN** the worker SHALL resolve that change and continue the design workflow

#### Scenario: One active change is declined
- **WHEN** the coordinator forwards any answer other than `yes` for the one-change confirmation
- **THEN** the worker SHALL return `cancelled` with a concise clean-stop summary and SHALL NOT request the same confirmation again

#### Scenario: Multiple active changes require selection
- **WHEN** no name is provided and `openspec list --json` returns two or more changes
- **THEN** the worker SHALL return `needs_input` with `Which change?` and one ordered option per `changes[].name` in CLI response order

#### Scenario: Multiple-change selection is invalid
- **WHEN** the coordinator forwards a value that matches no offered change name or numbered option
- **THEN** the worker SHALL return the same `needs_input` question and ordered options without a retry limit, changing no files and resolving no name

### Requirement: The design worker owns interactive technical decisions
Whenever the design workflow needs user approval, clarification, amendment consent, an Open Question answer, or another user decision, the worker SHALL author a `needs_input` payload with the exact question and ordered options. After the binding forwards an answer, the same worker SHALL continue the workflow from its current context and durable artifacts.

#### Scenario: Spec problem has a clear amendment
- **WHEN** design research finds a spec problem whose correction is clear
- **THEN** the worker SHALL request amendment consent, apply the amendment and audit metadata only after consent, and otherwise preserve the existing route back to `/sai-1-spec`

#### Scenario: Technical question remains open
- **WHEN** research cannot resolve an Open Question from codebase or documented evidence
- **THEN** the worker SHALL request the necessary user decision before finalizing dependent tasks

### Requirement: The design worker writes durable artifacts directly
The worker SHALL write `design.md`, `tasks.md`, and `interfaces.md` directly under `openspec/changes/{name}/`, preserve their current formats and cross-artifact relationships, and verify all three from disk before returning `completed`. Every lifecycle payload after change resolution SHALL extend the shared payload with a top-level `resolved_change_name` string containing the canonical resolved name; payloads returned before resolution SHALL omit that field. Its `changed_files` SHALL include every file written during the worker session, including `.openspec.yaml`, amended `proposal.md` or `specs/**/*.md`, and all design artifacts. Lifecycle payloads SHALL report paths and summaries only and SHALL NOT return artifact contents through the coordinator.

#### Scenario: Design generation succeeds
- **WHEN** the worker has resolved all blocking decisions
- **THEN** it SHALL generate and verify `design.md`, `tasks.md`, and `interfaces.md`, return `completed` with `resolved_change_name`, and list every file changed since dispatch without embedding its contents

#### Scenario: Worker requests input after change resolution
- **WHEN** the worker returns `needs_input` after resolving the change
- **THEN** the payload SHALL place `resolved_change_name` alongside `status`, `summary`, `changed_files`, `question`, and `options`, outside binding-owned continuation metadata

#### Scenario: Approval or amendment writes metadata
- **WHEN** the worker writes specs approval metadata, amendment audit metadata, or an approved proposal or spec amendment before its next lifecycle result
- **THEN** that result's `changed_files` SHALL include every written `.openspec.yaml`, `proposal.md`, and spec path in addition to any design artifacts

#### Scenario: Artifact verification fails
- **WHEN** any required artifact is missing, malformed, or inconsistent with the proposal and specs after writing
- **THEN** the worker SHALL correct and re-verify it or return `failed`; it SHALL NOT ask the coordinator to inspect or repair the artifact

### Requirement: Artifact feedback remains worker-owned
The same worker session SHALL evaluate feedback item by item, edit only the named design artifacts for legitimate feedback, report each discarded item with its reason, re-verify the artifacts, and author the recomputed decision summary. A fresh-worker fallback SHALL reconstruct this workflow from durable artifacts when continuation is unavailable.

#### Scenario: Mixed feedback is supplied
- **WHEN** one feedback turn contains legitimate and illegitimate items
- **THEN** the worker SHALL apply each legitimate item, report each discarded item separately, verify the updated artifacts, and return the recomputed summary through its lifecycle payload

#### Scenario: Feedback continuation cannot resume
- **WHEN** the binding cannot continue the worker that generated the artifacts
- **THEN** a fresh design worker SHALL reconstruct state from the current durable artifacts, coordinator-forwarded opaque input history, and any exact `pending_feedback`, then independently and idempotently evaluate pending feedback against current artifacts without repeating accepted questions

### Requirement: Proposal Complexity remains descriptive
The design worker SHALL NOT use Proposal Complexity to select a model, effort level, worker profile, or workflow branch in this change.

#### Scenario: Proposal carries any complexity token
- **WHEN** `proposal.md` contains `low`, `medium`, or `high` Proposal Complexity
- **THEN** the same configured design worker and workflow SHALL run without routing on that token

### Requirement: design-worker-progress-emission

The design worker SHALL emit progress events, after prerequisite checks pass and change resolution completes, whenever it completes one or more steps of the progress plan whose ids are canonical in the phase contracts. The design worker contract SHALL enumerate exactly the step ids `prereqs-resolution`, `research`, `design`, `tasks`, `interfaces`, `review`, and `overview`, with labels `Check prerequisites`, `Research and resolve open questions`, `Write design.md`, `Write tasks.md`, `Write interfaces.md`, `Review artifacts`, and `Generate change-overview.md` respectively, and every event SHALL carry only ids from that enumeration, in plan order, plus the files changed since the preceding result. The worker SHALL NOT author, extend, or reorder the plan, and SHALL NOT emit a progress event before resolution or in place of a terminal payload.

The worker SHALL report one batch per completed act: the startup act (fast-track parsing, prerequisite checks, change resolution, and the specs approval gate) carries `prereqs-resolution`; codebase research and Open Question resolution carry `research`; writing `design.md` carries `design`; writing `tasks.md` carries `tasks`; writing and verifying `interfaces.md` carries `interfaces`; a completed review pass reporting `High=0` carries `review` per `review-step-evidence-marking`; a successful `change-overview.md` materialization or regeneration carries `overview`.

When `--fast-track` is active the specs approval gate is skipped and folds into the startup batch with no separate `skipped` field and no separate batch.

A feedback turn SHALL NOT emit a progress event, except that a feedback turn which runs a review pass reporting `High=0` while the `review` step is still unmarked SHALL emit exactly one progress event carrying `review`. No feedback turn SHALL emit a progress event carrying any other step id. This mirrors the spec worker's carve-out and is distinct from the `overview` event, which belongs to the post-gate generation continuation rather than to a feedback turn.

#### Scenario: startup batch carries the folded approval gate

- **WHEN** the design worker completes fast-track parsing, prerequisite checks, change resolution, and the specs approval gate
- **THEN** it SHALL emit one progress event carrying `prereqs-resolution`

#### Scenario: fast-track startup batch

- **WHEN** `--fast-track` is active and the specs approval gate is skipped
- **THEN** the startup act SHALL still report as one batch carrying `prereqs-resolution`, with no separate batch and no `skipped` field

#### Scenario: one batch per artifact write

- **WHEN** the design worker writes `design.md`, then `tasks.md`, then `interfaces.md`
- **THEN** it SHALL emit one progress event per artifact, carrying `design`, `tasks`, and `interfaces` respectively, each with `changed_files` listing every path written since the preceding result

#### Scenario: review batch

- **WHEN** a worker-owned review pass over `design.md`, `tasks.md`, and `interfaces.md` completes and reports `High=0`
- **THEN** the worker SHALL emit one progress event carrying `review`

#### Scenario: overview batch

- **WHEN** the worker-owned overview generation commits `overview.state: current` after a successful generator result
- **THEN** the worker SHALL emit one progress event carrying `overview`, with `changed_files` listing `change-overview.md` and `.openspec.yaml`

#### Scenario: failed overview generation marks nothing

- **WHEN** overview generation fails in any of its defined failure modes
- **THEN** the worker SHALL NOT emit a progress event carrying `overview`
- **AND** it SHALL report the failure with its `failure_kind` and non-empty `failure_details` exactly as the existing failure boundary requires

#### Scenario: ordinary feedback turns emit no progress

- **WHEN** the design worker processes coordinator-forwarded artifact feedback that runs no review pass
- **THEN** it SHALL NOT emit a progress event, because no plan step completes during that turn

#### Scenario: a user-requested review pass during a feedback turn may mark review

- **WHEN** a feedback turn runs a user-requested review pass that reports `High=0` and the `review` step is not yet marked
- **THEN** the worker SHALL emit exactly one progress event carrying `review`
- **AND** it SHALL carry no other step id

#### Scenario: progress never closes the run

- **WHEN** the design worker finishes the phase
- **THEN** it SHALL still return exactly one terminal lifecycle status and SHALL NOT close with a progress event

### Requirement: Main design failures use the closed classification

The design-planning worker SHALL apply the shared `failure_class` rule to failures on the main design path (`design.md`, `tasks.md`, and `interfaces.md`) as well as its existing overview-generation path. Every post-resolution failed design result SHALL carry `failure_class` and boolean `unrecoverable`; a completed, needs-input, or cancelled result SHALL not carry failure-only fields. The worker's authorized main-path artifact surface SHALL remain `design.md`, `tasks.md`, and `interfaces.md`; proposal/spec inputs are read-only prerequisites and are outside that repair boundary.

#### Scenario: Main design validation failure is classified
- **WHEN** verification of `design.md`, `tasks.md`, or `interfaces.md` fails after resolution
- **THEN** the worker SHALL return `validation-failed` with concrete non-raw evidence
- **AND** SHALL include `unrecoverable` without adding coordinator routing fields

#### Scenario: Contradictory specs are outside the design repair surface
- **WHEN** design research establishes that contradictory `proposal.md` or `specs/**` prevents a correct design
- **THEN** the worker SHALL report `blocking-contradiction` with evidence naming the dependency
- **AND** the coordinator SHALL be able to classify the cause as out-of-scope without authorizing a spec edit

#### Scenario: Overview classification remains compatible
- **WHEN** the overview generator returns a valid failure kind or the parent detects a malformed nested envelope
- **THEN** the existing overview mapping to `failure_class` SHALL remain authoritative
- **AND** the new main-path rule SHALL not collapse an envelope-contract violation into `generation-error`

### Requirement: Design recovery continuation verifies only worker-owned artifacts

On `continue_after_recovery`, the same design worker SHALL use the ordered coordinator diagnosis, repair only its authorized main design artifacts or the existing overview surface as applicable, and re-run the phase's artifact verification before returning `completed`. The worker SHALL not edit `proposal.md`, `specs/**`, or `.openspec.yaml` for a diagnosis repair except for the existing overview lifecycle state transitions. Classification, Cause Locus, diagnosis keys, and attempt counts SHALL remain non-durable.

#### Scenario: In-scope main-path correction completes
- **WHEN** coordinator evidence identifies a safe correction in `design.md`, `tasks.md`, or `interfaces.md`
- **THEN** the same worker SHALL apply that correction and verify all three main artifacts
- **AND** it SHALL return `completed` only after verification

#### Scenario: Recovery cannot repair a prior-phase contradiction
- **WHEN** the coordinator identifies `proposal.md` or `specs/**` as the cause of a design failure
- **THEN** the design worker SHALL not edit that artifact during recovery
- **AND** the phase SHALL stop with the cause named and zero recovery attempts

### Requirement: Main-path recovery preserves the design workflow

The classification rule SHALL preserve the design progress plan, specs-approval behavior, feedback gate, architecture-snapshot summary, overview-generation lifecycle, and ordinary replacement fallback outside the bounded recovery path. A recovery failure SHALL suppress the success completion sentence exactly as the existing design failure boundary requires.

#### Scenario: Clean design path is unchanged
- **WHEN** the worker completes the main design path and later overview lifecycle without a non-clean closure
- **THEN** the existing progress, feedback, overview, and terminal behavior SHALL remain unchanged
- **AND** no main-path diagnosis inspection SHALL occur

#### Scenario: Recovery failure leaves overview incomplete
- **WHEN** a non-clean main design recovery does not return a verified completion
- **THEN** the coordinator SHALL leave the design phase incomplete
- **AND** it SHALL not emit the existing design completion sentence
