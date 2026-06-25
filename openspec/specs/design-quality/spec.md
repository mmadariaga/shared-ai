# design-quality Specification

## ADDED Requirements

### Requirement: Decision summary printed at end of design phase

When `sai/commands/sai-2-design.md` reaches its Completion section, the agent SHALL print a structured decision summary to the screen before the handoff prompt. The summary is derived exclusively from the artifacts just written (`design.md` and `tasks.md`) — not from prior conversation.

The summary SHALL contain three blocks in flat list format:
- **Decisions**: one line per decision from `design.md`'s Decisions section. Every `### D<n>` heading under `## Decisions` counts as one decision, regardless of whether it meets all three ADR/DDR criteria (the "brief only" ones are still decisions). Sub-elements such as `**ADR/DDR criteria**`, `**Alternatives considered**`, and `**Chosen**` blocks are NOT counted as separate decisions — the heading itself is the unit.
- **Risks**: one line per risk from `design.md`'s Risks / Trade-offs section. Each `- **[<Risk>]** → Mitigation:` entry counts as one risk.
- **Resolved Open Questions**: one line per open question that was resolved during the design phase (answered by codebase research or by the user).

#### Scenario: Summary printed before handoff prompt
- **WHEN** the agent has written all design artifacts and reaches the Completion section
- **THEN** the agent SHALL print the decision summary first, then print the handoff prompt (option a/b) as the LAST content before stopping

#### Scenario: Summary respects hard line cap
- **WHEN** the decision summary is composed
- **THEN** the total output SHALL NOT exceed 15 lines (excluding blank separator lines)

#### Scenario: Summary is derived from artifacts, not conversation
- **WHEN** the agent generates the decision summary
- **THEN** every line in the summary SHALL trace to content in `design.md` or `tasks.md` just written; no information from prior conversation SHALL appear

### Requirement: One line per item in summary

Each decision, risk, and resolved open question SHALL be expressed in exactly one line. No multi-line descriptions.

#### Scenario: Decisions block has one line per decision (when items fit under the cap)
- **WHEN** design.md lists 5 decisions AND the total decisions+risks+resolved-questions count is within the 15-line cap
- **THEN** the Decisions block SHALL contain exactly 5 lines

#### Scenario: Empty blocks are omitted
- **WHEN** design.md has no unresolved open questions (all were resolved during the Open Questions gate)
- **THEN** the Resolved Open Questions block SHALL list each resolved question (one line each); if zero were resolved, the block SHALL be omitted entirely

### Requirement: Items omitted under the hard cap are signaled

When the total count of decisions, risks, and resolved open questions would exceed the hard 15-line cap, the agent SHALL compress by trimming only the largest block(s) (preserving the highest-priority items — Decisions before Risks before Resolved Open Questions), reserve one slot for a single trailing signal line of the form `+N more — see openspec/changes/{name}/design.md` (where N is the count of omitted items), and emit that signal line as the last line of the summary block. Silent drops are forbidden.

#### Scenario: Overflow produces a signal line
- **WHEN** the change has more than 15 decisions+risks+resolved-questions items combined
- **THEN** the summary SHALL print up to 14 content lines plus one `+N more — see …` line, never exceeding 15 non-blank lines total, and SHALL NOT silently omit items without the signal

#### Scenario: No overflow when items fit
- **WHEN** the change has 15 or fewer decisions+risks+resolved-questions items combined
- **THEN** the summary SHALL print exactly one line per item with no `+N more` signal
