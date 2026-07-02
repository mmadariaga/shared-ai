# audit-artifact-ingestion Specification

## Purpose
TBD - created by archiving change audit-finding-judgment. Update Purpose after archive.
## Requirements
### Requirement: The `/sai-3-implement` agent SHALL read all existing audit artifacts for a change before generating `implementation.md`.

When producing an implementation plan, the agent SHALL check for audit artifacts produced by earlier review passes, SHALL apply editorial judgment over each finding using the rubric defined in this spec, SHALL classify every finding as Apply (rendered as a code action) or Discard (listed in a Discarded findings sub-block with a one-sentence reason and surfaced in chat for confirmation), and SHALL append a single step per artifact with the Apply/Discard structure. The agent SHALL NOT append every actionable finding unconditionally — judgment is mandatory and precedes appending.

#### Scenario: Audit artifacts exist for the change

- **WHEN** one or more of `review.md`, `security.md`, `performance.md`, or `accessibility.md` exist in `openspec/changes/{change-name}/`
- **THEN** the agent reads each file that exists
- **AND** applies the judgment rubric (severity, actionability, spec-decision consistency, duplication, scope) to every finding in that artifact
- **AND** classifies every finding as Apply or Discard
- **AND** appends one step per artifact at the end of `implementation.md` (e.g., `Step N: Address review findings`, `Step N+1: Address security findings`) containing the Apply code actions and the Discarded findings sub-block side by side
- **AND** surfaces the list of Discarded findings in chat for user confirmation

#### Scenario: No audit artifacts exist for the change

- **WHEN** none of `review.md`, `security.md`, `performance.md`, or `accessibility.md` exist in `openspec/changes/{change-name}/`
- **THEN** the agent proceeds with standard `implementation.md` generation without appending any audit steps

### Requirement: Audit artifact steps MUST NOT be merged with existing implementation steps.

Each audit artifact produces its own dedicated step. Findings from different artifacts are kept separate and appended after all steps derived from `design.md` and `tasks.md`.

### Requirement: Apply/Discard classification SHALL follow a five-criterion judgment rubric

The judgment rubric evaluates each finding against five criteria: (1) **severity** — does the finding rise to blocker/major or is it a non-issue? (2) **actionability** — is the proposed fix specific enough to implement (a concrete file:line change rather than a vague suggestion)? (3) **spec-decision consistency** — does the finding contradict a decision in `design.md` or a requirement in `specs/**/*.md`? (4) **duplication** — does the finding repeat another finding already addressed in an earlier step of `implementation.md`? (5) **scope** — does the finding stay within the change's declared scope or propose out-of-scope work? The Apply/Discard classification SHALL follow from the rubric outcome, not from gut feel.

#### Scenario: rubric drives every classification

- **WHEN** the agent classifies a finding
- **THEN** it evaluates the finding against all five rubric criteria
- **AND** the Apply/Discard decision is grounded in the rubric outcome

### Requirement: Apply findings SHALL be rendered as concrete code actions in the appended audit step

Every finding classified Apply SHALL appear in the appended audit step as a concrete code-writing action with a file:line location and a specific change. Apply actions are the same kind of code-writing checkboxes the `<plan_template>` already uses elsewhere in `implementation.md`.

#### Scenario: Apply finding becomes a code action

- **WHEN** a finding is classified Apply
- **THEN** the appended audit step contains a code-writing checkbox for that finding
- **AND** the checkbox line states a file:line location and a specific change

### Requirement: Discard findings SHALL be listed in a Discarded findings sub-block inside the same step

Every finding classified Discard SHALL appear in a Discarded findings sub-block inside the appended audit step (not a separate step). Each sub-block entry SHALL contain the finding's identifier (e.g., `M3`), a one-sentence reason for the discard, and a pointer to the original artifact (e.g., `review.md § Major M3`). Question (Q) entries SHALL additionally transcribe the full Q text verbatim beneath the entry line so the user can answer in chat.

#### Scenario: discarded entry format

- **WHEN** a finding is classified Discard
- **THEN** it appears in the Discarded findings sub-block with its id, a one-sentence reason, and a source pointer
- **AND** the sub-block is inside the same step as the Apply code actions, not a separate step

### Requirement: Discarded findings SHALL be surfaced in chat for conversational confirmation

When the agent finishes generating the appended audit step, it SHALL print the list of Discarded findings to chat (one line per Discard, plus the verbatim Q text for any Q Discard) and ask the user to confirm or override. Confirmation SHALL be conversational in the same chat. The agent SHALL NOT write any approval key to `.openspec.yaml` and SHALL NOT introduce any new approval gate for Discards.

