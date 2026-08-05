# Cross-Harness Path Stop Rule Specification

## Purpose
TBD

## Requirements

### Requirement: Refuse a path that identifies a different harness

When a routed fetch skill encounters an identity-bearing path slot whose value differs from the active harness identity, it SHALL classify the path as cross-harness and stop before checking candidate locations, reading the path, invoking a skill, or applying recursive resolution. A routed binding path uses `bindings/<identity>/` as its identity-bearing slot; the comparison is structural and requires no inventory of competing harness names. The fetch skill SHALL neither rewrite the path nor guess an equivalent path under the active harness. A coordinator-owned stop SHALL name the refused path and active harness, direct the user to open a new chat, and offer no in-session retry. A worker-owned stop SHALL use the existing failed-result reporting and SHALL not retry automatically; an explicit user-requested fresh-worker dispatch remains permitted in the current session. The routed stop rule applies to Claude Code and opencode. Copilot remains inline and SHALL omit the routed-binding stop rule while retaining its identity and resolution-root assertions.

#### Scenario: Coordinator refuses a cross-harness binding path
- **WHEN** an opencode session encounters `bindings/claude/design-worker.md`
- **THEN** it reports a coordinator-level routing stop naming that path and `opencode`, does not read or resolve the path, and directs the user to retry in a new chat without offering an in-session retry

#### Scenario: Binding identity mismatch is detected structurally
- **WHEN** an opencode session encounters a routed binding path whose `bindings/<identity>/` segment is `claude`
- **THEN** the fetch skill compares that segment directly with active identity `opencode`, classifies the path as cross-harness, and stops without consulting a list of competing harness names

#### Scenario: Worker refuses a cross-harness binding path
- **WHEN** a worker encounters `bindings/claude/design-worker.md` after dispatch in an opencode session
- **THEN** it does not read or resolve the path, reports the existing failed result with the refused path and `opencode`, and waits for an explicit fresh-worker dispatch instead of retrying automatically

#### Scenario: Copilot omits the routed-binding stop rule
- **WHEN** the Copilot fetch skill establishes its active identity and resolution roots
- **THEN** it does not add a `bindings/<identity>/` stop rule because Copilot dispatches inline and receives no routed binding path

#### Scenario: A harness-neutral path keeps normal resolution
- **WHEN** a fetch directive contains no identity-bearing slot
- **THEN** the active fetch skill applies its existing project-local, user-global, skill, missing-file, and recursion rules without treating the directive as a cross-harness stop
