# prompt-display Specification

## Purpose
TBD - created by archiving change replace-emitted-on-with-validated-at. Update Purpose after archive.
## Requirements
### Requirement: The coordinator surfaces observation time in its prompt
The coordinator SHALL forward the validator verdict verbatim and SHALL surface validated_at in its prompt for terminal and progress results at minimum. It SHALL NOT invent, correct, re-derive, or reformat the value.

#### Scenario: Terminal and progress prompts show observation time
- **WHEN** the coordinator receives a valid terminal or progress verdict
- **THEN** its prompt displays that verdict's validated_at without alteration

### Requirement: The coordinator issues no wall-clock call
The coordinator SHALL issue no wall-clock call of any kind and SHALL perform no timezone resolution or conversion. Zone handling SHALL live in the validator tool and reception time SHALL serve as the duration proxy.

#### Scenario: Prompt rendering uses the verdict value directly
- **WHEN** the coordinator renders a prompt or stamp from a verdict
- **THEN** it reads HH:mm straight off validated_at with no conversion or fallback

