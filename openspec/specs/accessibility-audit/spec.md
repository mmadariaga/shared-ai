# accessibility-audit Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements

### Requirement: Mandatory budget-explorer delegation in accessibility audit Discovery
The accessibility worker SHALL inspect UI files directly when the scope holds five or fewer, and delegation SHALL NOT be mandatory in that case. When the scope holds more than five UI files, the worker SHALL delegate the per-component scan to budget-explorer subagents with explicit output contracts (file:line + WCAG SC + finding category + ≤80 words), in parallel across independent component areas. Total subagent invocations per audit SHALL be capped at ≤8.

#### Scenario: Main agent attempts to read diff file directly
- **WHEN** the scope holds five or fewer UI files
- **THEN** the worker MAY read them directly without delegating

#### Scenario: Independent component areas exist in diff
- **WHEN** the scope holds more than five UI files in multiple independent component areas
- **THEN** the worker SHALL spawn budget-explorer subagents in parallel, one per area, each with an output contract specifying exact fields, length cap, and no raw code blocks

#### Scenario: Single component area in diff
- **WHEN** the scope holds a single component area of five or fewer UI files
- **THEN** the worker inspects it directly and spawns no subagent

### Requirement: Operating Principles — explicit prohibition on main-agent diff reading
The accessibility audit Operating Principles section SHALL include a hard requirement stating the main agent MUST NOT read a single diff file itself. All source code inspection is subagent work. The main agent's job is to interpret the subagent's structured output against WCAG SC, not to read raw markup.

#### Scenario: Agent reviews Operating Principles before audit
- **WHEN** the accessibility audit agent loads the Operating Principles
- **THEN** the first principle SHALL state the explicit prohibition on main-agent diff-file reading
- **THEN** the agent SHALL understand its role is WCAG SC interpretation of structured subagent output
