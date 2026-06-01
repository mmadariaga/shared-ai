## MODIFIED Requirements

### Requirement: Mandatory budget-explorer delegation in accessibility audit Discovery
The accessibility audit main agent SHALL NOT read any diff files directly. All source code inspection, diff-file reading, component categorization, and codebase context lookup MUST be delegated to budget-explorer subagents with explicit output contracts. Delegation is unconditional — not gated on "independent areas" or any other heuristic.

When multiple independent component areas exist in the diff, the main agent SHALL spawn budget-explorer subagents in parallel. Total subagent invocations per audit SHALL be capped at ≤8.

#### Scenario: Main agent attempts to read diff file directly
- **WHEN** the accessibility audit agent encounters a diff file that needs inspection
- **THEN** the agent MUST delegate reading to a budget-explorer subagent with an output contract (file:line + WCAG SC + 1-line note, ≤200 words, no raw code blocks)
- **THEN** the main agent MUST NOT read the file itself under any circumstances

#### Scenario: Independent component areas exist in diff
- **WHEN** the diff contains multiple independent component areas needing codebase context
- **THEN** the agent SHALL spawn budget-explorer subagents in parallel, one per area
- **THEN** each subagent receives an output contract specifying exact fields, length cap, and "no raw code blocks"

#### Scenario: Single component area in diff
- **WHEN** the diff contains only a single component area
- **THEN** the agent SHALL still delegate to a budget-explorer subagent (delegation is mandatory, not conditional)
- **THEN** the agent MUST NOT rationalize skipping delegation by claiming areas are "not independent"

### Requirement: Operating Principles — explicit prohibition on main-agent diff reading
The accessibility audit Operating Principles section SHALL include a hard requirement stating the main agent MUST NOT read a single diff file itself. All source code inspection is subagent work. The main agent's job is to interpret the subagent's structured output against WCAG SC, not to read raw markup.

#### Scenario: Agent reviews Operating Principles before audit
- **WHEN** the accessibility audit agent loads the Operating Principles
- **THEN** the first principle SHALL state the explicit prohibition on main-agent diff-file reading
- **THEN** the agent SHALL understand its role is WCAG SC interpretation of structured subagent output