#### Scenario: discards surfaced in chat only

- **WHEN** the agent finishes generating the appended audit step
- **THEN** the agent prints one line per Discarded finding to chat, asking the user to confirm
- **AND** it does NOT write any approval key to `.openspec.yaml`
- **AND** the user can override any Discard by responding in chat before `/sai-4-apply` starts

### Requirement: Question (Q) findings SHALL be auto-discarded with full text transcription

Findings classified as Question (Q) in any audit artifact SHALL be auto-discarded with the reason `requires user response, not a code change`. The full Q text SHALL be transcribed verbatim in the Discarded findings sub-block so the user can answer in chat. Q findings SHALL NOT be rendered as Apply code actions under any circumstance.

#### Scenario: Q finding is auto-discarded with full text

- **WHEN** an audit artifact contains a Question finding
- **THEN** the agent lists it in the Discarded findings sub-block with reason `requires user response, not a code change`
- **AND** the full Q text is transcribed verbatim in the entry

### Requirement: An all-Discarded audit step SHALL remain closable via a single checkbox

When every finding in an audit artifact is classified Discard, the appended step SHALL still exist but SHALL contain only the Discarded findings sub-block and a single `No code changes from this audit` checkbox (no Apply code actions). The user closes the step by checking that box. This guarantees the audit step is never silently dropped just because every finding was discarded.

#### Scenario: all-Discarded step is closable

- **WHEN** every finding for an audit artifact is classified Discard
- **THEN** the appended step contains only the Discarded findings sub-block and the `No code changes from this audit` checkbox
- **AND** no Apply code actions are present
- **AND** the user can close the step by checking the box

### Requirement: Audit artifact steps MUST NOT be merged with existing implementation steps

Each audit artifact produces its own dedicated step (e.g., `Step N: Address review findings`, `Step N+1: Address security findings`). An audit step SHALL NOT be folded into a prior step derived from `tasks.md` or from a previous audit artifact, even when the artifact is small or all findings are Discarded. This rule is the structural companion to the one-step-per-artifact appending behavior in the MODIFIED requirement above: appending per-artifact and never merging are the two halves of the same structural contract.

#### Scenario: one step per artifact is enforced

- **WHEN** Step 5 appends audit-derived steps for one or more existing audit artifacts
- **THEN** exactly one new step is appended per existing artifact
- **AND** no audit step is folded into a prior step derived from `tasks.md` or from a previous audit artifact

### Requirement: The judgment behavior SHALL apply uniformly to all four audit artifacts

The judgment, classification, and Discarded block behaviors SHALL apply to findings in `review.md`, `security.md`, `performance.md`, and `accessibility.md`. Every finding in any of these four audit artifacts is subject to the rubric.

#### Scenario: applies to all four

- **WHEN** any of `review.md`, `security.md`, `performance.md`, or `accessibility.md` exists for the change
- **THEN** the agent exercises judgment over that artifact's findings and produces the same Apply/Discard/Discarded-block structure

### Requirement: The re-run preservation contract SHALL be preserved

The existing re-run preservation contract — one new step appended per existing audit artifact on re-run, with no dedup logic across re-runs — SHALL be preserved unchanged. The canonical name of that contract today is `openspec/specs/implement-rerun-preservation/spec.md` (introduced by `openspec/changes/archive/2026-06-20-sai-3-rerun-preserve-compacted`); this requirement name-links it so a future reader of this spec knows which contract is being locked. Re-running `/sai-3-implement` against a change that already has an appended audit step for a given artifact SHALL still append a new step (numbered strictly after the last existing step) with its own Apply/Discard list. The judgment behavior is re-exercised on every re-run, but the re-run itself still appends a new step each time. No dedup logic SHALL be added to detect that the same audit artifact produced a prior step. Judgment is not idempotent w.r.t. the audit artifact: two re-runs against the same unchanged artifact may produce slightly different Apply/Discard lists because the LLM is not perfectly deterministic; the appended step is best-effort, not byte-stable across re-runs.

#### Scenario: re-run appends, does not dedupe

- **WHEN** `/sai-3-implement` re-runs against a change that already has an appended audit step for a given artifact
- **THEN** it appends a new step (numbered after the last existing step) with its own Apply/Discard list
- **AND** it does NOT deduplicate against the prior appended step
- **AND** the judgment behavior is re-exercised on the artifact's findings for the new step
- **AND** the new step's Apply/Discard list is permitted to differ from the prior step's list, because judgment is not idempotent

