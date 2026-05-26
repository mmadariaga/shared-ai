# design-subagent-delegation Specification

## Purpose
TBD - created by archiving change cost-optimizations. Update Purpose after archive.
## Requirements
### Requirement: The main agent SHALL NOT perform any file I/O on source code during the design step

The main agent reads only `proposal.md` and `specs/**/*.md`. All codebase discovery (glob, grep, Read on source files) MUST be delegated to a single explore subagent spawn.

#### Scenario: Main agent attempts to read a source file
- **WHEN** the design step needs to understand any source file that is not `proposal.md` or a `spec.md`
- **THEN** the main agent MUST NOT call Read/Glob/Grep directly; it MUST spawn the explore subagent and act only on its output

#### Scenario: Explore subagent output is ambiguous
- **WHEN** the explore subagent's report contains ambiguous or surprising information
- **THEN** the main agent MAY ask the explore subagent for clarification but MUST NOT open any source file to verify

---

### Requirement: The explore subagent SHALL be the single source of truth for codebase facts during design (Trust Rule)

The main agent MUST NOT re-read any source file the explore subagent has already reported on, even if the report contains something unexpected.

#### Scenario: Explore reports an unexpected pattern
- **WHEN** the explore subagent reports a pattern the main agent did not anticipate
- **THEN** the main agent assumes the report is correct and designs accordingly; it does NOT open the file

#### Scenario: File marked NOT_FOUND by explore
- **WHEN** the explore subagent marks a file as `NOT_FOUND` or omits it from its report
- **THEN** the main agent MAY read or create that file directly (it is the only exception to the delegation rule)

---

### Requirement: The explore subagent spawn MUST declare an output contract

The prompt sent to the explore subagent MUST specify: exact fields expected, a hard length cap, and "no raw file contents".

#### Scenario: Explore subagent spawned for design research
- **WHEN** the main agent launches the explore subagent during the design step
- **THEN** the subagent prompt contains `filePath`, `keyExports`, `isReusableForThisChange`, `notes (max 20 words)` as required output fields, and states "Return structured data only. No prose narrative."

