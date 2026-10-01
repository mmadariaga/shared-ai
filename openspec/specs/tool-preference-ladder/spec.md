# tool-preference-ladder Specification

## Purpose

Prioritizes the most suitable research tools available in the explorer's environment: `codegraph` structural queries first, `git grep` second, and direct disk tools (Glob/Grep/Read) as the last fallback.

## Requirements

### Requirement: Fixed research-tool preference order

All discovery research in Explore SHALL remain delegated to the explorer, and the principal SHALL NOT research code directly. After goal disclosure the explorer SHALL check its assigned capability profile, then apply the fixed ladder only to granted tools: CodeGraph MCP for structural queries, CodeGraph CLI fallback, git grep for textual queries, and disk tools as fallback. Availability detection SHALL remain explorer-owned. Documentation and known-file reads SHALL retain their direct-read exception.

#### Scenario: Structural questions go to codegraph MCP first
- **WHEN** granted CodeGraph MCP access is available and the explorer has a structural question about definitions, callers, or impact
- **THEN** it uses that MCP tool before textual search without a principal probe

#### Scenario: Structural questions use codegraph CLI when MCP unavailable
- **WHEN** granted MCP access is unavailable but granted CodeGraph CLI and shell access are available for a structural query
- **THEN** the explorer uses codegraph explore without a principal probe

#### Scenario: Textual searches use git grep
- **WHEN** granted shell and Git access are available for a textual query
- **THEN** the explorer uses git grep instead of principal direct search

#### Scenario: Direct disk tools are the last fallback
- **WHEN** earlier granted applicable levels are unavailable or do not answer the query
- **THEN** the explorer falls back to granted Glob, Grep, and direct reads without principal direct research

### Requirement: Conditional skipping of unavailable levels

Each ladder level SHALL be evaluated conditionally within the explorer and skipped when its grant, applicability, or availability precondition fails. Discards SHALL distinguish excluded, inapplicable, unavailable, and instruction-error states. The main session SHALL run no availability probe of its own. Intentional exclusions SHALL NOT become environmental absence, and ungranted shell operations SHALL NOT be used for detection.

#### Scenario: Codegraph absent from the session
- **WHEN** granted applicable CodeGraph MCP is absent and its granted CLI path is also unavailable
- **THEN** level 1 is skipped with classified absence diagnostics and no principal independent check

#### Scenario: Shell or git unavailable
- **WHEN** granted applicable shell or Git support is absent inside the explorer runtime
- **THEN** level 2 is skipped with the appropriate unavailable diagnostic and no principal independent check

#### Scenario: Discard logging distinguishes level 1a from level 1b
- **WHEN** granted MCP access is absent but granted CLI access succeeds
- **THEN** the discard identifies level 1a absence separately from level 1b success without a principal probe

#### Scenario: Discard logging emitted per execution segment
- **WHEN** the explorer continues into another segment under its forty-call ceiling
- **THEN** ladder_discards is emitted independently for that segment and the principal runs no independent check

#### Scenario: Excluded level does not become a missing-tool warning
- **WHEN** the explorer profile excludes a ladder level
- **THEN** its diagnostic records exclusion rather than environmental absence

### Requirement: The ladder governs only research-tool choice

The tool-preference ladder SHALL govern only research-tool choice and SHALL NOT modify directed out-of-root access, scope escalation, or the per-segment ceiling. Tool selection SHALL be bounded by at most 40 calls per execution segment.

#### Scenario: Out-of-root need discovered while following the ladder
- **WHEN** following the ladder exposes a concrete filesystem need outside the project root
- **THEN** the need is handled exclusively through directed-access and escalation with no extra ladder access

#### Scenario: Tool choice does not spend beyond the ceiling
- **WHEN** the explorer selects tools according to the ladder
- **THEN** the selection stays bounded by at most 40 calls per execution segment

### Requirement: Ladder precedence over caller tool prescriptions

A caller's tool name, procedure, or method SHALL NOT override the profile grants or research ladder. The task SHALL continue under the ladder; skipped prescribed tools SHALL retain a caller prescribed diagnostic. Shell SHALL remain restricted to granted git grep and codegraph explore operations. Requests for other shell purposes SHALL be refused and logged without execution. Caller-prescription and refusal entries SHALL be classified as instruction errors rather than environmental absences.

#### Scenario: Caller prescribes a tool before the ladder would reach it
- **WHEN** the caller prescribes Glob but a granted CodeGraph structural lookup succeeds first
- **THEN** the ladder governs and a caller prescribed Glob diagnostic records the skipped prescription

#### Scenario: Caller prompt violation does not abort the task
- **WHEN** a caller prescribes a tool contrary to the ladder
- **THEN** the task continues under granted ladder choices with the prescription recorded internally

#### Scenario: Shell operation other than git grep or codegraph is refused
- **WHEN** the explorer is asked to run another shell operation
- **THEN** it refuses execution and records shell operation refused with instruction-error classification
