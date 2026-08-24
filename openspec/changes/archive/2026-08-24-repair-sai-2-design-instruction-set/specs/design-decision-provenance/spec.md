## MODIFIED Requirements

### Requirement: Every Decision carries a provenance marker
The active design step authority at `sai/commands/design/steps/design.md` SHALL require that every entry in the `## Decisions` section of `openspec/changes/{name}/design.md` carries exactly one provenance marker drawn from a closed set of three tokens:

- `user` — the user stated or chose this; the design agent did not decide it.
- `derived` — the design agent reasoned to it from the proposal, the specs, or the trade-offs; no external constraint forced it.
- `codebase-forced` — the existing codebase, stack, or an external dependency leaves no alternative.

The marker SHALL be emitted for every Decision, including decisions the agent considers obvious. No new tokens SHALL be invented.

The three tokens are **total** — every decision falls under one of them. Decisions with mixed provenance (for example: the user chose the direction, the codebase forced the mechanism) are common and SHALL NOT be treated as misfits. They are resolved by precedence, not escalated:

**`user` > `codebase-forced` > `derived`** — when more than one token applies, the highest-precedence applicable token is emitted.

The precedence order follows re-litigability: a decision the user touched at all is the least freely reopenable downstream, so `user` dominates. A mixed-provenance decision SHALL NOT be raised as an Open Question, and provenance tagging SHALL NEVER block `tasks.md` generation.

#### Scenario: each Decision is tagged
- **WHEN** `sai-2-design` writes the `## Decisions` section of `design.md`
- **THEN** every decision entry carries exactly one of `user`, `derived`, or `codebase-forced`

#### Scenario: a user-stated decision is marked user
- **WHEN** the user explicitly chose an approach during the design conversation or stated it in the proposal
- **THEN** the corresponding Decision is marked `user`

#### Scenario: a constraint with no alternative is marked codebase-forced
- **WHEN** the existing stack or an external dependency admits only one viable approach
- **THEN** the corresponding Decision is marked `codebase-forced`
- **AND** it is NOT marked `derived`, because no genuine alternative existed

#### Scenario: mixed provenance resolved by precedence
- **WHEN** the user chose a decision's direction and the codebase forced its mechanism
- **THEN** the Decision is marked `user`, because `user` outranks `codebase-forced`
- **AND** it is NOT raised as an Open Question and does NOT block `tasks.md` generation

#### Scenario: derived yields to any stronger token
- **WHEN** the agent reasoned to a decision that an external dependency also constrains
- **THEN** the Decision is marked `codebase-forced`, because `derived` is the lowest-precedence token

#### Scenario: no token is ever invented
- **WHEN** a decision seems to fit none of the three tokens cleanly
- **THEN** the agent SHALL NOT invent a fourth token
- **AND** it applies the precedence rule to select among the tokens that partially apply, since the three are total

#### Scenario: provenance-rule-source-is-single
- **WHEN** the design worker writes a decision
- **THEN** it uses the active step-owned provenance rule and emits exactly one closed-set marker.

