# composition-fast-track-noop Specification

## Purpose

Defines the behavioral no-op treatment of an explicit `--fast-track` token in the `/sai-review` composition, which strips the token without becoming a fast-track parser member.

## Requirements

### Requirement: Explicit --fast-track is a behavioral no-op

`/sai-deep-review` SHALL drop every `--fast-track` token from `arguments_value` silently, in any token order, before it parses the options, because the command already runs with no human in the loop. Dropping it SHALL NOT activate a fast-track mode, print a banner, or change segment order or gates. The only questions the run can ask SHALL be the accessibility dev-server URL input, an audit worker question that nothing answers and whose answer would change the report, and the escalation of an obstacle in the review or fix segment.

#### Scenario: Fast-track token is stripped without effect
- **WHEN** a user runs `/sai-deep-review {name} --fast-track` in any token order
- **THEN** the token SHALL be dropped before the options are parsed, no fast-track banner SHALL be printed, and the segments and gates SHALL behave exactly as without the token
