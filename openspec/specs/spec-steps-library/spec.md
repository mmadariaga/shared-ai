# spec-steps-library Specification

## Purpose
Split the `sai-1-spec` worker's instruction mass into one step file per progress-plan step, delivered just-in-time by coordinator pointers, with run-long rules in an always-active `common.md`.
## Requirements
### Requirement: Six-file step instruction library for sai-1-spec

The sai-1-spec worker's instruction mass SHALL be split into exactly six step files under `sai/commands/spec/steps/` — `common.md` plus `research.md`, `proposal.md`, `specs.md`, `validation.md`, and `review.md` — carved from the former monolithic sources so that each progress-plan step has one dedicated instruction file delivered just-in-time. The distribution SHALL follow the implemented boundaries: `common.md` carries the author role and the `SpecWriteSurface` reference, the question policy, the immediate root `GLOSSARY.md` write rule, the glossary-format, remember, and budget-skill fetches, the step-delivery meta-rule, the full main-agent cost discipline, and verification — the artifact checklist, Rule #1 proposal-to-spec self-consistency, and Rule #2 source-grounding of spec-pinned literals — because validation, review findings, artifact feedback, and recovery corrections all re-run it; `research.md` carries the structured research guide, the approximately 80% confidence boundary, and the Ready-to-Propose handoff consumption rules; `proposal.md` carries the openspec-propose skill fetch, the subset of that skill's mechanics the step uses, the phase overrides of the rest of the skill, and the `proposal.md` write, and SHALL NOT contain the Complexity Derivation Rubric; `specs.md` carries the delta-spec writes; `validation.md` carries the verification run, the cited-path gate, the Complexity Derivation Rubric S1–S5, and the `## Completion` decision-summary and validation-report contract; `review.md` carries the externally-supplied-findings consumption contract and its no-findings fast path.

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
- **THEN** its fixed fetches are verified-precondition-handback, worker-core, bounded-dispatch-retry, the spec phase contract, and `sai/commands/spec/steps/common.md`, with no other step file referenced by the worker contract

#### Scenario: step paths arrive solely through continuations

- **WHEN** the worker needs the next instruction stretch before any continuation has arrived
- **THEN** it cannot obtain a step-file path anywhere in its initial surface, making prefetch impossible by design

