# merge-worker-discipline Specification

## Purpose
TBD - created by archiving change merge-worker-closed-read-list. Update Purpose after archive.
## Requirements
### Requirement: Merge worker closed read list

The merge worker SHALL open only the fetches its contract names: the verified-precondition handback policy, the worker-core contract, and the merge instructions. It SHALL NOT proactively open any other file under `sai/commands/merge/`, explicitly including `coordinator.md`, `presentation.md`, and `lifecycle.md`. It SHALL NOT proactively open policy spec records for `sai-merge-command` or `question-context-policy`, while `sai/policies/question-context.md` stays required via `worker-core`. Affected repository content reads for conflicted specs and ADR/DDR records and indexes of the affected group are permitted only when the active step requires them and carry no closed path list.

#### Scenario: Proactive supervisor and spec reads are refused

- **WHEN** the worker considers opening an unnamed file under `sai/commands/merge/` or an unnamed policy spec record
- **THEN** it does not open that file and proceeds with only its named fetches plus step-required repository content

#### Scenario: Step-required repository content remains readable

- **WHEN** the active merge step requires a conflicted spec or an ADR/DDR record or index of the affected group
- **THEN** the worker reads that repository content for that step only

### Requirement: English summary default until working language selected

The merge worker SHALL write summaries in English until a `working_language` is selected and in the selected working language thereafter. Pinned questions and stop texts SHALL stay verbatim in every language state.

#### Scenario: Pre-handoff summary stays English

- **WHEN** no `working_language` has been selected yet
- **THEN** the worker summary is English and every pinned question and stop text is byte-identical

#### Scenario: Post-handoff summary follows the selected language

- **WHEN** a `working_language` has been selected through the conflict hand-off continuation
- **THEN** later explanations, strategy revisions, and analyses use that language while pinned literals stay verbatim

### Requirement: Settled read-only checks are not repeated in the same stretch

The merge worker SHALL NOT repeat a read-only check with a definitive answer within the same stretch.

#### Scenario: Definitive single-file result is reused

- **WHEN** a read-only check such as a no-collision determination has a definitive answer earlier in the same stretch
- **THEN** the worker reuses that answer without re-reading, re-scanning, or re-deliberating it

