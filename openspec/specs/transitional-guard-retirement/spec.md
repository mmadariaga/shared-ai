# transitional-guard-retirement Specification

## Purpose
TBD: define fetch behavior after retiring identity-bearing binding-slot guards.

## Requirements

### Requirement: Fetch skills no longer enforce an identity-bearing binding slot
The Claude Code, opencode, and Copilot fetch skills SHALL stop branching on a harness identity segment in a binding path; fetch resolution SHALL not enforce an identity-bearing binding slot.

#### Scenario: Neutral worker references use ordinary resolution
- **WHEN** a Claude Code or opencode fetch skill receives a neutral worker-binding reference
- **THEN** it SHALL apply the ordinary local/global or harness-appropriate resolution rules without a cross-harness identity check

#### Scenario: Legacy identity-bearing references receive no transitional guard
- **WHEN** a stale installed instruction contains an old `bindings/<identity>/` worker-binding reference
- **THEN** the fetch skill SHALL not apply the retired identity-slot guard, and this change SHALL not add migration or cleanup behavior for that stale instruction file; removal of legacy binding files SHALL be governed by the retirement requirement in `install-uninstall-enumeration-parity`

### Requirement: General fetch behavior remains intact after guard removal
Retiring the transitional guard SHALL preserve missing-file handling, recursive Fetch resolution, skill loading, project-local precedence, global fallback, and Copilot's inline no-routed-binding boundary.

#### Scenario: Missing neutral binding still reports the normal failure
- **WHEN** a neutral worker-binding reference cannot be found in the applicable project or global location
- **THEN** the fetch skill SHALL use its existing missing-file failure behavior

#### Scenario: Copilot remains inline
- **WHEN** Copilot resolves a Fetch reference after the guard prose is removed
- **THEN** it SHALL retain its existing project-local and user-level SAI resolution behavior and SHALL not gain routed worker-binding projections or a replacement identity guard
