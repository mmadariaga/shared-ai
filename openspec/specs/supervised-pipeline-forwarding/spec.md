# supervised-pipeline-forwarding Specification

## Purpose

*To be determined — brief description of what this capability does and why it exists.*

## Requirements

### Requirement: Forward language through supervised start-pipeline

When `sai-explore` runs a supervised `start-pipeline` invocation with `--overview-lang <language>`, it SHALL retain the value only in invocation-scoped supervised state and SHALL include the same flag and value in the chained `sai-2-design` worker request. The existing chained fast-track behavior SHALL remain active.

#### Scenario: Selected language reaches chained design

- **WHEN** a supervised explore run starts the pipeline with `--overview-lang spanish`
- **THEN** the chained design request includes `--overview-lang spanish` alongside its existing `--fast-track` behavior and the design worker generates the overview in `spanish`

#### Scenario: Unselected language preserves the existing chain

- **WHEN** a supervised explore run starts the pipeline without `--overview-lang`
- **THEN** the chained design request contains no language flag, retains existing chaining behavior, and the design worker defaults overview generation to English

### Requirement: Do not persist language across isolated chats

The normal non-supervised explore flow SHALL not persist or inject an overview language into a later isolated `sai-2-design` invocation. Users SHALL provide the flag again when starting a separate design invocation or requesting a later localized regeneration.

#### Scenario: Normal explore transition does not carry language

- **WHEN** an explore invocation uses `--overview-lang spanish` without `start-pipeline` and the user later starts `sai-2-design` in a new isolated chat without the flag
- **THEN** the later design invocation has no Spanish language state and defaults overview generation to English

#### Scenario: No persisted language field is created

- **WHEN** a supervised or isolated explore invocation uses `--overview-lang spanish`
- **THEN** no `overview.language` or equivalent language preference is written to `.openspec.yaml` or any other change artifact

#### Scenario: Failed or cancelled design retry requires the flag again

- **WHEN** a supervised design phase fails or is cancelled and a later invocation retries the pipeline
- **THEN** the later invocation does not reuse the earlier language and must supply `--overview-lang <language>` again to request localization
