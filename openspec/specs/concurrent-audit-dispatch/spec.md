# concurrent-audit-dispatch Specification

## Purpose

Defines the concurrent dispatch and sequential Result Loop processing model for audit segments in the `/sai-review` composition, including isolation of `needs_input` pauses and failure containment.

## Requirements

### Requirement: Soft-parallel audit dispatch with sequential Result Loop processing

When one or more audit segments activate, the composition SHALL dispatch their workers concurrently in one harness-native batch (multiple same-turn `task()` calls on opencode, parallel agent dispatches on Claude Code) and SHALL process their Result Loops sequentially in fixed order: security → performance → accessibility. Each audit SHALL write a disjoint artifact, so concurrency is safe.

#### Scenario: Audits dispatch concurrently and settle in fixed order
- **WHEN** all three audits activate in one invocation
- **THEN** the composition SHALL dispatch the three workers in one batch and SHALL process their Result Loops sequentially in security → performance → accessibility order

### Requirement: A needs_input pauses only its own segment

A `needs_input` returned by one audit SHALL pause only that audit's own segment through the native picker. Multiple pending inputs SHALL process sequentially in the fixed order; no other segment SHALL block on another segment's question.

#### Scenario: One audit's question does not block siblings
- **WHEN** the security audit returns a `needs_input` while performance and accessibility are also activated
- **THEN** only the security segment SHALL pause for the picker, and the performance and accessibility Result Loops SHALL continue processing sequentially

### Requirement: Audit failure or cancellation never aborts siblings

An audit `failed` or `cancelled` outcome SHALL NOT abort sibling audits, retry anything, or re-run the review segment. Per-audit status SHALL appear in the combined terminal report.

#### Scenario: One failed audit does not cancel the others
- **WHEN** the performance audit returns `failed` while security and accessibility are activated
- **THEN** the security and accessibility segments SHALL continue to completion and the combined terminal SHALL show a per-audit outcome line for each
