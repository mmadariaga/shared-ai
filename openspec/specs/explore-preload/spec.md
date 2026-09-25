# explore-preload Specification

## Purpose
TBD - created by archiving change fix-explore-preload-contradiction. Update Purpose after archive.
## Requirements
### Requirement: Single owner for the explore spec-worker binding load

The explore flow SHALL load the spec-worker binding exactly once, at the Plan - Unattended dispatch point in `sai/commands/explore/steps/pipeline-plan-unattended.md`; neither harness explore wrapper nor the shared explore bootstrap SHALL preload it.

#### Scenario: The Plan route owns the binding load

- **WHEN** the explore command starts on either harness
- **THEN** no worker binding is loaded until a Plan - Unattended selection reaches `pipeline-plan-unattended.md`, which fetches the spec-worker binding once

### Requirement: Step-file scope for the explore boot preload statement

The explore instructions SHALL state that every step file other than `steps/common.md` loads only when a returned `next.follow` names it, and SHALL direct readers to the pipeline step files for worker-binding loads.

#### Scenario: Reader resolves preload ownership without contradiction

- **WHEN** a reader compares the wrapper, bootstrap, and body preload statements
- **THEN** the body wording scopes itself to step files and names the pipeline step files as the binding load points

### Requirement: Explore bootstrap continuation sentence

The explore command bootstrap SHALL declare that execution continues with the card selected by the harness boot adapter.

#### Scenario: Continuation is explicit without inference

- **WHEN** the shared explore bootstrap is read
- **THEN** the next execution owner is stated as the harness boot adapter selected card

