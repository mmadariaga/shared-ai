# design-steps-library Specification

## Purpose
TBD - created by archiving change design-step-gated-instructions. Update Purpose after archive.

## Requirements

### Requirement: Design step instruction library for /sai-2-design

The design worker's instruction mass SHALL be split into exactly six step files under `sai/commands/design/steps/` — `common.md` plus `research.md`, `design.md`, `tasks.md`, `interfaces.md`, and `overview.md` — carved so cuts follow progress-plan step ids rather than physical file order, with interleaved sections attached to the milestone they serve. Each progress-plan step SHALL have one dedicated instruction file delivered just-in-time. The library SHALL contain no `review.md`.

#### Scenario: each step has exactly one instruction file

- **WHEN** the coordinator delivers a step pointer for `research`, `design`, `tasks`, `interfaces`, or `overview`
- **THEN** loading that step's file alone provides the complete instruction stretch for that step, with run-long boundaries supplied by `common.md`

### Requirement: common.md is the always-active step surface for design

`sai/commands/design/steps/common.md` SHALL be fetched at dispatch and stay in force for the entire run, carrying the step-delivery meta-rule, generation scope, artifact-only scope, collaboration style, cost-and-budget discipline summary, and the glossary-format and remember policy fetches. It SHALL NOT fetch `sai/policies/sai-learnings-format.md`; that policy loads in the tasks step at its point of use.

#### Scenario: dispatch loads common.md once

- **WHEN** the design worker is dispatched
- **THEN** its initial surface includes the worker contract plus `sai/commands/design/steps/common.md`, with every other step path arriving solely through coordinator continuation lines

### Requirement: The overview step file reinforces the pinned worker-card mechanics

`sai/commands/design/steps/overview.md` SHALL be the normative home of the overview lifecycle — language transport, first materialization, regeneration, parent-authored failures, diagnostics persistence, bounded recovery, the Overview state machine, and the Generator failure-kind mapping — and SHALL reach the worker through the `overview` pointer or through a continuation that names the file explicitly; the overview step SHALL fire only on the opted-in plan where the raw `--overview-lang` token is present and valid.

#### Scenario: opted-in overview activation follows the card

- **WHEN** the opted-in plan activates the `overview` step
- **THEN** the worker follows `steps/overview.md` as the complete normative body of the overview lifecycle

### Requirement: The design worker card keeps only the source-write overview rules

`sai/commands/design/worker.md` SHALL carry only the overview rules that fire during any source write — Stale-before-first-write, the run-start no-effective-change capture, and plan gating — plus a pointer to `sai/commands/design/steps/overview.md`. It SHALL NOT carry the overview lifecycle body or the Overview state machine and Generator failure-kind mapping tables.

#### Scenario: base-variant edit over a current overview marks stale without the overview step

- **WHEN** a run without `--overview-lang` edits `design.md`, `tasks.md`, or `interfaces.md` over an existing `overview.state: current`
- **THEN** the worker marks `overview.state: stale` before the first write per the worker card, without loading `steps/overview.md`, and does not regenerate

#### Scenario: no effective change keeps the prior overview state

- **WHEN** a run ends with the five source sets byte-identical to their run-start capture
- **THEN** the worker keeps the prior overview state using the capture taken at run start per the worker card

### Requirement: The generation-trigger continuation names the overview step file

The design coordinator's `Continue` generation-trigger continuation SHALL begin with the first line `Follow @sai/commands/design/steps/overview.md`, so the overview lifecycle loads even when the `overview` pointer was not delivered.

#### Scenario: generation trigger without the overview pointer

- **WHEN** the feedback gate proceeds with a valid `--overview-lang` and the worker was not given the `overview` pointer
- **THEN** the generation-trigger continuation's first line names `@sai/commands/design/steps/overview.md`
