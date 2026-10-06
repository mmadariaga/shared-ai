# merge-worker-discipline Specification

## Purpose
Defines the merge worker's closed read list, its summary language before and after the working-language hand-off, and its reuse of settled read-only checks.

## Requirements

### Requirement: Merge worker closed read list

The merge worker SHALL open only the fetches its contract names: the verified-precondition handback policy, the worker-core contract, and the tool-resolution policy, plus the instruction sections disclosed for its active stage. It SHALL NOT fetch the entire merge instruction library or proactively open any other file under `sai/commands/merge/`, explicitly including `coordinator.md`, `presentation.md`, and `lifecycle.md`. It SHALL NOT proactively open policy spec records for `sai-merge-command` or `question-context-policy`, while `sai/policies/question-context.md` stays required via `worker-core`. Affected repository content reads for conflicted specs and ADR/DDR records and indexes of the affected group are permitted only when the active stage requires them and carry no closed path list.

#### Scenario: Proactive supervisor and spec reads are refused

- **WHEN** the worker considers opening an unnamed file under `sai/commands/merge/` or an unnamed policy spec record
- **THEN** it does not open that file and proceeds with only its named fetches plus step-required repository content

#### Scenario: Step-required repository content remains readable

- **WHEN** the active merge step requires a conflicted spec or an ADR/DDR record or index of the affected group
- **THEN** the worker reads that repository content for that step only

#### Scenario: Instruction library is disclosed selectively

- **WHEN** the worker receives an active-stage command
- **THEN** it reads the returned selected sections instead of proactively fetching the whole library or future sections

### Requirement: English summary default until working language selected

The merge worker SHALL write summaries in English until a `working_language` is selected and in the selected working language thereafter. Pinned questions and stop texts SHALL stay verbatim in every language state.

#### Scenario: Pre-handoff summary stays English

- **WHEN** no `working_language` has been selected yet
- **THEN** the worker summary is English and every pinned question and stop text is byte-identical

#### Scenario: Post-handoff summary follows the selected language

- **WHEN** a `working_language` has been selected through the conflict hand-off continuation
- **THEN** later explanations, strategy revisions, and analyses use that language while pinned literals stay verbatim

### Requirement: Settled read-only checks are not repeated in the same stretch

The merge worker SHALL NOT repeat a read-only check with a definitive answer while its dependencies remain valid, including across stretches. It SHALL use retained mechanical receipts instead of deriving their facts again and SHALL verify receipt validity before reuse. Writes, Git operations, new conflicts, and other state changes SHALL invalidate only receipts whose dependencies changed. Unverifiable or stale evidence SHALL be recollected; immutable captured provenance SHALL remain historical evidence after launch rather than being replaced with current SHAs. Retained semantic analysis SHALL be updated only for new context or changed evidence.

#### Scenario: Definitive single-file result is reused

- **WHEN** a read-only check such as a no-collision determination has a definitive answer earlier in the same stretch
- **THEN** the worker reuses that answer without re-reading, re-scanning, or re-deliberating it

#### Scenario: Valid receipt survives a continuation

- **WHEN** a later stretch needs a fact and its recorded dependencies still match
- **THEN** the worker reuses the retained result without repeating collection or settled semantic deliberation

#### Scenario: Unrelated changes do not invalidate settled metadata

- **WHEN** a repository change leaves the dependencies of a suite-detection receipt unchanged
- **THEN** the receipt remains reusable and only affected facts are recollected

#### Scenario: Stale evidence is not reused

- **WHEN** receipt validity cannot be verified or a recorded dependency changed
- **THEN** the worker recollects the affected fact rather than assuming its earlier result remains true

### Requirement: Active-stage merge instruction disclosure

After ready and on every continuation, the coordinator SHALL provide an exact `Active stage:` pointer naming the resolved `merge.js instructions --stage <stage>` command and the complete necessary current task state. The worker SHALL execute that disclosure command, follow only its selected authoritative instruction sections, return at the active stage's hand-off, and await the next pointer. Stages SHALL cover preflight, detection, strategy, application, verification, collision analysis, and finalization. Ordinary same-worker continuations SHALL NOT load the entire instruction library or future stage bodies. The same persistent worker SHALL retain previously disclosed context, which SHALL NOT authorize later work. Initial preflight disclosure SHALL include common evidence rules once; replacement disclosure at another stage SHALL use reconstruction delivery to include those rules.

#### Scenario: Initial task follows ready

- **WHEN** the worker returns ready and receives its first merge task
- **THEN** it receives the preflight pointer and current task state without disclosure of future stage bodies

#### Scenario: Strategy revision returns to analysis

- **WHEN** a new conflict or strategy revision changes the proposed resolution
- **THEN** the coordinator discloses strategy work and the complete strategy is analyzed and presented before application under the existing mode-specific hand-off

#### Scenario: Active task ends at its hand-off

- **WHEN** the worker completes a strategy, resolution, verification, or collision task
- **THEN** it returns that stage's result without executing an undisclosed later stage

#### Scenario: Replacement receives common rules

- **WHEN** a replacement worker starts at a stage other than preflight
- **THEN** its disclosure includes the reconstruction option and common evidence rules before it uses stage evidence

### Requirement: Complete merge continuation and replacement state

Continuation and replacement disclosure SHALL carry complete stage-applicable state: the active stage, exact external references and hashes, affected paths with categories and region and stage identifiers, necessary valid receipts, original provenance, working language, exact strategy and revision and confirmation state, selected semantic decisions, pending corrections, review and verification counters and outcomes with full failure references, collision applicability and complete plans, owned and staged paths, operation history, current outcome, and the changed-files union. Inventories SHALL be exhaustive and SHALL NOT depend on abbreviated phrases such as `and others; see earlier`. Replacement SHALL reconstruct from supplied state and verified external references rather than a prior journal or assumed prior context. Missing reconstruction data or unverifiable required references SHALL stop execution before writing or finalizing.

#### Scenario: Replacement resumes from exact evidence

- **WHEN** a worker is replaced during resolution or verification
- **THEN** the replacement verifies the supplied external references and supporting receipt validity and resumes only with complete stage-applicable state

#### Scenario: Incomplete inventory blocks execution

- **WHEN** reconstruction omits an affected path, strategy confirmation, required counter, or required evidence reference
- **THEN** the worker reports the precise missing state and performs no write or finalization

#### Scenario: Full failure evidence remains reachable

- **WHEN** a failed verification result is carried into a continuation or replacement
- **THEN** its exact external reference and checksum preserve the full command outcome and output needed for analysis
