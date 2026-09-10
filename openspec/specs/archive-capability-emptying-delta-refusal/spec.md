# archive-capability-emptying-delta-refusal Specification

## Purpose
TBD - created by archiving change archive-capability-retirement-refusal. Update Purpose after archive.
## Requirements
### Requirement: Archive SHALL detect capability-emptying deltas before any mutation

During the read-only pre-flight assessment, the archive worker SHALL identify when a delta spec capability's `## REMOVED Requirements` section names every requirement currently published in `openspec/specs/<capability>/spec.md` with no `## ADDED Requirements` section for that same capability. This shape is a **capability-emptying delta**. A capability-emptying delta does not proceed to archive mutation.

#### Scenario: Detection occurs before archive CLI invocation

- **WHEN** a change's delta specs are assessed during pre-flight
- **THEN** the worker detects every delta spec capability whose REMOVED section names all published requirements and lacks any ADDED section for that same capability
- **AND** no mutation (directory move, file write, or git command) occurs before the refusal

#### Scenario: Capability-emptying deltas are refused with a stop-text

- **WHEN** the pre-flight assessment detects a capability-emptying delta
- **THEN** the worker returns a terminal payload whose summary is exactly:
  ```
  Delta would empty <capability> of all published requirements. Capability
  retirement is owned by `/sai-retire-docs` — reshape as ADD-only or use that
  path. (`openspec validate <capability>` will return green and is not evidence.
  Archive wrote nothing because it was refused here.) Archive blocked.
  ```
  (substituting the affected capability name)

### Requirement: Archive retirement stays in `/sai-retire-docs` with confirmation gating

Archive retirement SHALL remain owned by `/sai-retire-docs` with its per-candidate confirmation gate. The supported pattern for retiring a capability is a separate ADD-only change introducing the replacement capability, after which the retired capability is moved to `openspec/specs/_archived/<capability>/` through `/sai-retire-docs`. Archive gains no move or delete power under `openspec/specs/**`; its only write there remains the CLI delta-spec sync it already performs.

#### Scenario: Retirement is owned by the dedicated path

- **WHEN** a user needs to retire a capability from the active spec tree
- **THEN** they use `/sai-retire-docs` with its per-candidate confirmation gate rather than reshaping a change as a capability-emptying delta
- **AND** the archive worker documentation names `/sai-retire-docs` as the owning path

#### Scenario: Retired capabilities remain discoverable

- **WHEN** a capability is moved to `openspec/specs/_archived/<capability>/`
- **THEN** `openspec list --specs` returns the retired capability with an `_archived/` id prefix
- **AND** retirement is namespacing, not removal from CLI discovery or validation

### Requirement: Archive refusal addresses the false `openspec validate` lead

The refusal text SHALL explicitly state that `openspec validate <capability>` will return green and is not evidence of correctness, because:
- `openspec validate <change>` checks delta well-formedness only, not scenario preservation
- `openspec archive` rebuilds the spec in memory and validates it during the mutating command, but that check happens too late
- Archive's pre-flight refusal happens before any write, so `openspec validate <capability>` inspects the unchanged published spec and returns green
- SAI's refusal deliberately avoids duplicating the CLI's rebuilt-spec validation; the pre-flight check keyed on delta shape is narrower and catches the issue earlier

#### Scenario: The refusal text neutralizes the false hint

- **WHEN** a user reads the archive refusal message
- **THEN** they see `openspec validate <capability>` will return green and is not evidence
- **AND** the message names `/sai-retire-docs` as the correct path to proceed

