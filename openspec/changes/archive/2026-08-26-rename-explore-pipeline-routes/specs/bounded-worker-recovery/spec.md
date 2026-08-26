## MODIFIED Requirements

### Requirement: Preserve Plan cancellation recovery

The bounded worker-recovery policy SHALL refer to the selector-dispatched Plan (unattended) item-10 exception and SHALL preserve its no-replacement, same-worker, retryable behavior.

#### Scenario: Plan recovery cannot continue

- **WHEN** Plan diagnosis cannot deliver its actionable continuation
- **THEN** the existing continuation-loss result remains terminal for the attempt and the change remains retryable.
