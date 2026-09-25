# implement-subagent-sync Specification

## Purpose

Keep the `/sai-3-implement` re-run guard's subagent result authoritative before any later work starts.

## Requirements
### Requirement: The re-run guard subagent SHALL complete before any subsequent task executes

When `/sai-3-implement` executes the `collapse-implemented-steps` step via a subagent, the worker SHALL wait for the subagent to finish before continuing with any other task. This prevents race conditions where the worker proceeds before the re-run guard analysis is complete.

#### Scenario: re-run guard subagent finishes

- **WHEN** `/sai-3-implement` runs the `collapse-implemented-steps` step in a subagent
- **THEN** the worker waits for the subagent's report before reporting the step or starting any subsequent task

#### Scenario: re-run guard subagent still running

- **WHEN** the re-run guard subagent has not yet returned results
- **THEN** the worker MUST NOT proceed to any other step or task
