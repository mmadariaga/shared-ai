# explore-technical-uncertainty-assessment Specification

## Purpose
TBD

## Requirements

### Requirement: Technical uncertainty is assessed at the close of stage 1, never in the slicing assessment

The technical-uncertainty axis SHALL be evaluated at the close of the `Explore change` stage and SHALL NOT be part of the pre-crystallization slicing assessment. `sai/commands/explore/steps/slicing-assessment.md` SHALL state that it does not assess technical uncertainty and SHALL name the POC lane as the owner of that axis. The axis SHALL remain orthogonal to size and friction: size asks whether the change is too big, friction asks whether the integration site is hostile, and uncertainty asks whether competing candidates must be discriminated before the idea's details can be fixed. Because the axis is resolved before `Review edge cases` and the POC is discarded by abandoning its isolation, the size and integration-point friction judgments SHALL always evaluate the original repository, and no post-POC re-assessment SHALL run.

#### Scenario: the slicing assessment does not evaluate uncertainty

- **WHEN** the progression enters the `Crystallize` stage and the slicing assessment runs
- **THEN** it runs the size and friction judgments only and evaluates no technical-uncertainty axis

#### Scenario: size and friction judge an uncontaminated repository

- **WHEN** a POC ran earlier in the progression and the slicing assessment later runs
- **THEN** size and friction evaluate the repository as it was before the POC, with no re-assessment step
