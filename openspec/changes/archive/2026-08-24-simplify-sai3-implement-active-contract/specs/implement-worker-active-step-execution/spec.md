## MODIFIED Requirements

### Requirement: Active-step instruction authority

The implementation worker SHALL treat `steps/common.md` together with exactly the coordinator-named active step file as the authoritative technical instruction surface for step execution. The worker SHALL NOT prefetch or follow another step instruction file.

#### Scenario: Worker receives an active pointer

- **WHEN** a progress continuation names one active step file
- **THEN** the worker follows the common baseline and that named step file for technical execution.
