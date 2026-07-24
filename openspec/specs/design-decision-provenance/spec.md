# design-decision-provenance Specification

## Requirements

### Requirement: Every Decision carries a provenance marker

`sai/instructions/design.md` SHALL require that every entry in the `## Decisions` section of `openspec/changes/{name}/design.md` carries exactly one provenance marker drawn from a closed set of three tokens:

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

### Requirement: Provenance signals what is re-litigable

The provenance marker's purpose SHALL be stated in `sai/instructions/design.md`: it tells a downstream reader which decisions may be reopened without new information and which may not.

A `derived` decision SHALL be understood as reopenable by a reviewer on reasoning alone. A `user` decision SHALL NOT be reversed by any downstream phase without the user; the agent SHALL route back to the user instead. A `codebase-forced` decision SHALL NOT be reopened without a codebase fact that contradicts the stated constraint.

#### Scenario: downstream phase encounters a user decision it disagrees with

- **WHEN** a downstream phase would prefer a different approach than one marked `user`
- **THEN** it routes the disagreement back to the user rather than silently substituting its own choice

#### Scenario: reviewer reopens a derived decision

- **WHEN** a reviewer disagrees with a decision marked `derived`
- **THEN** the marker signals the decision may be reopened on reasoning alone, with no new codebase evidence required

### Requirement: Provenance is recorded, not mechanically enforced

`sai/instructions/design.md` SHALL state that provenance markers depend on the design agent honestly recording who decided what, and that no mechanical validator verifies a marker's accuracy. The requirement SHALL NOT claim enforcement it does not have.

#### Scenario: instruction does not overclaim enforcement

- **WHEN** the provenance rule is written into `sai/instructions/design.md`
- **THEN** it describes an authoring discipline
- **AND** it does NOT assert that any tool, gate, or downstream phase validates marker correctness

### Requirement: Provenance markers do not alter the ADR/DDR evaluation

The existing three-criteria ADR/DDR evaluation for each decision (hard to reverse, surprising without context, real trade-off) SHALL remain unchanged and independent of the provenance marker. A decision SHALL be evaluated against those criteria regardless of which provenance token it carries.

#### Scenario: ADR criteria applied to a codebase-forced decision

- **WHEN** a decision is marked `codebase-forced`
- **THEN** it is still evaluated against the three ADR/DDR criteria
- **AND** the marker alone does not exempt it from documenting alternatives-considered when all three criteria apply
