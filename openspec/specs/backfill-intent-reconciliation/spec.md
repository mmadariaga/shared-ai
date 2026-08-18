# backfill-intent-reconciliation Specification

## Purpose

The shared backfill instruction flow optionally captures ephemeral user intent and reconciles it against selected diff evidence without changing the evidence-only path or the permitted artifact boundary.

## Requirements

### Requirement: Capture optional intent after diff selection

After a valid diff source has been selected and the diff summary has been loaded, `/sai-backfill` SHALL offer exactly two declared choices for optional intent capture using the established two-option-plus-free-text shape from `sai/policies/artifact-feedback-gate.md`: `Provide intent (Recommended)` and `Continue without intent`, in that order. The canonical English prompt SHALL be `Do you have a statement of intent to share below? You can also type it directly in the free-text box.` and SHALL be rendered in the user's language under `sai/policies/remember.md`, falling back to that English form when no language is available. Selecting `Provide intent (Recommended)` without text SHALL produce the canonical English follow-up `Share your statement of intent below.` exactly once before waiting for text. The harness-provided free-text slot SHALL be the only paste channel. Explicit native option selection SHALL take precedence over simultaneously returned free text. A free-text reply is mapped to a declared option only when its trimmed, case-insensitive value exactly equals that option's value; any other non-empty text is captured as a candidate intent statement. Whitespace-only text means no intent.

#### Scenario: User supplies intent directly in the free-text slot
- **WHEN** the diff is loaded and the user supplies non-empty text that selects neither declared choice
- **THEN** the command captures that text as the in-conversation intent statement and begins reconciliation before the fixed interview

#### Scenario: User chooses the intent option before pasting
- **WHEN** the user selects the intent-capture choice without text
- **THEN** the command uses the established clean follow-up turn for free-text input and does not treat the empty selection as a no-intent decision

#### Scenario: User supplies no intent
- **WHEN** the user selects the no-intent choice
- **THEN** the command continues to the existing interview without attempting intent parsing or intent reconciliation

#### Scenario: Native option and free text arrive together
- **WHEN** a harness returns a declared option and free text in the same interaction
- **THEN** the selected option controls the outcome: the intent option captures non-empty text, while the no-intent option discards attached text

#### Scenario: Free text is whitespace or choice-like
- **WHEN** the free-text channel contains only whitespace or exactly matches a declared option after trimming and case-folding
- **THEN** whitespace produces no intent and an exact choice-like value follows the corresponding option semantics rather than becoming intent text

#### Scenario: Non-empty text yields no usable intent context
- **WHEN** a non-empty candidate statement contains no actionable capability, constraint, boundary, and no rejected alternative that constrains the result
- **THEN** the command reports that no usable intent was identified and follows the ordinary no-intent path

#### Scenario: Candidate contains only rejected alternatives
- **WHEN** a non-empty candidate statement contains one or more rejected alternatives but no capability, constraint, or boundary to reconcile
- **THEN** the command treats the rejected alternatives as usable intent context, runs the intent-aware conflict scan, records prior-intent provenance, and produces no reconciliation questions or normative requirements for those alternatives

### Requirement: Preserve the no-intent backfill path

When no usable intent is supplied, `/sai-backfill` SHALL preserve the current behavior defined by `sai/commands/backfill/instructions.md` and `sai/policies/remember.md`: it SHALL ask, sequentially and exactly once each, `What problem does this solve?` followed by `What are the known limitations or technical debt left behind?`; ask adaptive questions only for genuine diff-derived gaps; run the conflict scan with the diff alone; write the existing metadata and post-hoc marker; and derive artifacts from diff evidence and interview answers without intent-specific output.

#### Scenario: Backfill runs without intent
- **WHEN** a valid diff is loaded and the user declines optional intent capture
- **THEN** the command's interview order, question default, conflict-scan input, artifact content rules, metadata keys, and post-hoc banner remain the current no-intent behavior

### Requirement: Keep intent ephemeral and distinct from diff evidence

The command SHALL retain supplied intent only in the current conversation and worker state needed for reconciliation. It SHALL NOT write the raw intent, a parsed intent file, or an intent copy into the change directory, and SHALL treat the diff as verified implementation evidence rather than merging the two sources as equivalent evidence.

#### Scenario: Intent is explanatory but not schema-shaped
- **WHEN** the supplied text is ordinary prose, contains rejected alternatives, or uses a handoff format different from `/sai-explore`
- **THEN** the command accepts it as intent context and continues without schema validation or a parsing error

