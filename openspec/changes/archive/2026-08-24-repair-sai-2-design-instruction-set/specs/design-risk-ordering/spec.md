## MODIFIED Requirements

### Requirement: A risk may carry a verify-first ordering marker
The active design step authority at `sai/commands/design/steps/design.md` SHALL permit each entry in the `## Risks / Trade-offs` section of `openspec/changes/{name}/design.md` to carry an optional verify-first marker naming the `## Step N` the risk gates, without duplicating paragraph-scale ordering guidance across retired instruction surfaces.

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

#### Scenario: verify-first-rule-is-bounded
- **WHEN** a design risk gates a specific step
- **THEN** the active rule names that integer `Step N` and does not use vague ordering language.

