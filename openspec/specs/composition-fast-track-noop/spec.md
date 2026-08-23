# composition-fast-track-noop Specification

## Purpose

Defines the behavioral no-op treatment of an explicit `--fast-track` token in the `/sai-review` composition, which strips the token without becoming a fast-track parser member.

## Requirements

### Requirement: Explicit --fast-track is a behavioral no-op

`/sai-review` SHALL strip every `--fast-track` token from the selected `arguments_value` before change resolution, in any token order. Stripping SHALL NOT make `/sai-review` a fast-track mode, SHALL NOT activate a review-local fast-track mode, and SHALL NOT change phase order, injection, or gates. `/sai-review` SHALL own no questions of its own; interaction exists only where a segment worker returns `needs_input`. The happy path is fully deterministic.

#### Scenario: Fast-track token is stripped without effect
- **WHEN** a user runs `/sai-review {name} --fast-track` in any token order
- **THEN** the token SHALL be removed before change resolution, no fast-track banner SHALL be printed, and phase order, injection, and gates SHALL behave exactly as without the token