### Requirement: Classify captured intent and diff items

When a candidate intent statement has been captured, the command SHALL treat each stated capability, stated constraint, and stated boundary as an intent item, and each distinct externally observable behavior or constraint evidenced by one or more related diff hunks as a diff item. An explicitly rejected alternative that constrains the result SHALL instead be retained as `rejected-alternative` intent context; it is reported to the user and passed to conflict scanning, but is not an intent item or diff item, is never placed in the targeted-question queue, and never becomes a normative requirement. A candidate statement is usable intent context when it contains at least one intent item or at least one `rejected-alternative` context entry. Unrelated behaviors remain separate diff items even when they share a file. Pure formatting, comment-only, and behavior-preserving refactor hunks are not diff items. The command SHALL compare material meaning rather than require identical wording. It SHALL classify intent items in statement order, then diff-only items in selected-diff file and hunk order. An intent item is `matched` only when every material part has direct or semantically equivalent evidence in the diff; an intent item with any material part lacking evidence is `stated-but-unevidenced`; and a diff-only item not covered by any intent item is `evidenced-but-unstated`. Every item SHALL receive exactly one applicable classification. Matched items become ordinary evidence-backed specs; stated-but-unevidenced items remain non-normative until qualifying evidence is supplied; and evidenced-but-unstated items are reported as scope drift and remain eligible for specification from the diff.

#### Scenario: Intent and diff describe the same behavior
- **WHEN** an intent capability or constraint has corresponding implementation evidence in the selected diff
- **THEN** the item is classified as `matched` and may be represented as an ordinary spec requirement

#### Scenario: Intent names a deliberately preserved boundary
- **WHEN** the intent states that behavior should remain unchanged and the diff contains no implementation evidence for that behavior
- **THEN** the item is classified as `stated-but-unevidenced` and is not written as a normative requirement before the user confirms deliberate preservation

#### Scenario: Diff contains work absent from intent
- **WHEN** the selected diff evidences a behavior that the supplied intent does not state
- **THEN** the item is classified as `evidenced-but-unstated`, reported as scope drift, and still included in the specs derived from the diff

#### Scenario: Intent item is only partially evidenced
- **WHEN** an intent item contains two material behaviors but the diff evidences only one
- **THEN** the whole intent item is `stated-but-unevidenced` until the missing behavior receives qualifying evidence, while the evidenced behavior remains available for ordinary diff-derived specification

#### Scenario: One diff item supports overlapping intent items
- **WHEN** one externally observable diff behavior semantically satisfies two separately stated intent items
- **THEN** both intent items are `matched`, the diff behavior is not reported as scope drift, and it is not duplicated solely because two intent items reference it

#### Scenario: Rejected alternative remains intent context
- **WHEN** the supplied statement explicitly rejects an alternative rather than requesting that alternative as a capability or boundary
- **THEN** the command reports it as `rejected-alternative` context, excludes it from reconciliation questions and normative requirements, and retains it for conflict scanning

### Requirement: Drive bounded questions from unevidenced intent

The first five `stated-but-unevidenced` items, in reconciliation order, SHALL each produce one targeted additional question that identifies the item and names the code evidence that would substantiate it. If more than five items exist, all remaining items SHALL be covered by one grouped overflow question. These questions SHALL be asked one at a time after the two fixed questions. A qualifying preservation confirmation SHALL directly and unambiguously state that the named behavior or boundary was intentionally preserved or left unchanged; omission, deferral, accident, ambiguity, or contradiction SHALL not qualify. Only a qualifying confirmation permits the confirmed boundary to enter a normative artifact. Nothing SHALL be written before every generated question is answered.

#### Scenario: Gap receives explicit preservation confirmation
- **WHEN** a user answers a targeted question by explicitly confirming that the stated behavior was deliberately preserved
- **THEN** that confirmation is treated as evidence, and the confirmed boundary may be recorded in the proposal or specs without presenting the unconfirmed intent as code evidence

#### Scenario: Gap answer reveals an omission
- **WHEN** a user answers that the stated item was not implemented, or does not provide qualifying deliberate-preservation confirmation
- **THEN** the item remains an omission report and SHALL NOT become a normative spec requirement solely from the intent statement

#### Scenario: Ambiguous gap answer is not evidence
- **WHEN** a targeted answer is ambiguous, contradictory, or says the behavior was deferred or accidentally omitted
- **THEN** the answer does not qualify as preservation evidence and the item remains outside normative requirements

