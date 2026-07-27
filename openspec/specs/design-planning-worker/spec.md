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
