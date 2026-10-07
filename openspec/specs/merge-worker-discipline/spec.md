# merge-worker-discipline Specification

## Purpose
Defines the merge worker's closed read list, its summary language before and after the working-language hand-off, and its reuse of settled read-only checks.

## Requirements

### Requirement: Merge worker closed read list

The merge worker SHALL open only the fetches its contract names: the verified-precondition handback policy, the worker-core contract, and the tool-resolution policy, plus the instruction sections disclosed for its active stage. It SHALL NOT fetch the entire merge instruction library or proactively open any other file under `sai/commands/merge/`, explicitly including `coordinator.md`, `coordinator-stages.md`, `presentation.md`, and `lifecycle.md`. It SHALL NOT proactively open policy spec records for `sai-merge-command` or `question-context-policy`, while `sai/policies/question-context.md` stays required via `worker-core`. Affected repository content reads for conflicted specs and ADR/DDR records and indexes of the affected group are permitted only when the active stage requires them and carry no closed path list.

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

After ready and on every continuation, the coordinator SHALL provide an exact `Active stage:` pointer naming the resolved `merge.js instructions --stage <stage>` command and the complete necessary current task state. The worker SHALL execute that disclosure command, follow only its selected authoritative instruction sections, return at the active stage's hand-off, and await the next pointer. Worker stages SHALL be `strategy`, `apply`, `test-correction`, and `renumbering-plan`; preflight, conflict detection, the test run, the collision check, and closure are coordinator stages and SHALL NOT be disclosed to the worker as tasks. Ordinary same-worker continuations SHALL NOT load the entire instruction library or future stage bodies. The same persistent worker SHALL retain previously disclosed context, which SHALL NOT authorize later work. The first task of a worker and the first task of a replacement SHALL use reconstruction delivery, which adds the common evidence rules, the side mapping, and the provenance definition once.

#### Scenario: Initial task follows ready

- **WHEN** the worker returns ready and receives its first merge task
- **THEN** it receives the pointer for the active judgment stage in its reconstruction form with the complete current state and without disclosure of future stage bodies

#### Scenario: Strategy revision returns to analysis

- **WHEN** a new conflict or strategy revision changes the proposed resolution
- **THEN** the coordinator discloses strategy work and the complete strategy is analyzed and presented before application under the existing mode-specific hand-off

#### Scenario: Active task ends at its hand-off

- **WHEN** the worker completes a strategy, resolution, test-correction, or renumbering-plan task
- **THEN** it returns that stage's result without executing an undisclosed later stage

#### Scenario: Replacement receives common rules

- **WHEN** a replacement worker starts at the active judgment stage
- **THEN** its disclosure includes the reconstruction option and common evidence rules before it uses stage evidence

### Requirement: Complete merge continuation and replacement state

First-dispatch, continuation, and replacement disclosure SHALL carry complete stage-applicable state: the active stage, exact external references and hashes, affected paths with categories and region identifiers, necessary valid receipts, original provenance, working language, exact strategy and revision and confirmation state, selected semantic decisions, pending corrections, review and verification counters and outcomes with full failure references, collision applicability and complete plans, owned and staged paths, operation history, current outcome, and the changed-files union. The disclosure SHALL NOT carry stage blob identifiers; the worker obtains conflict content through the merge tool's `bundle` action on the disclosed snapshot reference and hash. Inventories SHALL be exhaustive and SHALL NOT depend on abbreviated phrases such as `and others; see earlier`. A first dispatch and a replacement SHALL both start from supplied state and verified external references rather than a prior journal or assumed prior context, because the worker saw none of the earlier stages. Missing reconstruction data or unverifiable required references SHALL stop execution before writing or finalizing.

#### Scenario: Replacement resumes from exact evidence

- **WHEN** a worker is replaced during resolution or verification
- **THEN** the replacement verifies the supplied external references and supporting receipt validity and resumes only with complete stage-applicable state

#### Scenario: Incomplete inventory blocks execution

- **WHEN** reconstruction omits an affected path, strategy confirmation, required counter, or required evidence reference
- **THEN** the worker reports the precise missing state and performs no write or finalization

#### Scenario: Full failure evidence remains reachable

- **WHEN** a failed verification result is carried into a continuation or replacement
- **THEN** its exact external reference and checksum preserve the full command outcome and output needed for analysis

### Requirement: Merge worker runs judgment stages only

The merge worker SHALL work only at judgment points: resolving conflicts, correcting a failed test round, and planning decision-record renumbering. It SHALL NOT run the test suite, select, refresh, or validate a branch, or run any mechanical merge-tool action other than `instructions`, `valid`, `bundle`, and `write`. It SHALL read conflicts through `bundle` and SHALL change an affected file only through `write`. A test correction SHALL be returned as exact correction ranges within the affected file set before any write, and the renumbering plan SHALL be read-only.

#### Scenario: Failed round is corrected from the failure record

- **WHEN** the coordinator continues the worker with `test-correction`, the round number, the staged paths, and the failure record's reference and hash
- **THEN** the worker reads the failure evidence at that reference and returns its analysis and proposed correction ranges without running the suite

#### Scenario: Correction is applied only to captured ranges

- **WHEN** the coordinator continues the worker with `apply` and a captured correction snapshot
- **THEN** the worker sends exactly those fixes for the captured ranges through the merge tool's `write` action with the correction snapshot's reference and reports every path the tool wrote in `changed_files`

#### Scenario: Renumbering plan writes nothing

- **WHEN** the worker completes a `renumbering-plan` task
- **THEN** it returns the rename plan and the coordinator applies the renames and replacements
