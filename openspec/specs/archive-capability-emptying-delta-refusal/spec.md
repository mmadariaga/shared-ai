# archive-capability-emptying-delta-refusal Specification

## Purpose
TBD - created by archiving change archive-capability-retirement-refusal. Update Purpose after archive.

## Requirements

### Requirement: Archive SHALL detect capability-emptying deltas before any mutation

During the read-only pre-flight assessment, the archive worker SHALL identify when a delta spec capability's `## REMOVED Requirements` section names every requirement currently published in `openspec/specs/<capability>/spec.md` with no `## ADDED Requirements` section for that same capability. This shape is a **capability-emptying delta**. Detection SHALL remain read-only and SHALL stay at the same point in the pre-flight, by the same method. The shape alone SHALL NOT block the archive: the worker MUST NOT return a refusal stop-text for the shape itself, and the archive proceeds to the retirement declaration. When `retired_capabilities` is non-empty, the worker SHALL extend the same read-only pre-flight with the declaration preconditions and SHALL record their outcome as invocation-scoped state alongside `retired_capabilities`; when a recorded condition blocks, the worker SHALL close the run with a terminal refusal naming the blocking condition, the capability or file it concerns, and the way forward, and SHALL return no mutation plan and no prepared execution order.

#### Scenario: Detection occurs before archive CLI invocation

- **WHEN** a change's delta specs are assessed during the read-only pre-flight
- **THEN** the worker detects every delta spec capability whose REMOVED section names all published requirements and lacks any ADDED section for that same capability, and additionally records the declaration precondition outcomes, having performed no directory move, file write, or git command

#### Scenario: Capability-emptying deltas are refused with a stop-text

- **WHEN** the pre-flight assessment detects a capability-emptying delta whose declaration preconditions all pass
- **THEN** the worker returns no refusal stop-text, records the capability as retired, and the archive proceeds to the retirement declaration

### Requirement: Archive refusal addresses the false `openspec validate` lead

The archive contract SHALL continue to state that `openspec validate <capability>` is not evidence about this shape, in narrowed form: `openspec validate <change>` checks delta well-formedness only, and `openspec validate <capability>` inspects the published spec. The pre-flight SHALL detect the capability-emptying delta shape directly, without duplicating the CLI's rebuilt-spec validation.

#### Scenario: The refusal text neutralizes the false hint

- **WHEN** a reader consults the archive instructions about a capability-emptying delta
- **THEN** the instructions state that `openspec validate <capability>` is not evidence and that the pre-flight detects the delta shape directly
