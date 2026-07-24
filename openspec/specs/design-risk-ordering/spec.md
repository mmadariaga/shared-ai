# design-risk-ordering Specification

## Requirements

### Requirement: A risk may carry a verify-first ordering marker

`sai/instructions/design.md` SHALL permit each entry in the `## Risks / Trade-offs` section of `openspec/changes/{name}/design.md` to carry an optional verify-first marker naming the `## Step N` the risk gates.

The marker SHALL name a specific step by its integer key — not "early", "before implementation", or another vague ordering phrase. Its meaning SHALL be: the risk must be resolved or disproven *before* the named step is executed, because that step's design depends on the answer.

The marker is optional. A risk with no ordering dependency SHALL carry no marker; the section SHALL NOT emit a placeholder for it.

#### Scenario: risk names the step it gates

- **WHEN** a risk must be resolved before a particular step can be implemented as designed
- **THEN** the risk entry names that step by its integer `Step N` key

#### Scenario: risk with no ordering dependency

- **WHEN** a risk is a general limitation with no step it gates
- **THEN** the risk entry carries no verify-first marker
- **AND** no placeholder or empty marker is emitted

#### Scenario: vague ordering language rejected

- **WHEN** a verify-first marker is written
- **THEN** it cites a concrete `Step N`
- **AND** it does NOT use unanchored phrases such as "early" or "before implementation"

### Requirement: tasks.md derivation consumes verify-first markers as ordering constraints

When `sai-2-design` derives the step sequence for `openspec/changes/{name}/tasks.md`, it SHALL treat every verify-first marker in `design.md` as an ordering constraint on that sequence: the work that resolves the risk SHALL be sequenced before the step the marker names.

The resolving work SHALL be placed either inside an earlier step or as its own earlier step. A verify-first marker SHALL NOT be satisfied by prose alone in the gated step.

Verify-first ordering constraints SHALL compose with the existing dependency ordering rule; where the two conflict, the design agent SHALL surface the conflict rather than silently dropping either constraint.

#### Scenario: gated step sequenced after its resolving work

- **WHEN** a risk carries a verify-first marker naming `Step 4`
- **THEN** the work that resolves or disproves that risk appears in a step numbered lower than 4 in `tasks.md`

#### Scenario: marker not satisfied by prose

- **WHEN** a step is named by a verify-first marker
- **THEN** the resolving work is an actual sequenced step or part of an earlier step
- **AND** it is NOT merely mentioned in the gated step's `**What Will Be Done**` prose

#### Scenario: verify-first conflicts with dependency order

- **WHEN** a verify-first marker requires an ordering that contradicts the steps' dependency ordering
- **THEN** the design agent surfaces the conflict to the user
- **AND** it does NOT silently drop either the verify-first marker or the dependency constraint

### Requirement: Verify-first markers are distinct from Open Questions

A verify-first marker SHALL NOT be treated as an Open Question and SHALL NOT be routed through the blocking Open Questions gate. A risk with a verify-first marker is a known risk with a known resolution point; an Open Question is an unresolved unknown that blocks `tasks.md` generation entirely.

#### Scenario: verify-first risk does not block tasks.md generation

- **WHEN** a risk carries a verify-first marker
- **THEN** `tasks.md` generation proceeds, with the marker applied as an ordering constraint
- **AND** the risk is NOT moved into `## Open Questions` and does NOT block generation
