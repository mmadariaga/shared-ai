# design-steps-library Specification

## Purpose
TBD - created by archiving change design-step-gated-instructions. Update Purpose after archive.
## Requirements
### Requirement: Design step instruction library for /sai-2-design

The design worker's instruction mass SHALL be split into exactly seven step files under `sai/commands/design/steps/` — `common.md` plus `research.md`, `design.md`, `tasks.md`, `interfaces.md`, `review.md`, and `overview.md` — carved so cuts follow progress-plan step ids rather than physical file order, with interleaved sections attached to the milestone they serve. Each progress-plan step SHALL have one dedicated instruction file delivered just-in-time.

#### Scenario: each step has exactly one instruction file

- **WHEN** the coordinator delivers a step pointer for `research`, `design`, `tasks`, `interfaces`, or `review`
- **THEN** loading that step's file alone provides the complete instruction stretch for that step, with run-long boundaries supplied by `common.md`

### Requirement: common.md is the always-active step surface for design

`sai/commands/design/steps/common.md` SHALL be fetched at dispatch and stay in force for the entire run, carrying the step-delivery meta-rule, generation scope, artifact-only scope, collaboration style, cost-and-budget discipline summary, and the glossary-format, sai-learnings-format, and remember policy fetches.

#### Scenario: dispatch loads common.md once

- **WHEN** the design worker is dispatched
- **THEN** its initial surface includes the worker contract plus `sai/commands/design/steps/common.md`, with every other step path arriving solely through coordinator continuation lines

### Requirement: The overview step file reinforces the pinned worker-card mechanics

`sai/commands/design/steps/overview.md` SHALL remain a thin reinforcement file referencing the worker card's "### Overview generation (design-worker-owned lifecycle)" section, which SHALL stay verbatim in `sai/commands/design/worker.md` because the test suite pins those mechanics in the card; the overview step SHALL fire only on the opted-in plan where the raw `--overview-lang` token is present and valid.

#### Scenario: opted-in overview activation follows the card

- **WHEN** the opted-in plan activates the `overview` step
- **THEN** the worker executes the thin reinforcement file and follows the worker card's pinned overview-generation section as the complete normative body
