# feedback-gate-provenance-correction Specification

## Purpose

TBD — capability introduced by the retired orphan-inline-callers change.

## Requirements

### Requirement: Gate provenance names the live fetchers

`sai/policies/artifact-feedback-gate.md` SHALL state that it is fetched by `sai/commands/spec/coordinator.md` and `sai/commands/design/coordinator.md`, and SHALL NOT name `sai/commands/sai-1-spec.md`, `sai/commands/sai-2-design.md`, or any other deleted command body as a fetcher.

#### Scenario: The fetcher sentence names exactly the two coordinators

- **WHEN** the gate policy's fetcher provenance sentence is read
- **THEN** it names `sai/commands/spec/coordinator.md` and `sai/commands/design/coordinator.md`
- **AND** it names no deleted command body

#### Scenario: The named fetchers really fetch the gate

- **WHEN** the fetch sites of `@sai/policies/artifact-feedback-gate.md` are enumerated across maintained sources
- **THEN** `sai/commands/spec/coordinator.md` and `sai/commands/design/coordinator.md` are among the fetchers
- **AND** no deleted command body fetches the gate
