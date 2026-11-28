# build-publication Specification

## Purpose
TBD - created by archiving change pr-publication-answer-at-build-start. Update Purpose after archive.

## Requirements

### Requirement: Build start parses the publication argument

The `/sai-build` coordinator SHALL drop every `--fast-track` token from its arguments and SHALL take `--publish` out of them before segment 1 starts, in the separate form and in the attached `--publish=<value>` form. It SHALL consume a value only when that value is exactly `yes`, `no`, or `draft`; when the next token is anything else, the bare `--publish` SHALL equal `yes` and SHALL leave that token in place. A value other than `yes`, `no`, or `draft`, or a second `--publish`, SHALL end the run before anything is written with exactly `Cannot start /sai-build: --publish takes yes, no or draft.` The remainder SHALL go to segment 1 as its change-name argument.

#### Scenario: Invalid publish value ends the run

- **WHEN** `/sai-build my-change --publish later` is invoked
- **THEN** the run ends with `Cannot start /sai-build: --publish takes yes, no or draft.` and writes nothing

#### Scenario: Valid publish value is kept for the answer

- **WHEN** `/sai-build my-change --publish yes` is invoked
- **THEN** segment 1 receives `my-change` as its argument and the run holds the publication answer `yes`

#### Scenario: Bare publish equals yes

- **WHEN** `/sai-build my-change --publish` is invoked
- **THEN** the run holds the publication answer `yes` and segment 1 receives `my-change` as its argument

#### Scenario: Draft publish value is kept

- **WHEN** `/sai-build my-change --publish draft` is invoked
- **THEN** the run holds the publication answer `draft`

#### Scenario: Attached form is accepted

- **WHEN** `/sai-build --publish=draft my-change` is invoked
- **THEN** the run holds the publication answer `draft` and `my-change` is segment 1's change-name argument

#### Scenario: A non-value token stays the change name

- **WHEN** `/sai-build --publish my-change` is invoked and `my-change` is not `yes`, `no`, or `draft`
- **THEN** `--publish` equals `yes` and `my-change` stays the change name

### Requirement: Build resolves the publication answer once at its start

The `/sai-build` coordinator SHALL resolve the publication answer once, inside segment 1, after that segment's Start step 4 accepts the change and before its step 5 opens the run, so a run that ends at the prerequisite or startability check asks nothing and no worker exists yet. The first source that yields a value SHALL be the answer, in this order: the `--publish [yes|no|draft]` argument, the `publication` field recorded in the `implement-run@1` run view of session `implement-{name}`, which SHALL hold `yes`, `no`, or `draft`; the `pr.publishAfterRun` setting when it reads `yes` or `no`, and then one question. An explicit `--publish` value SHALL replace a recorded answer, and the closing report SHALL say so when it differs from the recorded one. The question SHALL be asked through `AskUserQuestion` on Claude Code and `question` on opencode with the same text, naming the change, the current branch, and its remote, and with the options `Publish ready request` (`yes`), `Publish draft request` (`draft`), and `Do not publish` (`no`); a cancelled question SHALL mean `no`. A `yes` SHALL publish a request ready for review, and a `draft` SHALL create a draft request or keep an open request in its draft or ready state. On a detached HEAD the coordinator SHALL ask nothing, SHALL record no answer, and SHALL report that nothing is published because HEAD is detached.

#### Scenario: A resumed build reuses the recorded answer

- **WHEN** a `/sai-build` run without `--publish` resumes and `implement-run@1` holds `publication: yes`
- **THEN** the run uses `yes` and asks no question

#### Scenario: The setting answers before the question

- **WHEN** no `--publish` argument and no recorded answer exist and `pr.publishAfterRun` reads `no`
- **THEN** the run uses `no` and asks no question

#### Scenario: Nothing answers and the question is asked

- **WHEN** no argument, recorded answer, or `yes`/`no` setting exists on an attached branch
- **THEN** the coordinator asks the publication question once with the options `Publish ready request`, `Publish draft request`, and `Do not publish`

#### Scenario: A resumed build reuses a recorded draft answer

- **WHEN** a `/sai-build` run without `--publish` resumes and `implement-run@1` holds `publication: draft`
- **THEN** the run uses `draft` and asks no question

### Requirement: Build records the answer in every implement run it opens

The `/sai-build` coordinator SHALL record the publication answer with the `publication` event of `implement-run@1` right after segment 1 opens or takes up its run, and again right after segment 3 opens its new run and before its first step. A build whose segment 3 does not run SHALL publish with the answer of segment 1. The `implement-{name}` `sai-state` session SHALL stay open across the build's segments: the implement coordinator SHALL skip only its session `close` inside `/sai-build`, and `/sai-build` SHALL close the session at its own Close after the publication step when the run completed. A run that fails, stops, or ends blocked SHALL leave the session open so a rerun finds the recorded answer.

#### Scenario: Segment 3 carries the answer over

- **WHEN** segment 3 starts a new `implement-run@1` run after segment 1 recorded `yes`
- **THEN** the coordinator emits the `publication` event with `yes` before segment 3's first step

#### Scenario: Interrupted build keeps the session

