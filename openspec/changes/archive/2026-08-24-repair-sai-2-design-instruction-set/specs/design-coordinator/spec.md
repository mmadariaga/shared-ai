## MODIFIED Requirements

### Requirement: Current design harness entrypoints
Claude Code and opencode SHALL invoke the routed design coordinator and their respective design-worker bindings, with active source references pointing to the step-owned contract rather than the deleted invocation body.

#### Scenario: Routed harness starts design
- **WHEN** Claude Code or opencode invokes `/sai-2-design`
- **THEN** its wrapper SHALL enter the routed coordinator and design-worker binding
- **AND** it SHALL NOT fetch a deleted invocation source, retired inline adapter, or removed inline command loader

#### Scenario: Retired inline design entry is excluded
- **WHEN** a maintainer inspects the active `/sai-2-design` entrypoints
- **THEN** the active wrappers SHALL be limited to the Claude Code and opencode routed coordinator and matching worker bindings
- **AND** active source references SHALL point to live step-owned surfaces, with no fetch of a deleted invocation body, retired inline adapter, or removed inline loader

#### Scenario: routed-entrypoint-uses-live-contract
- **WHEN** either supported harness invokes `/sai-2-design`
- **THEN** it enters the routed coordinator and worker binding without fetching a deleted invocation source.

## REMOVED Requirements

### Requirement: continue-now-clears-design-lifecycle
**Reason:** The design command no longer offers the retired Continue-now implementation-dispatch route.
**Migration:** End design at its existing design completion boundary and invoke implementation separately.
#### Scenario: retired-continue-now-route-is-absent
- **WHEN** design artifacts and feedback are complete
- **THEN** the design coordinator does not dispatch implementation planning through a Continue-now branch.

### Requirement: continue-now-envelope-contract
**Reason:** The retired Continue-now route no longer constructs an implementation envelope.
**Migration:** Use the separate implementation command invocation with its own opaque request.
#### Scenario: retired-envelope-is-not-constructed
- **WHEN** the design completion boundary is reached
- **THEN** no Continue-now implementation envelope is emitted.

