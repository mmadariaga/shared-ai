# sai-merge-command Specification

## MODIFIED Requirements

### Requirement: Contextual conflict analysis with complete alternatives

The `/sai-merge` worker SHALL classify conflicts by semantic consequence and SHALL distinguish directly observable Facts from explicitly labeled Inferences. For each semantically ambiguous conflict, it SHALL explain both branch objectives, affected contracts, preserved behavior, sacrificed behavior, risks, and whether a safe synthesis exists. It SHALL retain complete marker-free current and incoming alternatives and SHALL offer a complete synthesis only when there is one owner for each responsibility, one authoritative source for each fact, compatible lifecycle behavior, and no duplicated gate or competing contract.

#### Scenario: Semantic conflict receives contextual analysis

- **WHEN** two branches express different objectives or incompatible contract-level consequences for the same conflict region
- **THEN** the worker returns a contextual decision gate that compares complete behavioral alternatives and keeps the worker read-only

### Requirement: Contextual decisions precede resolution mutation

The coordinator SHALL keep every semantic alternative pending until the user explicitly selects an offered complete outcome. While a contextual decision or `more-context` continuation is pending, the coordinator SHALL perform no resolution write, conflict-marker removal, or staging.

#### Scenario: Pending contextual decision blocks mutation

- **WHEN** a semantic conflict has no explicit accepted outcome or the worker is continuing a `more-context` request
- **THEN** the coordinator leaves the conflict untouched and forwards the answer to the same worker without mutation

### Requirement: Complete resolution payload validation

Before writing any resolution, the coordinator SHALL atomically validate a complete payload containing exactly one expected record per conflicted file in scope, accepted decision records, exact paths and categories, and complete final UTF-8 file contents without conflict markers. It SHALL reject diffs, hunks, fragments, prose instructions, reconstructed content, duplicates, unexpected paths, and invalid decisions as a whole.

#### Scenario: Invalid resolution payload is rejected

- **WHEN** any complete-file record is missing, fragmentary, inconsistent, unexpected, or contains a conflict marker
- **THEN** the coordinator writes no resolution and stages no path

### Requirement: Verification analysis remains worker-owned

The worker SHALL retain responsibility for running the detected verification suite and analyzing failures as read-only technical work. The coordinator SHALL own applying proposed fixes, writing validated resolutions, staging paths, and final commit authorization.

#### Scenario: Verification failure requires coordinator action

- **WHEN** the worker reports a failed verification round with proposed corrective changes
- **THEN** the coordinator applies any accepted fix, stages the resulting validated paths, and preserves the explicit commit authorization gate
