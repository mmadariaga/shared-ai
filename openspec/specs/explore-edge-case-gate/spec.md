# explore-edge-case-gate Specification

## Purpose

TBD

## Requirements

### Requirement: Crystallization waits for edge-case agreement

The edge-case review SHALL be the readiness act for a solid idea; `sai-explore` SHALL NOT emit the pre-crystallization crystallize reminder or a `Ready to Propose` block until the current stable idea's edge-case review has reached semantic agreement. After agreement, it SHALL emit the existing crystallize reminder without a separate readiness signal. If the user explicitly asks to crystallize before that review has completed, the request SHALL trigger the review with no skip path; the request remains pending and proceeds through the existing slicing and language gates only after agreement. The mandatory edge-case gate SHALL remain in force under `--fast-track`; fast-track SHALL NOT auto-approve, skip, or weaken this gate and SHALL continue to bypass only the existing language gates.

#### Scenario: The normal crystallize reminder follows agreement

- **WHEN** a solid idea has an edge-case review that is not yet agreed
- **THEN** `sai-explore` continues the review and emits no crystallize reminder until agreement is obtained

#### Scenario: A premature crystallize request cannot bypass review

- **WHEN** the user explicitly asks to crystallize while the edge-case review has not reached agreement
- **THEN** `sai-explore` runs the edge-case review first with no skip option
- **AND** it emits the requested crystallization only after the user agrees to the resulting list

#### Scenario: Fast-track does not bypass the edge-case gate

- **WHEN** `sai-explore` runs with `--fast-track` and the current idea has not reached edge-case agreement
- **THEN** it still runs the mandatory edge-case review and blocks the crystallize reminder and crystallization until agreement
- **AND** fast-track bypasses only the existing language gates

### Requirement: Agreement is recognized by semantic intent

The edge-case gate SHALL recognize agreement from the user's dominant conversational intent, using the same intent-over-literal approach as the `review-loop` token pattern. It SHALL accept semantically affirmative responses in the ambient language, SHALL keep the review open for disagreement or ambiguity, and SHALL NOT replace discussion with a native agreement picker or require a fixed phrase.

#### Scenario: Natural-language agreement unlocks the gate

- **WHEN** the user clearly confirms the proposed list in conversational language
- **THEN** the gate treats the list as agreed without requiring a particular wording or language

#### Scenario: Ambiguous or negative intent does not unlock the gate

- **WHEN** the user's response disputes the list or leaves its intent unclear
- **THEN** the gate keeps crystallization blocked and returns to the review discussion for revision or clarification

### Requirement: A materially changed idea starts a new edge-case lifecycle

When exploration materially changes the current idea into a new stable idea, `sai-explore` SHALL discard the prior edge-case proposals and agreement for gating purposes, classify the new idea as a new active lifecycle, and run a fresh edge-case review when the new idea becomes solid. Agreement from the prior idea SHALL NOT unlock crystallization for the new idea.

#### Scenario: Material change re-runs the review

- **WHEN** the candidate idea materially changes after its edge-case review reached agreement
- **THEN** the prior list and agreement no longer apply and the new stable idea receives its own edge-case review before crystallization
