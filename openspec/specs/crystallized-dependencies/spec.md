# crystallized-dependencies Specification

## Purpose
Preserve immediate slice dependencies inside crystallized work blocks and validate complete sets before storage, delivery and publication, with deterministic blocker-first ordering and safe stored-block amendments.

## Requirements

### Requirement: Immediate dependencies travel inside crystallized blocks

Newly emitted slice blocks SHALL carry `**Depends on**` immediately after Change name, containing comma-separated immediate change names or `None`. The field SHALL remain inside the stored text and its hash. Older blocks without the field SHALL mean no dependencies. Branch ancestry and execution order SHALL NOT introduce dependency edges.

#### Scenario: Separately delivered dependent slice

- **WHEN** a dependent slice is stored and subsequently delivered on its own
- **THEN** its dependency line remains in the delivered text and contributes to the block hash.

#### Scenario: Legacy independent block

- **WHEN** an older block has no dependency field
- **THEN** dependency interpretation returns an empty dependency list.

### Requirement: Individual and complete-set dependency validation have distinct boundaries

The shared Ready to Propose validator SHALL reject malformed comma-separated references, empty declared dependency values, duplicate dependency fields, duplicate references and self references. Individual block validation SHALL permit references to slices not supplied with that block. Complete-set validation SHALL additionally require all referenced change names to exist in the set and SHALL reject cycles.

#### Scenario: Singleton references another slice

- **WHEN** a single valid block refers to another change not included in the supplied text
- **THEN** individual validation accepts that reference while complete-set validation rejects the missing member.

#### Scenario: Invalid graph

- **WHEN** a complete set contains a duplicate reference, self reference, absent dependency or cycle
- **THEN** validation reports the applicable violation and the set does not proceed.

### Requirement: Dependency order is stable and blocker-first

Complete-set validation SHALL return a deterministic order placing dependencies before their dependents. Among currently eligible blocks it SHALL choose the earliest block in the original set. The returned order SHALL govern stored execution inventory and GitHub set publication without adding dependency edges or renumbering agreed slice identities.

#### Scenario: Dependent appears before its blocker

- **WHEN** the original set lists a dependent before a blocker
- **THEN** the returned order places the blocker first and preserves the original selection order among eligible independent blocks.

### Requirement: Complete sets validate before storage delivery and publication

Crystallization SHALL validate the complete dependency set before storage and display. `sai-state` SHALL apply the same validator before recording the inventory, and GitHub set publication SHALL apply it before preparing a publishable proposal. Invalid sets SHALL record no inventory. Syntax correction SHALL NOT invent or remove agreed dependencies; corrections requiring changed agreements SHALL require a user decision.

#### Scenario: Missing member before emission

- **WHEN** a complete block emit references a missing change
- **THEN** emission reports invalid dependencies without replacing stored blocks or recording a new inventory.

### Requirement: Amendments preserve valid complete-set state

Before replacing a stored block, `sai-state` SHALL validate the resulting complete set. An invalid amendment SHALL leave stored text and hashes unchanged. An amendment that changes the computed dependency order SHALL be rejected with `AMEND_REQUIRES_SET_REEMISSION` rather than changing execution inventory underneath running or completed work. Accepted amendments SHALL recompute the amended block's hash.

#### Scenario: Amendment introduces a cycle

- **WHEN** a proposed amendment creates a cycle in the stored set
- **THEN** the amendment fails and the previously stored blocks and hashes remain unchanged.

#### Scenario: Amendment changes execution order

- **WHEN** a valid proposed amendment would change the existing dependency order
- **THEN** the store rejects it and requires complete-set re-emission.

#### Scenario: Content amendment preserves dependency order

- **WHEN** valid block content changes without changing dependency order
- **THEN** the store accepts the amendment and recomputes its hash.
