## MODIFIED Requirements

### Requirement: One canonical utility wrapper exists per harness

The repository SHALL provide exactly one canonical `/sai-retire-docs` wrapper for Claude Code and exactly one for opencode. Each wrapper SHALL delegate to its harness boot adapter and forward the invocation arguments without reinterpretation.

#### Scenario: Both wrappers select the utility body

- **WHEN** `/sai-retire-docs` is invoked through either supported harness
- **THEN** the corresponding wrapper SHALL route to the shared retire-docs command card with the original arguments

### Requirement: Utility model routing is declared per harness

The Claude Code wrapper SHALL declare its utility model and the opencode wrapper SHALL declare its opencode model routing without introducing a routed worker lifecycle.

#### Scenario: Utility execution remains main-session work

- **WHEN** the retirement utility is launched
- **THEN** the selected wrapper SHALL execute the main-session utility card rather than dispatching a managed phase worker
