# terminology-agreement Specification

## Purpose
TBD - created by archiving change explore-own-maturation. Update Purpose after archive.
## Requirements
### Requirement: Ambiguous terms SHALL be fixed in conversation before edge-case review

Before the edge-case review, explore SHALL fix ambiguous terms in conversation.

#### Scenario: Terms fixed before edge cases
- **WHEN** ambiguous terms exist before the edge-case review
- **THEN** explore fixes them in conversation before presenting the formal list

### Requirement: Agreed terms SHALL travel as the block Terms section

Agreed terms SHALL travel as the block's Terms section, each as term with definition, with exactly one None bullet when no term was agreed.

#### Scenario: Agreed terms travel in block
- **WHEN** terms were agreed before edge cases
- **THEN** the crystallized block carries them in Terms in their established order

### Requirement: Explore SHALL perform no file writes and never write GLOSSARY.md

Explore SHALL perform no file writes for terminology work and SHALL never write GLOSSARY.md.

#### Scenario: Terminology stays conversation-only
- **WHEN** terminology is agreed during exploration
- **THEN** explore keeps the agreement in conversation and writes no GLOSSARY.md entry

### Requirement: Block structure SHALL place Terms after Key constraints and before Edge Cases

The block SHALL place Terms immediately after Key constraints and immediately before Edge Cases, rendering agreed terms in order or exactly one None bullet, with Implementation Details after Edge Cases and Overview language last.

#### Scenario: Terms ordering preserved
- **WHEN** the block is emitted with agreed terms and edge cases
- **THEN** Terms appears after Key constraints and before Edge Cases in the emitted order

### Requirement: Translated-surface scaffolding SHALL retain the Terms label in English

The crystallization language gate SHALL keep the Terms bold field label in English regardless of the chosen language, like the other scaffolding labels.

#### Scenario: Terms label stays English
- **WHEN** the block is rendered in a non-English crystallization language
- **THEN** the Terms label remains in English while free-text prose follows the chosen language

