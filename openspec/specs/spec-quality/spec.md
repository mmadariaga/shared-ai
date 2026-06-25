# spec-quality Specification

## ADDED Requirements

### Requirement: Decision summary printed at end of spec phase

When `sai/commands/sai-1-spec.md` reaches its Completion section, the agent SHALL print a structured decision summary to the screen before the mandatory stop message. The summary is derived exclusively from the artifacts just written (`proposal.md` and `specs/**/*.md`) — not from prior conversation.

The summary SHALL contain two blocks:
- **Scope**: one line per capability listed in the proposal's Capabilities section (new and modified).
- **Requirements**: one line per requirement across all spec files, grouped by capability.

#### Scenario: Summary printed before mandatory stop message
- **WHEN** the agent has written all spec artifacts and reaches the Completion section
- **THEN** the agent SHALL print the decision summary first, then print the mandatory stop message ("Spec proposal done in openspec/changes/{name}/...") as the LAST line

#### Scenario: Summary respects hard line cap
- **WHEN** the decision summary is composed
- **THEN** the total output SHALL NOT exceed 15 lines (excluding blank separator lines)

#### Scenario: Summary is derived from artifacts, not conversation
- **WHEN** the agent generates the decision summary
- **THEN** every line in the summary SHALL trace to content in `proposal.md` or `specs/**/*.md` just written; no information from prior conversation SHALL appear

### Requirement: One line per decision in summary

Each capability in the Scope block and each requirement in the Requirements block SHALL be expressed in exactly one line. No multi-line descriptions.

#### Scenario: Scope block has one line per capability (when items fit under the cap)
- **WHEN** the proposal lists 3 capabilities (2 new, 1 modified) AND the total scope+requirements count is within the 15-line cap
- **THEN** the Scope block SHALL contain exactly 3 lines, one per capability

#### Scenario: Requirements block has one line per requirement (when items fit under the cap)
- **WHEN** a spec file defines 4 requirements AND the total scope+requirements count is within the 15-line cap
- **THEN** the Requirements block for that capability SHALL contain exactly 4 lines

#### Scenario: Empty blocks are omitted
- **WHEN** the proposal declares zero modified capabilities, or zero requirements for a given capability
- **THEN** the corresponding empty Scope or Requirements subsection SHALL be omitted entirely; the block header is not printed as an empty shell

### Requirement: Items omitted under the hard cap are signaled

When the total count of scope and requirements items would exceed the hard 15-line cap, the agent SHALL compress by trimming only the largest block(s) (preserving the highest-priority items — capabilities before requirements), reserve one slot for a single trailing signal line of the form `+N more — see openspec/changes/{name}/specs/**` (where N is the count of omitted items), and emit that signal line as the last line of the summary block. Silent drops are forbidden.

#### Scenario: Overflow produces a signal line
- **WHEN** the change has more than 15 scope+requirements items combined
- **THEN** the summary SHALL print up to 14 content lines plus one `+N more — see …` line, never exceeding 15 non-blank lines total, and SHALL NOT silently omit items without the signal

#### Scenario: No overflow when items fit
- **WHEN** the change has 15 or fewer scope+requirements items combined
- **THEN** the summary SHALL print exactly one line per item with no `+N more` signal
