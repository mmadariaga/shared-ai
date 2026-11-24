# tasks-authoring-rules Specification

## Purpose
TBD - created by archiving change cost-optimizations. Update Purpose after archive.

## Requirements

### Requirement: Each tasks.md step SHALL describe HOW to build, not WHAT to build

Steps in `tasks.md` are a planning scaffold that records only what the code of the plan RED does not express. They MUST NOT copy scenario text, field names, or detailed behavior from specs, and MUST NOT describe how to build a behavior that a test and a `path :: signature` entry of `design.md` already pin. A step with tests MUST name only the titles of the scenarios it covers; a step without tests MUST describe in `**What Changes**` what changes in each of its files and reference the relevant `specs/<capability>/spec.md` by path. A step MUST NOT carry `**What Will Be Done**`.

#### Scenario: Step describes implementation approach
- **WHEN** a tasks.md step without tests is authored for a capability
- **THEN** its `**What Changes**` field describes what changes in each file it lists, references the spec file path, and does not restate requirements or copy scenario text already present in the spec

#### Scenario: Step restates spec content
- **WHEN** a tasks.md step duplicates behavior description from the spec
- **THEN** this violates the conciseness rule; the content MUST be replaced with the scenario titles (a step with tests) or a spec reference (a step without tests)

#### Scenario: Step with tests names only scenarios
- **WHEN** a tasks.md step changes behavior that a test can pin
- **THEN** it carries `**Scenarios**` with the scenario titles and no prose about how to build the behavior
