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
The coordinator SHALL resolve the change exactly once using wrapper-echo precedence and the standard picker, retain the resolved name, and mint the implement envelope with an empty echo and the apply chained envelope with the same name and injected fast-track true. Neither segment SHALL re-enter boot, wrappers, change-picker, or already-satisfied prerequisites.

#### Scenario: Both phases receive one resolved name
- **WHEN** resolution yields `{name}`
- **THEN** both phase envelopes carry `{name}` and apply carries fast-track true

### Requirement: Build strips residual fast-track tokens before resolution
Before resolution, every `--fast-track` token SHALL be removed from the selected non-empty echo or arguments source in any order. This SHALL not make build a fifth parser or create build-local fast-track state.

#### Scenario: Flag is absent from picker input
- **WHEN** `/sai-build --fast-track oauth2-auth` is invoked
- **THEN** resolution receives only `oauth2-auth`

### Requirement: Successful implement transitions immediately
A completed non-final implement segment SHALL communicate its summary and changed-files union, then activate only the consecutive apply adapter without printing standalone implement completion text or an intermediate approval gate.

#### Scenario: No intermediate gate
- **WHEN** implement completes successfully under build
- **THEN** apply activates immediately and no standalone `/sai-4-apply` invitation is printed

### Requirement: Apply fast-track is injected and composition-owned
Apply SHALL receive fast-track true unconditionally when activated. The build coordinator SHALL print `> FAST-TRACK MODE ACTIVE` exactly once at apply activation and zero times when apply never starts. Injected fast-track SHALL retain commit pre-authorization, non-detached branch auto-stay, deferred combined Human Verification, and all safe-operations and other non-removable stops; detached HEAD SHALL retain its three-option branch prompt.

#### Scenario: Apply activation prints one banner
- **WHEN** build transitions to apply
- **THEN** the coordinator prints the exact banner once and apply does not print a second shell banner

#### Scenario: Failed phase one has no banner
- **WHEN** implement returns `failed` or `cancelled`
- **THEN** apply is not activated and the banner is not printed

### Requirement: Phase-one failure blocks apply
Failed or cancelled implementation SHALL close the invocation without RED/GREEN dispatch, apply completion, or a successful transition.

#### Scenario: Failed implement stops build
- **WHEN** implement returns `failed`
- **THEN** build reports the failure and does not activate apply

### Requirement: Re-entry uses implement collapse
Re-entry after interruption or partial apply SHALL run implement Step 1b collapse again. COMPLETO, FALLO MENOR, and INCOMPLETO SHALL retain their existing meanings; build SHALL never resume apply directly.

#### Scenario: Incomplete re-entry blocks apply
- **WHEN** collapse classifies a step as INCOMPLETO
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
Under injected fast-track, Human Verification items SHALL be accumulated and presented as one combined post-commit report after Final sweep, not as an approval gate.

#### Scenario: Human checks do not block final completion
- **WHEN** Final sweep completes with deferred human checks
- **THEN** the combined list is reported without blocking solely for approval

### Requirement: Large plans are accepted and changed files span phases
Build SHALL declare no Step-count ceiling and SHALL preserve one ordered duplicate-free changed-files union across implement and apply.

#### Scenario: Union survives transition
- **WHEN** both phases report changed paths
- **THEN** implement paths remain and apply paths append in first-seen order
