# Spec Research Consumption Specification

## Purpose

Define how `sai-1` consumes handoff research evidence and reaches the established confidence boundary for structured research.

## Requirements

### Requirement: sai-1 validates and extends research leads as open-ended starting points

The `sai-1` Research Guide SHALL instruct the agent that each **Research Leads** entry in a pasted `Ready to Propose` handoff is a suggested starting point for deeper research. For every lead, `sai-1` SHALL validate the current path or path range, inspect the relevant source when it resolves, follow related code and documentation, and continue normal independent research beyond the listed leads. Research Leads SHALL NOT be treated as a closed inspection list, authoritative scope, or target-file selection.

#### Scenario: a research lead resolves

- **WHEN** the pasted handoff contains a Research Leads path that still resolves
- **THEN** `sai-1` validates and reads that lead as an initial research premise
- **AND** `sai-1` follows related code and documentation and performs additional research beyond the lead

#### Scenario: research leads are present but insufficient

- **WHEN** the listed Research Leads do not explain the full behavior or affected surface
- **THEN** `sai-1` expands the investigation beyond those leads until its normal research confidence threshold is met
- **AND** the insufficiency does not halt the spec phase or become an error

#### Scenario: no research leads are present

- **WHEN** the pasted handoff has no useful Research Leads entries or contains `- None`
- **THEN** `sai-1` proceeds with its normal independent research without behavioral change

### Requirement: sai-1 structured research confidence boundary

The `sai-1` Research Guide's existing approximately 80% confidence stop criterion SHALL govern completion of the structured research progress step for every resolved spec request, whether or not the request carries a `Ready to Propose` handoff. Research Leads consumption remains additive guidance and SHALL NOT be required for the threshold to apply.

#### Scenario: ordinary request reaches the research boundary

- **WHEN** a resolved spec request has no `Ready to Propose` handoff
- **THEN** structured research SHALL close and mark the `research` progress step when the existing approximately 80% confidence threshold is reached

#### Scenario: handoff request reaches the same boundary

- **WHEN** a resolved spec request carries a `Ready to Propose` handoff with Research Leads
- **THEN** structured research SHALL still continue until the same approximately 80% confidence threshold is reached
- **AND** the handoff leads SHALL remain additive starting points rather than replacing independent research

### Requirement: sai-1 reads handoff guidance as a premise to confirm and extend

When the pasted `Ready to Propose` handoff carries `file:line` evidence-provenance in its **Why** or **Decisions & Rationale** fields, or carries entries in **Research Leads**, the `sai-1` Research Guide SHALL treat those sources as premises to confirm and extend: verifiable starting points that the agent reads or validates first, then builds on. This framing is mandatory and additive; it SHALL NOT replace `sai-1`'s independent research obligation. The agent SHALL still stop at approximately 80% confidence, SHALL never speculate about unread code, and SHALL write specs from what current sources support rather than from an unexamined handoff claim.

#### Scenario: handoff carries a resolving research lead

- **WHEN** the pasted handoff contains a Research Leads path that resolves
- **THEN** `sai-1` validates the lead first and treats it as a premise to confirm and extend, not as settled scope
- **AND** `sai-1` still performs independent research beyond the lead

#### Scenario: cited source or lead disconfirms the handoff

- **WHEN** `sai-1` reads a cited provenance source or Research Leads source and finds that it contradicts or under-supports the handoff's hypothesis
- **THEN** `sai-1` extends research beyond that source and writes specs from what current evidence supports
- **AND** the disconfirming source does not propagate into the specs unexamined

#### Scenario: no provenance or research leads exist

- **WHEN** the pasted handoff carries neither provenance citations nor Research Leads
- **THEN** `sai-1` proceeds with normal independent research exactly as it does today

### Requirement: Stale or insufficient handoff research input falls back to normal research

When a provenance citation or Research Leads path no longer resolves, has been renamed, points to contradictory content, or is insufficient to explain the relevant behavior, `sai-1` SHALL fall back to or expand its normal research for that item and SHALL NOT treat the condition as a hard failure. A stale or weak lead is neutral input: it may provide no usable evidence, but it SHALL never error or halt the spec phase.

#### Scenario: a cited or lead path no longer resolves

- **WHEN** a provenance citation or Research Leads path points to a deleted or renamed file that cannot be opened
- **THEN** `sai-1` falls back to normal research for that item without erroring or halting

#### Scenario: a lead line range no longer supports the note

- **WHEN** a Research Leads path still resolves but its cited line range now points to unrelated or contradictory content
- **THEN** `sai-1` validates the current source, rejects the unsupported premise, and expands research from the current codebase
- **AND** the stale line reference does not constrain the resulting specs

### Requirement: Research leads add no target-file field or fixed consumption policy

The consumption instruction SHALL NOT introduce a target-file, "files to modify", or "where to modify" field anywhere in the `sai-1` handoff or artifacts. Research Leads remain investigative guidance, provenance remains an intent citation, and implementation targeting remains the responsibility of `sai-2-design` and `sai-3-implement`. The instruction SHALL NOT mandate whether any research effort saved by the leads is banked as speed or reinvested as additional quality.

#### Scenario: a spec phase consumes research leads

- **WHEN** `sai-1` uses Research Leads during specification research
- **THEN** the resulting handoff and artifacts contain no target-file field and do not treat a lead as a file-selection command
- **AND** no fixed speed-versus-quality consumption policy is imposed

### Requirement: Consumption edit surface is the shared spec.propose.md instruction

This capability SHALL be delivered by editing `sai/commands/spec/instructions.md`, the shared instruction fetched by all three `sai-1-spec` wrappers, and SHALL NOT modify any wrapper file under `commands/claude/`, `commands/opencode/`, or `commands/copilot/`. Delivering the instruction in the shared file makes the research-lead consumption behavior apply uniformly across Claude Code, opencode, and GitHub Copilot.

#### Scenario: shared instruction provides uniform consumption

- **WHEN** the research-lead consumption behavior is applied
- **THEN** the consumption rule is added to `sai/commands/spec/instructions.md`
- **AND** the three `sai-1-spec` wrappers and the shared command file remain unchanged
