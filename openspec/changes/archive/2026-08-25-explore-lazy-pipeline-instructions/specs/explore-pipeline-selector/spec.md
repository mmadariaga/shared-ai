# explore-pipeline-selector Specification

## MODIFIED Requirements

### Requirement: Emit the crystallization-close selector

`sai-explore` SHALL emit exactly one harness-native selector after the shared keep-window-open recommendation, with options in fixed order: `Auto`, `Auto (fast implementation)`, and `Manual`, each retaining its existing one-line description and localized presentation rules. The selector SHALL remain the final emission of the crystallization turn. The selector contract SHALL be delivered from `sai/commands/explore/steps/pipeline-selector.md`, fetched only after the complete shared recommendation sentence.

#### Scenario: the split selector closes crystallization

- **WHEN** a single-change, sliced, or inline-refusal crystallization turn reaches its close
- **THEN** the shared recommendation is emitted once, `pipeline-selector.md` is fetched, and exactly one fixed-order three-option selector is emitted as the final turn output

### Requirement: Route selected pipeline options through deferred contracts

`sai-explore` SHALL preserve the existing selection semantics: `pipeline-selector.md` SHALL fetch both `steps/pipeline-auto-supervised.md` and `steps/pipeline-auto-fast.md` after the complete selector contract is reached and before option selection is processed; dispatch SHALL remain exclusive to an explicit `Auto` or `Auto (fast implementation)` selection; and `Manual` and unmapped responses SHALL dispatch nothing. The Auto route SHALL retain the supervised sai-1/sai-2 lifecycle, and the Auto (fast implementation) route SHALL retain the fixed eight-step flow and existing worker boundaries.

#### Scenario: deferred route fetches preserve dispatch boundaries

- **WHEN** the crystallization-close selector is reached and the user selects Auto, Auto (fast implementation), or Manual
- **THEN** both route contracts have been fetched from the selector trigger, only the explicitly selected Auto route dispatches, and Manual performs no dispatch

### Requirement: Preserve deterministic auto-fast continuation

After a clean auto-fast slice completion, `sai-explore` SHALL retain the existing selector re-entry behavior for pending slices, preserve crystallization order, exclude completed changes, and defer terminal navigation until no pending slice remains. Moving the auto-fast text into `pipeline-auto-fast.md` SHALL NOT change these state or authorization rules.

#### Scenario: pending slices retain explicit authorization

- **WHEN** an auto-fast slice completes cleanly while another crystallized slice remains pending
- **THEN** the complete three-option selector is presented again for the pending slice without dispatching a worker from the transition
