# spec-steps-library Specification

## Purpose
TBD - created by archiving change spec-step-gated-instructions. Update Purpose after archive.
## Requirements
### Requirement: Six-file step instruction library for sai-1-spec

The sai-1-spec worker's instruction mass SHALL be split into exactly six step files under `sai/commands/spec/steps/` — `common.md` plus `research.md`, `proposal.md`, `specs.md`, `validation.md`, and `review.md` — carved from the former monolithic sources so that each progress-plan step has one dedicated instruction file delivered just-in-time. The distribution SHALL follow the implemented boundaries: `common.md` carries artifact-only scope with forbidden writes, collaboration-style essentials, a cost-and-budget discipline summary, the glossary-format and remember policy fetches, the question-policy reference, and the step-delivery meta-rule; `research.md` carries the structured research guide, the approximately 80% confidence boundary, the Ready-to-Propose Research-Leads consumption rules, and the budget-explorer delegation specifics; `proposal.md` carries the openspec-propose skill fetch and the `proposal.md` template write and SHALL NOT contain the Complexity Derivation Rubric; `specs.md` carries the delta-spec writes and immediate root `GLOSSARY.md` appends; `validation.md` carries pre-completion verification, Rule #1 proposal-to-spec self-consistency, Rule #2 source-grounding of spec-pinned literals, the shared warning block, the Complexity Derivation Rubric S1–S5, and decision-summary derivation; `review.md` carries the externally-supplied-findings consumption contract and its no-findings fast path.

#### Scenario: each step has exactly one instruction file

- **WHEN** the coordinator delivers a step pointer for `research`, `proposal`, `specs`, `validation`, or `review`
- **THEN** loading that step's file alone provides the complete instruction stretch for that step, with run-long boundaries supplied by `common.md`

#### Scenario: complexity rubric lives outside the proposal step

- **WHEN** the worker executes the `proposal` step file
- **THEN** it finds the openspec-propose skill fetch and proposal-template write instructions but no Complexity Derivation Rubric, because the token is derived during the validation step from finished artifacts

### Requirement: common.md is the always-active step surface

`sai/commands/spec/steps/common.md` SHALL be fetched by the worker card at dispatch and kept in force for the entire run, carrying every boundary that outlive any single step, including the meta-rule that the coordinator names each active step via an `Active step:` pointer line on progress continuations and that the worker MUST NOT prefetch any other step file.

#### Scenario: dispatch loads common.md once

- **WHEN** the spec-proposal worker is dispatched
- **THEN** its fixed fetches are verified-precondition-handback, worker-core, and `sai/commands/spec/steps/common.md`, with no other step file referenced by the worker contract

#### Scenario: step paths arrive solely through continuations

- **WHEN** the worker needs the next instruction stretch before any continuation has arrived
- **THEN** it cannot obtain a step-file path anywhere in its initial surface, making prefetch impossible by design

