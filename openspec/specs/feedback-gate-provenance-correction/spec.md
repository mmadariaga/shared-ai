# feedback-gate-provenance-correction Specification

## Purpose

TBD — capability introduced by the retired orphan-inline-callers change.

## Requirements

### Requirement: Attribute supervised feedback to Plan

Supervised artifact-feedback processing SHALL identify its selector-dispatched route as Plan (unattended) and SHALL preserve existing finding provenance, correction, continuation, and worker-ownership rules.

#### Scenario: supervised feedback is recorded

- **WHEN** a Plan worker receives artifact feedback
- **THEN** the existing feedback contract applies without changing provenance or correction behavior.

### Requirement: Gate provenance names the live fetchers

`sai/policies/artifact-feedback-gate.md` SHALL state that it is fetched by `sai/commands/spec/coordinator.md`, `sai/commands/design/coordinator.md`, and — at **Auto** dispatch — `sai-explore`'s supervised pipeline (`sai/commands/explore/instructions.md` item 10), and SHALL NOT name `sai/commands/sai-1-spec.md`, `sai/commands/sai-2-design.md`, or any other deleted command body as a fetcher.

#### Scenario: The fetcher sentence names exactly the live fetchers

- **WHEN** the gate policy's fetcher provenance sentence is read
- **THEN** it names `sai/commands/spec/coordinator.md`, `sai/commands/design/coordinator.md`, and the supervised explore pipeline
- **AND** it names no deleted command body

#### Scenario: The named fetchers really fetch the gate

- **WHEN** the fetch sites of `@sai/policies/artifact-feedback-gate.md` are enumerated across maintained sources
- **THEN** `sai/commands/spec/coordinator.md`, `sai/commands/design/coordinator.md`, and `sai/commands/explore/instructions.md` (item 10, at **Auto** dispatch) are among the fetchers
- **AND** no deleted command body fetches the gate
