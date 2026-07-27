# Design Subagent Delegation Specification

## Purpose

Define the subagent delegation rules for the routed design coordinator and worker, ensuring the coordinator performs no I/O and the worker delegates source-code discovery to its explore binding.

## Requirements

### Requirement: The design coordinator SHALL NOT perform file I/O
For routed design, the coordinator SHALL perform no file I/O, including OpenSpec artifacts, source code, configuration, documentation, or git state. The design worker SHALL own all design-phase I/O and MUST delegate all source-code discovery to budget-explorer through its harness binding; it SHALL NOT call Read, Glob, or Grep directly on source code. On the Copilot inline compatibility path, the inline design agent SHALL retain the existing rule that source-code discovery is delegated rather than performed directly.

#### Scenario: Routed design needs source evidence
- **WHEN** the coordinator receives a worker result or user answer that requires source inspection
- **THEN** it SHALL continue or replace the design worker and SHALL NOT call Read, Glob, Grep, shell, OpenSpec, or git tools itself

#### Scenario: Design worker needs source evidence
- **WHEN** the routed design worker needs to inspect source code
- **THEN** it SHALL dispatch budget-explorer through the configured Claude binding or opencode `explore` task and SHALL act on that report rather than reading source code directly

#### Scenario: Inline Copilot design needs source evidence
- **WHEN** the inline Copilot design path needs to understand source files outside `proposal.md` and `specs/**/*.md`
- **THEN** it SHALL delegate discovery through its existing research-subagent path

### Requirement: The design worker SHALL be the source of truth for codebase facts presented to the coordinator
The coordinator SHALL trust worker-authored technical findings and SHALL NOT re-read or independently verify source files. The worker SHALL remain responsible for resolving ambiguity through mandatory research-helper continuation or a structured user question and SHALL not bypass the helper by reading source files itself.

#### Scenario: Worker reports a surprising pattern
- **WHEN** the design worker reports a codebase pattern the coordinator did not anticipate
- **THEN** the coordinator SHALL relay or act on the lifecycle result without opening the file or making a competing technical decision

#### Scenario: Worker cannot resolve conflicting evidence
- **WHEN** the design worker finds ambiguous or conflicting codebase evidence
- **THEN** the worker SHALL continue research or return `needs_input`; the coordinator SHALL not inspect the evidence itself

### Requirement: Design research delegation MUST declare an output contract
Every research subagent spawned by the design worker or the Copilot inline design path MUST receive an output contract specifying exact response fields, a hard length cap, and whether raw file contents are forbidden. Research subagents SHALL return evidence to the technical owner and SHALL NOT write design artifacts.

#### Scenario: Design worker delegates codebase research
- **WHEN** the design worker launches a research subagent
- **THEN** the prompt SHALL define exact fields, a hard cap, and no-raw-content discipline, and the design worker SHALL retain responsibility for technical decisions and artifact writes
