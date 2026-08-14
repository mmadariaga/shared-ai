# explore-edge-case-gate Specification

## Purpose

TBD

## Requirements

### Requirement: Crystallization waits for edge-case agreement

`sai-explore` SHALL NOT emit a `Ready to Propose` block until the current stable idea's edge-case review has reached agreement. A non-empty proposed list reaches agreement only through the user's semantic agreement. An empty in-scope list reaches agreement through the deterministic empty-set rule of `explore-edge-case-review`: emitting exactly `- None` and recording the empty list is an explicit content-based agreement form that requires no confirmation response. If the user explicitly asks to crystallize before the review has completed, the request SHALL trigger the review with no skip path; the request remains pending and proceeds through the slicing assessment and language gates only after either agreement form completes. The mandatory edge-case gate SHALL remain in force under `--fast-track`; fast-track SHALL NOT auto-approve, skip, or weaken this gate and SHALL continue to bypass only the existing language gates.

#### Scenario: Semantic agreement completes a non-empty edge-case stage

- **WHEN** a solid idea's edge-case review proposes one or more in-scope behaviors and the user semantically agrees to the list
- **THEN** the review's list is recorded as agreed, the stage completes, and the user may continue the staged progression
- **AND** no `Ready to Propose` block is emitted before that agreement

#### Scenario: Deterministic empty-set recording completes the gate

- **WHEN** the edge-case review finds no in-scope behavior and emits exactly `- None`
- **THEN** the empty list is recorded as agreed without a confirmation response
- **AND** the edge-case stage completes without weakening or bypassing the mandatory gate

#### Scenario: A premature crystallize request resumes after empty-set completion

- **WHEN** the user explicitly asks to crystallize before the edge-case review has completed and the review finds no in-scope behavior
- **THEN** the deterministic empty-set agreement form completes the gate
- **AND** the pending request proceeds through the slicing assessment and language gates

#### Scenario: Fast-track does not bypass the edge-case gate

- **WHEN** `sai-explore` runs with `--fast-track` and the current idea has not reached either agreement form
- **THEN** it still runs the mandatory edge-case review and blocks crystallization until agreement
- **AND** fast-track bypasses only the existing language gates

### Requirement: Agreement is recognized by semantic intent or the deterministic empty-set rule

For a non-empty proposed edge-case list, the gate SHALL recognize agreement from the user's dominant conversational intent, using the same intent-over-literal approach as the `review-loop` token pattern. It SHALL accept semantically affirmative responses in the ambient language, SHALL keep the review open for disagreement or ambiguity, and SHALL NOT replace discussion with a native agreement picker or require a fixed phrase. The sole content-based exception is the deterministic empty-set rule: when no in-scope behavior exists, emitting exactly `- None` and recording the empty list SHALL constitute agreement without a user confirmation response. No other inferred, automatic, or content-based agreement form SHALL unlock the gate.

#### Scenario: Natural-language agreement unlocks a non-empty gate

- **WHEN** the user clearly confirms a non-empty proposed list in conversational language
- **THEN** the gate treats the list as agreed without requiring a particular wording or language

#### Scenario: The empty-set rule unlocks the gate without a response

- **WHEN** the review has no in-scope behavior and records the exact `- None` list
- **THEN** the gate recognizes the deterministic empty-set agreement form without asking for confirmation

#### Scenario: Ambiguous or negative intent does not unlock a non-empty gate

- **WHEN** the user's response disputes a non-empty list or leaves its intent unclear
- **THEN** the gate keeps crystallization blocked and returns to the review discussion for revision or clarification

### Requirement: A materially changed idea starts a new edge-case lifecycle

When exploration materially changes the current idea into a new stable idea, `sai-explore` SHALL discard the prior edge-case proposals and agreement for gating purposes, classify the new idea as a new active lifecycle, and run a fresh edge-case review when the new idea becomes solid. Agreement from the prior idea SHALL NOT unlock crystallization for the new idea.

#### Scenario: Material change re-runs the review

- **WHEN** the candidate idea materially changes after its edge-case review reached agreement
- **THEN** the prior list and agreement no longer apply and the new stable idea receives its own edge-case review before crystallization
