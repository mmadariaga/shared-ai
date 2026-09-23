# sai-build-command Specification

## Purpose
Provide a routed implement-then-apply composition command for one OpenSpec change.

## Requirements

### Requirement: Build is a routed two-phase composition coordinator
The `/sai-build` command SHALL use one ordinary routed coordinator card and the shared chained composition contract, declaring exactly implementation at position 0 and apply at position 1. It SHALL not use explore supervision, conversation-held dispatch state, a new orchestration primitive, or a build-only design approval gate.

#### Scenario: Build card declares implement then apply
- **WHEN** `/sai-build` starts
- **THEN** the shared runner executes implementation before apply

### Requirement: Change resolution and envelopes are shared
The coordinator SHALL resolve the change exactly once using the sole non-empty `arguments_value` source and the standard picker, retain the resolved name, and mint the implement and apply segment arguments without a wrapper-echo field. Neither segment SHALL re-enter boot, wrappers, change-picker, or already-satisfied prerequisites.

#### Scenario: Both phases receive one resolved name
- **WHEN** resolution yields `{name}`
- **THEN** both phase requests carry `{name}` and apply carries fast-track true
- **AND** neither phase request contains a wrapper-echo field

### Requirement: Build strips residual fast-track tokens before resolution
Before resolution, every `--fast-track` token SHALL be removed from the selected `arguments_value` source in any order. This SHALL not make build a fifth parser or create build-local fast-track state.

#### Scenario: Flag is absent from picker input
- **WHEN** `/sai-build --fast-track oauth2-auth` is invoked
- **THEN** resolution receives only `oauth2-auth`

### Requirement: Successful implement transitions immediately
A completed non-final implement segment SHALL communicate its summary and changed-files union, then activate only the consecutive apply adapter without printing standalone implement completion text or an intermediate approval gate.

#### Scenario: No intermediate gate
- **WHEN** implement completes successfully under build
- **THEN** apply activates immediately and no standalone `/sai-4-apply` invitation is printed

### Requirement: Apply fast-track is injected and composition-owned
Apply SHALL receive fast-track true unconditionally when activated. The build coordinator SHALL print `> FAST-TRACK MODE ACTIVE` exactly once at apply activation and zero times when apply never starts. Injected fast-track SHALL retain commit pre-authorization, non-detached branch auto-stay, and all safe-operations and other non-removable stops; detached HEAD SHALL retain its three-option branch prompt. Injected fast-track SHALL NOT defer a combined Human Verification report and SHALL NOT change functional-check handling.

#### Scenario: Apply activation prints one banner
- **WHEN** build transitions to apply
- **THEN** the coordinator prints the exact banner once and apply does not print a second shell banner

#### Scenario: Failed phase one has no banner
- **WHEN** implement returns `failed` or `cancelled`
- **THEN** apply is not activated and the banner is not printed

#### Scenario: Injected fast-track keeps only its two opt-outs
- **WHEN** build activates apply with fast-track injected
- **THEN** commit pre-authorization and branch auto-stay apply while functional checks follow the ordinary terminal functional review path with no deferred combined list

### Requirement: Phase-one failure blocks apply
Failed or cancelled implementation SHALL close the invocation without RED/GREEN dispatch, apply completion, or a successful transition.

#### Scenario: Failed implement stops build
- **WHEN** implement returns `failed`
- **THEN** build reports the failure and does not activate apply

### Requirement: Re-entry uses implement collapse
Re-entry after interruption or partial apply SHALL run the implement `collapse-implemented-steps` step again. APPLIED, VERIFY-PENDING, and INCOMPLETE SHALL retain their existing meanings; build SHALL never resume apply directly.

#### Scenario: Incomplete re-entry blocks apply
- **WHEN** implement classifies a prior step as INCOMPLETE
- **THEN** implement stops and apply does not activate

### Requirement: Apply stops and worker isolation remain unchanged
Build SHALL preserve routing-tree STOP, GREEN-conflict STOP, three-attempt recovery exhaustion, pending-work stops, safe-operations confirmations, RED blindness to GREEN, and GREEN's test-file prohibition. It SHALL dispatch only existing implement and RED/GREEN workers and shall not add a build worker or matrix entry.

#### Scenario: Non-removable stop prevents completion
- **WHEN** apply reaches a retained stop
- **THEN** build ends without successful final completion and checkbox state remains the recovery record

### Requirement: Final navigation is apply completion
When apply completes successfully as the final segment, build SHALL print exactly `Implementation applied. Run \`/sai-5-review {name}\` in a new chat when ready.` and shall not chain another phase.

#### Scenario: Successful build closes at review navigation
- **WHEN** both segments complete and apply gates pass
- **THEN** the pinned apply completion message is printed

### Requirement: Fast-track Human Verification is a report
Under injected fast-track, functional checks SHALL be handled exactly as without fast-track: apply's terminal functional review marks the checks it verified and reports the rest as pending human review in the ordinary terminal print cluster. There SHALL be no approval gate and no separate fast-track deferred list.

#### Scenario: Human checks do not block final completion
- **WHEN** Final sweep completes with functional checks the review could not verify
- **THEN** those checks are reported as pending human review in the ordinary print cluster without blocking completion

### Requirement: Large plans are accepted and changed files span phases
Build SHALL declare no Step-count ceiling and SHALL preserve one ordered duplicate-free changed-files union across implement and apply.

#### Scenario: Union survives transition
- **WHEN** both phases report changed paths
- **THEN** implement paths remain and apply paths append in first-seen order
