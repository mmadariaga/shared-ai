# apply-taxonomy-reclassification Specification

## Purpose

Defines the `GLOSSARY.md` vocabulary of the RED and GREEN workers of `/sai-3-implement`. (The capability was first written to reclassify the retired `/sai-4-apply`.)

## Requirements

### Requirement: glossary-red-green-vocabulary

`GLOSSARY.md` SHALL define the RED Worker and GREEN Worker terms with the `/sai-3-implement` worker model: the RED Worker is the managed worker (`sai-3-red-worker`) that lives for the whole run and writes each step's failing tests and the interface stubs they import, with no production logic, and the GREEN Worker is the managed worker (`sai-3-green-worker`) that lives for the whole run and writes each step's production code under an absolute test-file and `interfaces.md` prohibition.

#### Scenario: glossary defines the two workers

- **WHEN** `GLOSSARY.md` is read after the change
- **THEN** it contains exactly one **RED Worker** entry and exactly one **GREEN Worker** entry with the worker-model definitions above

#### Scenario: stale no-boundary statements are removed

- **WHEN** `GLOSSARY.md` is read after the change
- **THEN** no entry describes an apply command or a coordinator-less implementation flow
