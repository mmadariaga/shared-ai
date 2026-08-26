## MODIFIED Requirements

### Requirement: Name supervised route identity

The supervised pipeline SHALL use `Plan (unattended)` and route identity `plan-unattended` for the existing sai-1/sai-2 supervision, review, chaining, and retry lifecycle. The direct build route SHALL use `Build (unattended)` and route identity `build-unattended` for its separate worker flow.

#### Scenario: supervised selection is classified

- **WHEN** a delegated route is selected
- **THEN** the existing supervision lifecycle uses the applicable new route identity without changing worker order or state behavior.
