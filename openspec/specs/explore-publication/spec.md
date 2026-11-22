# explore-publication Specification

## Purpose
TBD - created by archiving change pr-publication-answer-in-explore. Update Purpose after archive.

## Requirements

### Requirement: Round 3 asks the publication question once per crystallized set

Round 3 of `/sai-explore` SHALL carry the publication question as a conditional question beside the route question, never as a separate interaction after the route answer. The question SHALL be asked once for the whole `last_crystallization_set`, in the first round 3 of the set, whatever route that slice takes, Manual included; later round-3 groups of the same set SHALL NOT ask it again. Before round 3, Explore SHALL resolve the answer in this order, and the first match SHALL win with no publication question in the round: the answer `explore-slice@1` already holds for the set; then the `pr.publishAfterRun` setting read with `project-settings.js get`, when it returns `yes` or `no`, printing `Project setting pr.publishAfterRun: <value>` once; then the question. `ask`, an absent key, an invalid value, and a tool that cannot run SHALL leave the question normal. The question SHALL say what a `yes` does on each route and that a `no` pushes nothing. With a branch pending creation, it SHALL name the pending branch by its exact name and its remote (the only remote the repository lists, or say that the remote cannot be read) and SHALL say that the branch does not exist yet and is created after the route answer, so that a `yes` authorizes the push of that branch only. With no pending branch, it SHALL name the current branch and its remote (or say that the remote cannot be read). It SHALL offer **Publish** (`yes`) and **Do not publish** (`no`) through `AskUserQuestion` on Claude Code and `question` on opencode, with the same text and options on both. A detached HEAD with no pending branch SHALL ask nothing, record no answer, and report that nothing is published. A declined, cancelled, or non-committal answer to the question SHALL resolve `no`; a cancelled round or an invalid route answer SHALL record nothing. The answer SHALL be the held confirmation for the push and the creation or update of the request on the branch each publishing slice is on, and SHALL authorize nothing else.

#### Scenario: First round 3 of the set asks the question

- **WHEN** the first round 3 of a crystallized set is presented, `explore-slice@1` holds no answer, and `pr.publishAfterRun` is `ask` or absent
- **THEN** round 3 carries the publication question beside the route question, whatever route the user then picks

#### Scenario: The setting answers in advance

- **WHEN** `pr.publishAfterRun` is `yes` or `no` and the set holds no answer
- **THEN** round 3 shows no publication question, prints `Project setting pr.publishAfterRun: <value>`, and the set records that value

#### Scenario: Later round 3 of the same set asks nothing

- **WHEN** a later round 3 of the same set is presented after the answer was recorded
- **THEN** no publication question joins the round

#### Scenario: Detached HEAD publishes nothing

- **WHEN** round 3 would ask the publication question while HEAD is detached and no branch is pending
- **THEN** Explore asks nothing, records no answer, and reports that nothing is published because HEAD is detached

#### Scenario: Pending branch is named in the question

- **WHEN** round 3 asks the publication question while a branch is pending creation
- **THEN** the question names the pending branch's exact name and its remote and says that the branch does not exist yet

### Requirement: explore-slice@1 records the set-wide publication answer

`explore-slice@1` SHALL hold a set-wide `publication` field whose value is empty until recorded and then `yes` or `no`, and every response SHALL return it in its `run` view. The `publication` intent with a `value` SHALL record the answer once per recorded inventory: it SHALL be rejected with `INVENTORY_NOT_READY` before an inventory is recorded, with `INVALID_PUBLICATION` for a value other than `yes` or `no`, and with `PUBLICATION_ALREADY_RECORDED` when the set already holds an answer, changing nothing in each case. The `publication` intent without a `value` SHALL record nothing and SHALL return the view, so a coordinator can read the answer after a context compaction or a recovery load. Explore SHALL record the resolved answer before it emits `{intent: route-choice}`. A new recorded inventory SHALL clear the answer together with the slice inventory, and a stored state without the field SHALL read as unanswered.

