## MODIFIED Requirements

### Requirement: Coordinator-owned progress and result handling

The implementation coordinator SHALL own progress rendering and result validation while remaining blind to implementation artifacts. Technical generation and active-step artifact writes SHALL remain worker-owned.

#### Scenario: Progress result is routed

- **WHEN** the worker returns a progress or terminal lifecycle result
- **THEN** the coordinator renders and validates the result without reading implementation artifacts.
