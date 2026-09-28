# rerun-guard-restructure Specification

## Purpose
Keep the `/sai-3-implement` re-run guard a dedicated, self-contained step of the implement step library.

## Requirements
### Requirement: The re-run guard SHALL be its own step file

The re-run guard SHALL live in `sai/commands/implement/steps/collapse-implemented-steps.md`, delivered under the `collapse-implemented-steps` progress-plan id. It SHALL run only on a re-run, when `implementation.md` exists at the start of the invocation; on a first run its id is reported in the startup batch and the step is never delivered.

#### Scenario: re-run guard is a dedicated step
- **WHEN** the implement step library is read
- **THEN** `collapse-implemented-steps.md` holds the re-run guard and no other step file restates it

---

### Requirement: The re-run guard SHALL delegate through a self-contained subagent prompt

The re-run guard step SHALL direct the worker to delegate the read and rewrite of `implementation.md` to one `budget-subagent` and to act only on its report, followed by a complete, self-contained numbered prompt for that subagent.

#### Scenario: delegation directive is explicit
- **WHEN** the re-run guard step is read
- **THEN** it directs the worker to delegate the read and rewrite to one `budget-subagent` and act only on its report

#### Scenario: subagent prompt is self-contained
- **WHEN** the re-run guard step is read
- **THEN** it contains a numbered prompt listing all steps the subagent must perform (read file, evaluate checkboxes, collapse fully-checked steps, prune matching `interfaces.md` contracts, write back, report)
