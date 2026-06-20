## ADDED Requirements

### Requirement: Priority Stack Section In Implementation Instructions

The implementation instructions (`sai/instructions/implement.md`) SHALL contain a section titled `## Code Quality Priority Stack`, placed immediately after the `## Hard Rules` section. The section MUST define exactly six code-quality rules in a fixed priority order, where a lower number outranks a higher number:

1. YAGNI — do not build behavior, abstraction, or configurability that is not required by the current change.
2. SOLID (object-oriented designs only), expressed operationally.
3. Self-documenting code and clean-code naming/structure.
4. Dependency ladder — prefer an already-installed project dependency over the standard library, and the standard library over a native platform feature. Do not add a new dependency if any of the previous rungs covers the need.
5. No boilerplate (unless it is project standard), DRY, deletion over addition, and "boring over clever" — remove duplication, prefer deleting and rewriting over patching, and choose the obvious single implementation path.
6. Minimum surface area — the least code, configuration, and public API necessary.

#### Scenario: Section present and ordered

- **WHEN** a reader inspects `sai/instructions/implement.md`
- **THEN** a `## Code Quality Priority Stack` section exists directly after `## Hard Rules`
- **AND** it lists the six rules in the exact priority order above, numbered so that a lower number outranks a higher one

### Requirement: SOLID Stated Operationally

Within the priority stack, the SOLID rule MUST be expressed as concrete, checkable behaviors (for example: a unit has one reason to change; new behavior is added by extension without breaking existing callers) and MUST NOT be stated as the bare slogan "follow SOLID". This keeps it consistent with `sai/instructions/design.md`, which rejects generic best-practices such as "follow SOLID" or "write clean code" as project Conventions.

#### Scenario: No generic SOLID slogan

- **WHEN** the SOLID rule in the priority stack is read
- **THEN** it describes at least one operational, checkable behavior
- **AND** it does not rely on the phrase "follow SOLID" as its definition

### Requirement: Project-Alignment Meta-Rule Overrides The Stack

The section MUST define a single meta-rule stating that alignment with the conventions and patterns of the surrounding codebase outranks every numbered rule in the stack, subject to a minimum-violation budget. When following a numbered rule would diverge from an established pattern in the code being changed, the implementation agent MUST follow the established pattern AND break the fewest additional numbered rules as possible.

#### Scenario: Existing pattern wins over a lower-priority rule

- **WHEN** applying a numbered rule (e.g. the dependency ladder) would contradict an established convention already present in the surrounding code
- **THEN** the meta-rule directs the agent to follow the existing convention
- **AND** the numbered rule yields

#### Scenario: Minimum-violation budget caps the override

- **WHEN** following the established pattern itself would require breaking a higher-priority numbered rule
- **THEN** the meta-rule does not apply unconditionally
- **AND** the agent selects the path that breaks the fewest total numbered rules

### Requirement: Deterministic Resolution Of Quality Tensions

The priority order MUST act as a deterministic tie-breaker when two rules pull in different directions: the rule with the lower priority number wins. The section MUST make this resolution behavior explicit so the implementation agent does not have to improvise.

#### Scenario: YAGNI outranks honoring an abstraction

- **WHEN** an existing abstraction invites speculative generality that the current change does not need
- **THEN** YAGNI (rule 1) outranks the lower-priority rules
- **AND** the agent omits the unneeded generality

#### Scenario: Project dependency preferred over standard library

- **WHEN** the project already has a dependency that covers a capability that the standard library could also provide
- **THEN** the dependency ladder (rule 4) directs the agent to use the project's existing dependency
- **AND** the agent does not introduce a stdlib-based rewrite in place of the existing project dependency

#### Scenario: Standard library preferred over a new dependency

- **WHEN** a capability can be met by the standard library or by adding a new third-party dependency
- **THEN** the dependency ladder (rule 4) directs the agent to use the standard library
- **AND** a new dependency is added only when no project dependency, no standard library, and no native platform feature covers the need

### Requirement: Review Maintainability Rule References The Stack

The Maintainability review category in `sai/instructions/review.md` SHALL reference the Code Quality Priority Stack as the resolution order for code-quality tensions, in a single added sentence, rather than restating the six rules. The reference MUST NOT duplicate the rule list.

#### Scenario: Reviewer cites the stack without duplicating it

- **WHEN** the Maintainability category in `review.md` is read
- **THEN** it points to the Code Quality Priority Stack as the tie-breaking order
- **AND** it does not re-enumerate the six rules
