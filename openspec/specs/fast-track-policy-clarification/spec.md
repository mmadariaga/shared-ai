# fast-track-policy-clarification Specification

## Purpose
TBD - created by archiving change clarify-build-fasttrack-policy. Update Purpose after archive.
## Requirements
### Requirement: Build explicit-token strip is build-local no-op
The policy SHALL state that an explicit `--fast-track` token on `/sai-build` is stripped before resolution as a build-local no-op that decides nothing, creates no build-local fast-track state, and prints no banner at strip time.
#### Scenario: Explicit token on build changes nothing
- **WHEN** `/sai-build` receives an explicit `--fast-track` token with or without a change name
- **THEN** the token is stripped before resolution and build-local phase order, injection, gates, and banner behavior stay identical

### Requirement: Chained apply injection prints single supervisor banner
The policy SHALL state that the build supervisor always injects `fast_track_active=true` as invocation-scoped session state never written to a file for the chained apply segment and prints the exact `> FAST-TRACK MODE ACTIVE` supervisor banner exactly once at apply activation and zero times when apply never activates, with no second banner from the chained apply skipped shell.
#### Scenario: Successful build prints one banner at apply activation
- **WHEN** a build completes implement and activates the chained apply segment
- **THEN** the supervisor prints the single banner once and the chained apply shell prints no second banner

### Requirement: Review explicit-token strip remains pure no-op
The policy SHALL state that `/sai-review` strips an explicit `--fast-track` token before resolution as a pure behavioral no-op that neither activates fast-track nor emits a banner.
#### Scenario: Review token stripped without effect
- **WHEN** `/sai-review` receives an explicit `--fast-track` token in any order
- **THEN** the token is removed before change resolution with no activation and no banner

