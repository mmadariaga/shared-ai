## MODIFIED Requirements

### Requirement: Emit the renamed crystallization-close selector

`sai-explore` SHALL emit exactly one harness-native selector after the shared keep-window-open recommendation and SHALL make it the final crystallization-turn emission. The selector MUST contain exactly three options in fixed order: Plan (unattended), Build (unattended), and Manual. Their stable identities SHALL be `plan-unattended`, `build-unattended`, and `manual`, and retired identities SHALL NOT be accepted as aliases. Labels and descriptions SHALL localize while command literals remain English.

#### Scenario: renamed selector closes crystallization

- **WHEN** a crystallization turn reaches its close
- **THEN** exactly one fixed-order selector presents Plan (unattended), Build (unattended), and Manual after the shared recommendation.

### Requirement: Preserve Plan (unattended) behavior

Selecting Plan (unattended) SHALL dispatch only the existing supervised sai-1 and sai-2 workers, preserve their worker-owned scopes and review lifecycle, and stop before sai-3 or code implementation.

#### Scenario: Plan stops before implementation

- **WHEN** Plan (unattended) completes its supervised sai-1 and sai-2 lifecycle
- **THEN** it emits the existing `/sai-build` handoff without dispatching an implementation phase.

### Requirement: Preserve Build (unattended) behavior

Selecting Build (unattended) SHALL preserve the direct implementation, functional-fix, backfill, archive, and exactly-one-local-commit order. Its route identity SHALL be `build-unattended`, and its panel projection SHALL contain only Build/Implement, Backfill, and Archive.

#### Scenario: Build uses the existing closed flow

- **WHEN** Build (unattended) is selected for an eligible slice
- **THEN** the existing eight-step build flow remains authoritative without re-entering `/sai-build`.

### Requirement: Preserve Manual and fast-track gates

Selecting Manual or an unmapped response SHALL use route identity `manual`, dispatch no worker, change no supervision state, and emit the existing path-specific `/sai-1-spec` handoff once. `--fast-track` MUST NOT select or suppress the selector.

#### Scenario: Manual remains non-dispatching

- **WHEN** Manual or an unmapped response is received
- **THEN** only the existing handoff is emitted and later execution remains an explicit user action.

### Requirement: Preserve slice selection and retry behavior

Plan and Build SHALL select only uncompleted names from `last_crystallization_set` in crystallization order, SHALL preserve the existing empty-set, completed-set, single-change, multi-change, and Cancel behavior, and SHALL never discover or reorder repository changes. After a clean Build slice completion with pending slices, the full three-option selector MUST be re-presented as a new per-slice authorization gate. Failed, cancelled, STOP-bearing, coordinator-disproved, or unrecovered results SHALL leave the active route pending and retryable without starting a later route step.

#### Scenario: Build re-enters for a pending slice

- **WHEN** a Build slice completes cleanly while another crystallized slice remains pending
- **THEN** the selector is presented again in fixed order for the pending slice before any new dispatch begins.