#### Scenario: More gaps than the individual-question bound
- **WHEN** more than five stated-but-unevidenced items remain after reconciliation
- **THEN** the command asks five targeted questions and one grouped overflow question covering the remaining items

### Requirement: Report scope drift without blocking specification

For every `evidenced-but-unstated` item, the command SHALL report the scope drift to the user, distinguish it from an implementation error, and continue speccing the evidenced behavior unless another existing conflict or user decision aborts the run.

#### Scenario: Unstated evidence is accepted for backfill
- **WHEN** reconciliation finds a diff change not named in intent and no independent blocker prevents continuation
- **THEN** the user sees a scope-drift report and the corresponding behavior is still represented in the generated capability spec

### Requirement: Enrich conflict scanning with intent constraints

When a candidate statement is usable intent context because it contains at least one intent item or `rejected-alternative` context entry, the existing spec-conflict subagent SHALL receive the selected diff together with an in-conversation `Intent statement` containing the supplied text and worker-authored `Capabilities`, `Constraints`, and `Other intent context` lists. The lists SHALL preserve every usable intent item and rejected-alternative context without schema parsing. When no usable intent context is present, the subagent SHALL receive the diff alone. Conflict reporting and the existing proceed-or-abort decision SHALL remain unchanged, with `proceed (Recommended)` before `abort`.

#### Scenario: Usable intent context is available during conflict detection
- **WHEN** the conflict scan runs after the candidate statement produced at least one intent item or `rejected-alternative` context entry
- **THEN** its input includes the diff and the intent constraints and capabilities, and any overlapping specs are reported through the existing conflict gate

#### Scenario: No intent is available during conflict detection
- **WHEN** the conflict scan runs on a no-intent backfill
- **THEN** its input remains the diff alone and no intent context is synthesized

### Requirement: Bound normative artifacts to evidence

The generated proposal and capability specs SHALL be grounded in selected-diff evidence, fixed interview answers, and any explicit confirmation of deliberate preservation. An unconfirmed intent claim, unanswered gap, rejected alternative, or omission SHALL remain outside normative requirements; a confirmed deliberate preservation may be described as an evidence-backed boundary without persisting the raw intent.

#### Scenario: Unconfirmed intent conflicts with the absence of code evidence
- **WHEN** a stated capability has no diff evidence and the user does not explicitly confirm deliberate preservation
- **THEN** the command reports the gap or omission and writes no normative requirement for that claim

#### Scenario: Confirmed boundary is included
- **WHEN** the user explicitly confirms that an intent boundary was deliberately preserved
- **THEN** the command may record the confirmed boundary in the proposal or a testable spec scenario, while keeping the original intent text out of the change directory

### Requirement: Record prior-intent provenance

Every backfill SHALL continue to write the current metadata keys `schema`, date-only `created` in `YYYY-MM-DD` format, and `backfilled: true` when no usable intent context is supplied. A run with at least one intent item or rejected-alternative context entry SHALL additionally write `prior_intent: true` and use the intent-qualified post-hoc marker. A run without usable intent context SHALL write no provenance key and SHALL retain the existing no-intent marker unchanged.

#### Scenario: Intent-aware metadata is written
- **WHEN** all fixed and generated answers are collected and at least one intent item or rejected-alternative context entry was identified
- **THEN** the change metadata contains the existing three keys plus `prior_intent: true`, and the proposal carries the intent-qualified post-hoc marker

#### Scenario: No-intent metadata is written
- **WHEN** all required answers are collected without an intent item or rejected-alternative context entry, including after a candidate statement yielded no usable intent context
- **THEN** metadata contains the existing keys only, including `backfilled: true`, and the proposal carries the unchanged post-hoc marker

### Requirement: Preserve the backfill artifact boundary and write gate

The intent-aware flow SHALL write only `.openspec.yaml`, `proposal.md`, and capability specs under the selected change directory. It SHALL never create `design.md`, `tasks.md`, or `implementation.md`, and SHALL write no artifact before the diff selection, optional intent capture, fixed questions, generated questions, conflict decision, and change-name confirmation are complete.

#### Scenario: All pre-generation decisions are complete
- **WHEN** the user has selected a diff, completed the applicable interview, resolved conflicts, and confirmed the change name
- **THEN** the command writes the permitted backfill artifacts and no prohibited planning artifacts

#### Scenario: A required answer or gate is still pending
- **WHEN** any fixed or generated answer, conflict decision, or change-name confirmation is missing
- **THEN** the command writes no artifact, regardless of how much intent or diff context is already available
