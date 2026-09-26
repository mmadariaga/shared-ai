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
Both implement and apply SHALL receive fast-track true as invocation-scoped state on activation, outside their request envelopes. The build coordinator SHALL print `> FAST-TRACK MODE ACTIVE` exactly once at implement activation, not at apply activation. Injected fast-track SHALL retain bounded lookup authorization, commit pre-authorization, non-detached branch auto-stay, and all safe-operations and other non-removable stops; detached HEAD SHALL retain its three-option branch prompt. Functional-check handling SHALL remain unchanged.

#### Scenario: Implement activation prints one banner
- **WHEN** build activates implement, with or without an explicit `--fast-track` token
- **THEN** the coordinator prints the exact banner once and apply does not print a second banner

#### Scenario: Failed phase one retains the single banner
- **WHEN** implement returns `failed` or `cancelled` after activation
- **THEN** apply does not activate and no second banner is printed

#### Scenario: Injected fast-track retains bounded grants
- **WHEN** build activates implement and later apply
- **THEN** valid bounded lookup requests are approved by the implement coordinator and local commit authorization is active before apply's first Step
- **AND** branch auto-stay applies only on a non-detached branch while functional checks follow the ordinary terminal review path

#### Scenario: Apply activation prints one banner
- **WHEN** build transitions to apply after implement activation
- **THEN** the single banner printed at implement activation stands and apply prints no second banner

#### Scenario: Failed phase one has no banner
- **WHEN** implement returns `failed` or `cancelled` after activation
- **THEN** apply is not activated and apply prints no banner; the single implement-activation banner stands with no second banner

#### Scenario: Injected fast-track keeps only its two opt-outs
- **WHEN** build activates apply with fast-track injected
- **THEN** commit pre-authorization and branch auto-stay apply (the two apply-segment opt-outs) while functional checks follow the ordinary terminal functional review path with no deferred combined list
- **AND** bounded lookup approval for the implement segment is covered by the companion scenario above

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

Build SHALL preserve routing-tree STOP, GREEN-conflict STOP, three-attempt recovery exhaustion, pending-work stops, safe-operations confirmations, RED blindness to GREEN, and GREEN's test-file prohibition. It SHALL dispatch only existing implement and RED/GREEN workers and shall not add a build worker or matrix entry. When apply reaches recovery-budget exhaustion for an active Step, the apply coordinator SHALL stop before marking, committing, or advancing and SHALL own the exhausted-Step choice. Build SHALL keep that choice and answer on the active apply segment, SHALL not re-present it, SHALL not restart the implement segment, and SHALL not mint a second retry grant. An explicitly authorized retry SHALL cover both apply budgets for the blocked Step and retain earlier attempt history; manual correction or refusal SHALL leave the Step incomplete and Build without successful final completion.

#### Scenario: Non-removable stop prevents completion

- **WHEN** apply reaches a retained stop
- **THEN** build ends without successful final completion and checkbox state remains the recovery record

#### Scenario: Build delegates exhausted-Step recovery to apply

- **WHEN** apply reaches recovery-budget exhaustion for an active Step during Build
- **THEN** the apply coordinator SHALL present the exhausted-Step choice while Build adds no second prompt, grant, or implementation restart

#### Scenario: Authorized Build retry resumes only apply

- **WHEN** the user authorizes one fresh attempt for the blocked apply Step inside Build
- **THEN** Build SHALL resume only that apply Step with one paired fresh budget grant and SHALL retain the completed implement segment and earlier attempt history

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

### Requirement: Implementation coordinator decides bounded lookup authorization
When the implementation worker needs a missing convention, it SHALL return a typed validated bounded-project-lookup request with 1–5 functional areas, Step-linked reasons, and matching per-item yes/no questions. The coordinator SHALL approve each valid item under injected build fast-track or standalone `/sai-3-implement --fast-track`; ordinary standalone implementation SHALL present each item for a decision. Authorization SHALL keep the existing project-root, read-only, citation (at most three per area), and line (at most 20 per citation) limits. An invalid request, unrelated question, or safety confirmation SHALL never be auto-approved based on wording. Denied items SHALL retain the convention-question fallback. The worker SHALL receive the explicit fast-track boolean after ready and on replacement for its other defined behaviors, not a raw `--fast-track` token. Ordered decisions and original limits SHALL survive worker continuation and replacement without new approval or broader search.

#### Scenario: Typed lookup approval and ordinary decision
- **WHEN** a validated request reaches the implement coordinator under build or standalone fast-track
- **THEN** it approves each item within the established bounds without a permission prompt
- **AND** ordinary standalone implementation instead presents each item through the active harness's picker

#### Scenario: Invalid or unrelated question
- **WHEN** a worker returns an invalid lookup request or an unrelated question that mentions lookup
- **THEN** the coordinator does not grant lookup authorization from its wording

#### Scenario: Replacement retains decided scope
- **WHEN** a worker is replaced after lookup approval
- **THEN** its replacement receives the exact decisions, original limits, and explicit fast-track state without requesting lookup approval again

### Requirement: Apply commit grant is active before the first Step
At apply segment entry the apply coordinator SHALL set `session_commit_authorized` from injected fast-track state before Step projection or dispatch; standalone fast-track apply SHALL do the same after parsing. The grant SHALL cover the Step local-commit gates and the eligible terminal documentation commit gate only. It SHALL skip authorization asks, not pre-commit visibility, proposed messages, exact-path staging, reporting, unresolved-conflict stops, or independent safe-operations confirmations. It SHALL NOT authorize pushes, branch changes, or unrelated files. Missing or invalid fast-track state SHALL stop safely rather than silently falling back to an interactive first-Step approval.

#### Scenario: First Step and terminal documentation commits
- **WHEN** build or standalone fast-track apply reaches the first Step commit gate
- **THEN** the visibility report and proposed message print and only the Step add-list is staged without a local-commit permission prompt
- **AND** the same grant applies at the eligible terminal documentation commit gate

### Requirement: Build preserves one retry grant across both harnesses

Claude Code and opencode Build invocations SHALL use the same apply-owned exhausted-Step choice and SHALL grant at most one fresh budget pair for the blocked Step per explicit authorization. Build SHALL not implement a second recovery ledger or authorize a retry merely because it invokes apply.

#### Scenario: Harnesses retain the same apply recovery ownership

- **WHEN** equivalent Claude Code and opencode Build invocations exhaust the same apply Step budget
- **THEN** both routes use the apply coordinator's identical options, authorization semantics, retained history, and no-second-grant rule
