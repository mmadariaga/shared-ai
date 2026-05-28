## MODIFIED Requirements

### Requirement: SAI instruction files MUST reference the `budget-explorer` skill by name when delegating I/O-bound lookup work to a subagent.

Replaces all prior harness-agnostic phrasings: "research subagent", "explore subagent", "cheap research subagent", "`explore` in opencode / `Explore` in Claude Code / the pre-defined explorer custom agent in GitHub Copilot". The canonical term is `budget-explorer`.

#### Scenario: Instruction file delegates codebase lookup to a subagent
- **WHEN** an SAI instruction file (accessibility, backfill, design, implement, performance, remember, review, security, spec.propose) instructs the agent to delegate I/O work
- **THEN** the instruction SHALL use the term `budget-explorer` skill (or `budget-explorer` subagent) and SHALL NOT use harness-specific synonyms

#### Scenario: Cost discipline reminder in remember.md
- **WHEN** the remember.md cost discipline rule is active
- **THEN** it SHALL reference `budget-explorer` subagent as the delegation target for I/O work
