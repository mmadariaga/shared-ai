# tasks-authoring-rules Specification

## Purpose
TBD - created by archiving change cost-optimizations. Update Purpose after archive.
## Requirements
### Requirement: Each tasks.md step SHALL describe HOW to build, not WHAT to build

Steps in `tasks.md` are a planning scaffold. They MUST reference the relevant `specs/<capability>/spec.md` by path and describe the implementation approach mapped to the existing codebase. They MUST NOT copy scenario text, field names, or detailed behavior from specs.

#### Scenario: Step describes implementation approach
- **WHEN** a tasks.md step is authored for a capability
- **THEN** the "What Will Be Done" field describes the implementation mechanics (e.g. which class to extend, which pattern to follow) and ends with a reference to the spec file path
- **THEN** it does NOT restate requirements or copy scenario text already present in the spec

#### Scenario: Step restates spec content
- **WHEN** a tasks.md step duplicates behavior description from the spec
- **THEN** this violates the conciseness rule; the content MUST be replaced with a spec reference

---

### Requirement: The Required Documentation section in tasks.md SHALL include a Spec files subsection

The `## Required Documentation` section MUST contain a `### Spec files` subsection listing every `specs/**/*.md` file consulted during the design step. This subsection MUST NOT be empty.

#### Scenario: Design step completes
- **WHEN** `tasks.md` is written
- **THEN** `## Required Documentation` contains `### Local files`, `### Spec files`, and `### External URLs` subsections
- **THEN** `### Spec files` lists every spec file path referenced by the implementation steps

#### Scenario: No spec files consulted
- **WHEN** no spec files were consulted (impossible in a valid SAI workflow)
- **THEN** the subsection MUST still appear and MUST NOT be empty or contain "None"

---

### Requirement: Required Documentation SHALL be populated entirely from the explore subagent's report

The `### Local files` subsection MUST be derived from the explore subagent's output, not from files the main agent read directly.

#### Scenario: Main agent populates Required Documentation
- **WHEN** the main agent writes the `### Local files` subsection
- **THEN** every entry corresponds to a file reported by the explore subagent, with file:line ranges where applicable