#### Scenario: Answer is recorded once and read back

- **WHEN** an inventory is recorded, `publication` is emitted with `value=yes`, and later `publication` is emitted without a value
- **THEN** the first emit records `yes`, the second returns `publication: yes` in the `run` view and records nothing

#### Scenario: Second answer is rejected

- **WHEN** the set already holds an answer and `publication` is emitted with another value
- **THEN** the machine answers `PUBLICATION_ALREADY_RECORDED` and keeps the recorded answer

#### Scenario: New inventory clears the answer

- **WHEN** a new crystallization records a new inventory
- **THEN** the `publication` field is empty again

#### Scenario: Legacy state reads as unanswered

- **WHEN** a stored state that has no `publication` field is loaded
- **THEN** the machine reads its publication answer as empty

### Requirement: Explore routes apply the recorded publication answer

Every slice of the set SHALL read the recorded answer and ask nothing. The Plan - Unattended route SHALL hand it to the plan coordinator as a `--publish <yes|no>` line, omitted only when the set holds no answer because HEAD was detached, so a `yes` publishes a draft request through `/sai-plan`. With a `yes`, the Direct Build - Unattended coordinator, not a worker, SHALL push the branch without force and publish a ready-for-review request by following `sai/commands/build/publication.md`, after the telemetry commit (or right after the archive worker's clean result when the telemetry collection was skipped) and before the slice transition; the archive worker SHALL keep its no-push rule and the publication SHALL create no commit. A Direct Build run that stopped before the archive worker's clean `completed` result SHALL publish nothing, and a block provider that supplies no answer SHALL mean `no`. A Manual slice SHALL ignore the answer. With a `shared` branch every publishing slice SHALL update the same request, and a request already ready for review SHALL stay ready when a later Plan slice publishes; with `per-slice` branches each publishing slice SHALL publish its own request. A failed or skipped publication SHALL NOT stop the slice, its transition, or the chain of slices.

#### Scenario: Plan slice hands the answer over

- **WHEN** a Plan - Unattended slice starts and the set holds `yes`
- **THEN** Explore follows the plan coordinator with `--publish yes`, and the coordinator asks no publication question

#### Scenario: Direct Build slice publishes a ready request

- **WHEN** a Direct Build - Unattended slice reaches a clean archive result and its telemetry commit with the set answer `yes`
- **THEN** the coordinator pushes the branch without force and publishes a ready-for-review request before the slice transition

#### Scenario: Failed publication keeps the chain going

- **WHEN** the publication of one Direct Build slice fails or is skipped while later slices start automatically
- **THEN** the slice transition and the next slice proceed, and the slice's terminal report states the reason

#### Scenario: Manual slice ignores the answer

- **WHEN** the route answer is Manual and the set holds `yes`
- **THEN** nothing is pushed or published for that slice

### Requirement: Direct Build reports the publication outcome

The Direct Build - Unattended terminal report SHALL state the publication outcome in What you need to know: the request URL with its verified ready or draft state after a publication; the skip, refusal, or failure reason, with the confirmed push when there is one, when the answer was `yes` and the publication did not complete; and `Nothing was pushed.` when the answer was `no`, when none was recorded, or when no publication ran.

#### Scenario: Successful publication is reported

- **WHEN** a Direct Build slice with the answer `yes` publishes its request
- **THEN** the terminal report gives the request URL and its verified state

#### Scenario: No answer reports nothing pushed

- **WHEN** a Direct Build slice completes with the answer `no`
- **THEN** the terminal report states `Nothing was pushed.`

### Requirement: Standalone /sai-direct-build gains no publication

Standalone `/sai-direct-build` SHALL take no publication answer, SHALL keep its one-commit, no-push grant, and SHALL publish nothing.

#### Scenario: Standalone run pushes nothing

- **WHEN** `/sai-direct-build` completes a run
- **THEN** nothing is pushed or published and no publication question is asked
