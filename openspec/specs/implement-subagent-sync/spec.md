# implement-subagent-sync Specification

## ADDED Requirements

### Requirement: Implement Step 1b subagent SHALL complete before any subsequent task executes

When `/sai-3-implement` executes Step 1b (detect already-applied steps) via a subagent, the main agent SHALL wait for the subagent to finish before continuing with any other task. This prevents race conditions where the main agent proceeds before the rerun guard analysis is complete.

#### Scenario: Step 1b subagent finishes

- **WHEN** `/sai-3-implement` runs Step 1b in a subagent
- **THEN** the main agent waits for the subagent output before proceeding to Step 2 or any subsequent task

#### Scenario: Step 1b subagent still running

- **WHEN** the subagent for Step 1b has not yet returned results
- **THEN** the main agent MUST NOT proceed to any other step or task
