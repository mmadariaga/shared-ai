## ADDED Requirements

### Requirement: Explorer consults decision-record indexes as research inputs

The explorer SHALL recognize that Architecture Decision Records (ADRs) and Design Decision Records (DDRs) maintain relational indexes at `docs/adr/0000-INDEX.md` and `docs/ddr/0000-INDEX.md` respectively. When present, these indexes record which decisions currently govern specific domains and which prior decisions have been superseded — information that is not inferable from repository text alone.

#### Scenario: Index path discovery

- **WHEN** the explorer is researching a decision and determines that an index is relevant to understanding the current governance or historical status of that decision
- **THEN** the explorer knows to look for the indexes at their canonical paths and can navigate their five-section skeleton structure

### Requirement: Explorer understands decision-record index structure

The explorer SHALL understand the canonical five-section structure of decision-record indexes: Conventions (relationship-token definitions), By <domain unit> (entries grouped by domain), Cross-cutting categories, extension/correction tables, and Superseded (historical). The explorer MUST recognize that the <domain unit> noun is project-specific while the five-section skeleton itself is contract.

#### Scenario: Domain-specific navigation

- **WHEN** the explorer reads an index organized by a project-specific <domain unit> such as "By command" or "By endpoint"
- **THEN** the explorer understands that this structure is project-derived and can navigate entries without assuming specific subsection names

### Requirement: Explorer decodes decision-record relationship tokens

The explorer SHALL interpret the closed set of relationship tokens used in decision-record entries: `— Pair with NNNN`, `— Refs NNNN`, `— **Amends** NNNN`, `— **Reframes** NNNN`, `— **Reverses** NNNN`, and `— Supersedes NNNN`. Cross-family references use prefixed identifiers: `adr:NNNN` and `ddr:NNNN`.

#### Scenario: Cross-family reference resolution

- **WHEN** an ADR entry references another decision using a cross-family token (e.g., `— Refs ddr:0042`)
- **THEN** the explorer recognizes this as a DDR reference and can correlate decisions across the ADR and DDR families

### Requirement: Explorer distinguishes current from historical decisions

The explorer SHALL recognize that superseded entries are relocated from the grouping sections (`## By <domain unit>` and `## Cross-cutting categories`) into the historical section (`## Superseded <family> (historical)`). When an entry is marked with `*Superseded by*` or appears in the historical section, the explorer MUST report that decision as superseded rather than as currently in force.

#### Scenario: Superseded decision reporting

- **WHEN** the explorer encounters a decision record in the historical section or marked with `*Superseded by*`
- **THEN** the explorer reports the decision as superseded and identifies the superseding decision, preventing the user from treating an obsolete decision as current governance

### Requirement: Explorer makes independent relevance judgments

The explorer SHALL independently determine whether consulting a decision-record index serves its current task. The explorer's choice to skip an index that does not serve the task is valid and SHALL NOT be recorded in any structured field or treated as a failure.

#### Scenario: Selective index consultation

- **WHEN** a task is about fixing a bug in a specific module and the explorer does not find decision-governance questions raised
- **THEN** the explorer may reasonably determine that consulting the decision-record index is not relevant and proceed without it, incurring no penalty
