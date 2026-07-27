# Design Planning Worker Specification

## Purpose

Define the design planning worker lifecycle: change resolution, prerequisite checks, fast-track parsing, notice protocol, reconstruction metadata, and output contract.

## Interfaces

### DesignWorkerPayload

```yaml
status: "completed" | "needs_input" | "failed" | "cancelled"
summary: string
changed_files: string[]
resolved_change_name?: string
question?: string
options?: Array<{ label: string, value: string }>
```

### DesignNotice

```yaml
event: "notice"
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

A provided name bypasses `openspec list --json`. Zero changes returns the pinned failure. One change requests yes/no then continues or cancels. Multiple changes preserve CLI order and re-request options without retry cap.

#### Scenario: provided name bypasses list
- **WHEN** the wrapper-echo or arguments value is non-empty after trimming
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

### Requirement: The design worker owns the complete technical design workflow
The design worker SHALL own prerequisite checks, fast-track parsing, change selection, proposal and spec validation, specs approval state, codebase research, technical question resolution, design decisions, artifact generation, and artifact verification. The coordinator SHALL not share ownership of any of these activities. The worker SHALL complete universal prerequisites before parsing fast-track or emitting any fast-track notice.

#### Scenario: Worker starts from an invocation envelope
- **WHEN** a design worker receives `wrapper_echo_value` and `arguments_value`
- **THEN** it SHALL run universal prerequisites first, then apply wrapper-echo precedence, parse and strip `--fast-track`, resolve the change, and continue from durable OpenSpec state without printing user-visible text directly

#### Scenario: Fast-track prerequisites succeed
- **WHEN** universal prerequisites pass and worker-owned parsing finds the discrete `--fast-track` token while `fast_track_banner_emitted` is false
- **THEN** the worker SHALL return the design-scoped nonterminal notice `> FAST-TRACK MODE ACTIVE`, await coordinator continuation, and only then apply fast-track gate semantics

#### Scenario: Fast-track prerequisites fail
- **WHEN** a universal prerequisite fails before fast-track parsing
- **THEN** the worker SHALL return `failed` with the existing prerequisite error and SHALL NOT emit a fast-track notice

#### Scenario: Replacement worker reconstructs after the banner
- **WHEN** a fresh design worker receives reconstruction metadata with `fast_track_banner_emitted` true
- **THEN** it SHALL preserve fast-track semantics but SHALL NOT return the banner notice again

#### Scenario: opencode legacy wrapper echo carries a name and flag
- **WHEN** the routed opencode wrapper emits `**Change-name argument and and optional flags:** my-change --fast-track`
- **THEN** the coordinator SHALL place the exact text after the label in `wrapper_echo_value`, and the worker SHALL resolve `my-change` while activating and stripping the discrete `--fast-track` token

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
- **WHEN** wrapper-echo precedence or the cleaned explicit arguments produce a non-empty change name
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

#### Scenario: Specs approval is required
- **WHEN** specs are not approved and fast-track is inactive
- **THEN** the worker SHALL request the existing yes/no specs approval through `needs_input` and SHALL write approval metadata only after receiving `yes`

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