- **WHEN** a build is interrupted in segment 2 after segment 1 recorded its answer
- **THEN** the `implement-{name}` session is still open and a rerun reads the recorded answer without asking

### Requirement: Implement run machine carries the publication field

The `implement-run@1` machine SHALL carry the `publication` field and event of the shared run core, SHALL accept exactly `yes`, `no`, and `draft` as its values, and SHALL reject every other value with `publication must be yes or no or draft`, so its run view returns the recorded answer and an explicit later value replaces it. Only `/sai-build` SHALL emit that event: a direct `/sai-3-implement` run and `/sai-deep-review` SHALL ask, record, and publish nothing.

#### Scenario: Recorded answer appears in the run view

- **WHEN** `publication` with value `yes` is emitted to `implement-run@1` and `status` is emitted after it
- **THEN** the run view returns `publication: yes`

#### Scenario: Direct implement run publishes nothing

- **WHEN** `/sai-3-implement` runs on its own
- **THEN** it asks no publication question and its `publication` field stays empty

#### Scenario: Draft is a valid and resumable answer

- **WHEN** `publication` with value `draft` is emitted to `implement-run@1` and `status` is emitted after it
- **THEN** the run view returns `publication: draft`

#### Scenario: An unknown value is rejected

- **WHEN** `publication` with value `later` is emitted to `implement-run@1`
- **THEN** the event is rejected with `publication must be yes or no or draft` and no answer is recorded

### Requirement: Build publishes a ready request once after its telemetry commit

After the telemetry commit and before the report, a `/sai-build` run that holds the answer `yes` or `draft` and whose every segment that ran completed SHALL follow `sai/commands/build/publication.md` once, never between segments. That publication SHALL run unattended and ask nothing, SHALL run the `to-pr` destination, content, non-force `push --unattended`, and `publish --unattended` with the `publish_pr_as_draft` value its caller hands over (`false` for `yes`, `true` for `draft`), and SHALL run no plan-commit step. The publication SHALL send `closing_change` with the completed change name in `query` and `publish`, and SHALL also send the caller's `closing_line` when it hands one over, so the request closes the issue linked to the change; both values SHALL repeat unchanged in `publish`, so the approval digest binds them. A `yes` SHALL publish a request that is ready for review; a `draft` SHALL create a draft request or keep an open request in its draft or ready state, and SHALL NOT turn an existing ready request back into a draft. A skipped or failed publication SHALL be reported with its reason and SHALL NOT change the build's completed outcome; a confirmed push SHALL stand and nothing SHALL be retried with force. When marking a draft request ready fails or its readback does not show it ready, the report SHALL say that the request stays a draft and why. When the build writes the request description (a new request, or an open request it updates or marks ready), the description SHALL carry a `## Pending findings` section, headed in the resolved request language and placed right before `## Out of Scope / Follow-ups`, that lists with identifier, title, and reason the findings still pending (the `review.md` findings the fix segment left open and the step-review findings the implement segments left pending after the third fix round) and the findings whose `review.md` heading carries ` (EXCLUDED: …)`; with neither, the description SHALL have no such section, and the request SHALL stay ready for review either way. A run with the answer `no`, without an answer, or that fails, stops, or ends blocked SHALL publish nothing.

#### Scenario: Yes answer publishes a ready request

- **WHEN** a completed build holds the answer `yes` and the branch has an open draft request
- **THEN** after the telemetry commit the branch is pushed without force, the request is updated with `publish_pr_as_draft: false` and marked ready for review, and the report names its URL and ready state

#### Scenario: Ready request lists pending and excluded findings

- **WHEN** a completed build holds the answer `yes`, the fix segment left one `review.md` finding open, and the Assessment pass excluded another
- **THEN** the published request is ready for review and its description has a `## Pending findings` section that lists the open finding as pending and the other as excluded, each with identifier, title, and reason

#### Scenario: Build with no unresolved finding adds no section

- **WHEN** a completed build holds the answer `yes` and no finding stays pending or excluded
- **THEN** the published request description has no `## Pending findings` section

#### Scenario: Failed mark-ready keeps the build completed

- **WHEN** the content update succeeds but marking the draft request ready fails
- **THEN** the report says the request stays a draft and why, and the build still ends completed

#### Scenario: No answer publishes nothing

- **WHEN** a completed build holds the answer `no`
- **THEN** nothing is pushed or published and an existing request stays untouched

#### Scenario: Draft answer publishes a draft request

- **WHEN** a completed build holds the answer `draft` and the branch has no open request
- **THEN** after the telemetry commit the branch is pushed without force, the request is created with `publish_pr_as_draft: true`, and the report names its URL and draft state

#### Scenario: Draft answer keeps an existing ready request ready

- **WHEN** a completed build holds the answer `draft` and the branch has an open request that is ready for review
- **THEN** the request is updated with `publish_pr_as_draft: true` and stays ready for review

#### Scenario: The published request closes the issue linked to the change

- **WHEN** a completed build publishes a request for a change whose `.openspec.yaml` holds a canonical `backlog_origin`
- **THEN** the `query` proposal carries `closing_change` with the change name, and the published request's closing block carries the origin's `Closes` line
