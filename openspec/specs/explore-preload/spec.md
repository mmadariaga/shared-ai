# explore-preload Specification

## Purpose
TBD - created by archiving change fix-explore-preload-contradiction. Update Purpose after archive.
## Requirements
### Requirement: Single owner for the explore spec-worker preload

The explore flow SHALL load the spec-worker binding exactly once from the shared explore bootstrap, and neither harness explore wrapper SHALL preload it.

#### Scenario: Wrappers delegate preload to the bootstrap

- **WHEN** the explore command starts on either harness
- **THEN** the spec-worker binding is provided once via `sai/commands/explore/command-bootstrap.md` with no wrapper-level duplicate

### Requirement: Step-file scope for the explore boot preload statement

The explore body SHALL state that Boot preloads only the explore instruction pack plus the stage machine for step files, and SHALL direct readers to the wrapper and bootstrap for worker-binding ownership.

#### Scenario: Reader resolves preload ownership without contradiction

- **WHEN** a reader compares the wrapper, bootstrap, and body preload statements
- **THEN** the body wording scopes itself to step files and names the wrapper and bootstrap as binding owners

### Requirement: Explore bootstrap continuation sentence

The explore command bootstrap SHALL declare that execution continues with the card selected by the harness boot adapter.

#### Scenario: Continuation is explicit without inference

- **WHEN** the shared explore bootstrap finishes preloading its bindings
- **THEN** the next execution owner is stated as the harness boot adapter selected card

