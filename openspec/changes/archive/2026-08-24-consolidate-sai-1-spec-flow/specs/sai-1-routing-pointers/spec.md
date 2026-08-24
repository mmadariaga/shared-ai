## MODIFIED Requirements

### Requirement: Independent visual plans and pointer maps

The shared command runner SHALL treat a visual `progress_plan` and a `step_pointer_map` as independent declarations, and a routing-only map SHALL NOT create a task list or milestone stamp.

#### Scenario: Explore suppresses visual progress rendering

- **WHEN** a supervised adapter declares the sai-1 pointer map without a visual progress plan
- **THEN** the runner SHALL route active-step pointers without rendering a second spec task list or milestone stamps.

### Requirement: Deterministic active-step continuation

A mapped progress continuation SHALL carry the first unmarked mapped step in canonical map order, while feedback and recovery continuations SHALL carry no pointer line.

#### Scenario: A mapped progress event completes one step

- **WHEN** a sai-1 progress event marks a mapped step
- **THEN** the next progress continuation SHALL carry the deterministic `Active step:` pointer for the next unmarked mapped step.
