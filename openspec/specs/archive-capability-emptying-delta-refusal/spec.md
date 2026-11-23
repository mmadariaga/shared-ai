# archive-capability-emptying-delta-refusal Specification

## Purpose
TBD - created by archiving change archive-capability-retirement-refusal. Update Purpose after archive.

## Requirements

### Requirement: Archive SHALL detect capability-emptying deltas before any mutation

The archive plan tool `sai/tools/archive-plan.js` SHALL identify, read-only and before any mutation, when a delta spec capability's `## REMOVED Requirements` section names every requirement currently published in `openspec/specs/<capability>/spec.md` with no `## ADDED Requirements` section for that same capability. This shape is a **capability-emptying delta**. The shape alone SHALL NOT block the archive: the tool MUST NOT refuse for the shape itself, and the archive proceeds to the retirement declaration. When `retired_capabilities` is non-empty, the tool SHALL check the declaration preconditions in the same read-only computation; when a condition blocks, it SHALL return a refusal naming the blocking condition, the capability or file it concerns, and the way forward, and SHALL return no plan, so no execution order can be built.

#### Scenario: Detection occurs before archive CLI invocation

- **WHEN** a change's delta specs are assessed by the plan tool
- **THEN** the tool detects every delta spec capability whose REMOVED section names all published requirements and lacks any ADDED section for that same capability, and checks the declaration preconditions, having performed no directory move, file write, or state-changing git command

#### Scenario: Capability-emptying deltas are refused with a stop-text

- **WHEN** the plan tool detects a capability-emptying delta whose declaration preconditions all pass
- **THEN** the tool returns no refusal, lists the capability in `retired_capabilities`, and the archive proceeds to the retirement declaration

### Requirement: Archive refusal addresses the false `openspec validate` lead

The archive contract SHALL continue to state that `openspec validate <capability>` is not evidence about this shape, in narrowed form: `openspec validate <change>` checks delta well-formedness only, and `openspec validate <capability>` inspects the published spec. The pre-flight SHALL detect the capability-emptying delta shape directly, without duplicating the CLI's rebuilt-spec validation.

#### Scenario: The refusal text neutralizes the false hint

- **WHEN** a reader consults the archive instructions about a capability-emptying delta
- **THEN** the instructions state that `openspec validate <capability>` is not evidence and that the pre-flight detects the delta shape directly
