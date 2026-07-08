## ADDED Requirements

### Requirement: openspec/specs/ scanned for conflicts before writing
Before writing any output file, the command SHALL scan `openspec/specs/` to identify specs that overlap with or are affected by the changes in the diff.

#### Scenario: No overlapping specs found
- **WHEN** the diff introduces a capability with no existing spec entry
- **THEN** the command proceeds to artifact generation without interruption

#### Scenario: Overlapping spec found
- **WHEN** the diff modifies behavior already described in one or more `openspec/specs/` entries
- **THEN** the command surfaces each conflict with: (a) the path to the affected spec, (b) a description of what would change, (c) the reason the change is needed

### Requirement: User decides to proceed or abort after conflict report
When conflicts are detected, the command SHALL present the full conflict report to the user and wait for an explicit decision to proceed or abort. The command SHALL NOT make this decision autonomously.

The proceed/abort decision SHALL be presented as a closed-choice prompt per the "Closed-choice prompts" rule in `remember.md` — via the harness's native option-picker when one exists, with a plain-text fallback otherwise. The two options SHALL be labeled with the full words `proceed` and `abort`. A reply that maps to neither option is invalid: the command SHALL re-ask and SHALL NOT proceed or abort on it, mirroring Phase 1's invalid-input handling. This requirement governs only presentation and invalid-input handling; the decision's semantics and the "wait for an explicit decision" behavior are unchanged.

#### Scenario: Decision presented via native option-picker
- **WHEN** conflicts are detected on a harness that has a native option-picker (e.g. Claude Code)
- **THEN** the proceed/abort decision is presented through that option-picker with two options labeled `proceed` and `abort`, rather than as a typed `(proceed/abort)` prompt

#### Scenario: Decision presented as plain-text fallback
- **WHEN** conflicts are detected on a harness with no native option-picker (e.g. GitHub Copilot)
- **THEN** the question and its `proceed` / `abort` options are printed as plain text and the command waits for a typed reply, with semantics identical to the option-picker presentation

#### Scenario: Reply maps to neither option
- **WHEN** the user submits a reply that maps to neither `proceed` nor `abort` (e.g. via the auto-appended free-text "Other" option)
- **THEN** the command treats it as invalid, re-asks the proceed/abort question, and writes no files until a valid choice is made

#### Scenario: User aborts after conflict report
- **WHEN** the user chooses to abort after seeing the conflict report
- **THEN** no files are written and the command exits cleanly

#### Scenario: User proceeds after conflict report
- **WHEN** the user confirms they want to proceed despite the conflicts
- **THEN** artifact generation continues, updating the conflicting specs as described in the report

### Requirement: Silent overwrite is prohibited
The command SHALL NEVER silently overwrite an existing `openspec/specs/` entry. Every modification to an existing spec MUST have been surfaced to the user in the conflict report and confirmed before the write occurs.

#### Scenario: Pre-existing spec updated only after confirmation
- **WHEN** an existing spec would be modified by the backfill
- **THEN** the user saw and approved the specific change in the conflict report before the file was written
