# explore-edge-case-review Specification

## Purpose

TBD

## Requirements

### Requirement: Stable ideas trigger one edge-case review

When the user advances to the `Review edge cases` stage of the pre-crystallization staged progression (`explore-pre-crystallization-stages`), or explicitly asks to crystallize before the review has reached agreement (`explore-edge-case-gate`), `sai-explore` SHALL enter one edge-case review for the current stable idea. The review SHALL run at most once for that stable idea, retain its state in conversation only, and number each in-scope proposed behavior consecutively as `E1` through `En`. Only behaviors that define a scope boundary for the proposed change are eligible; edge cases unrelated to the change SHALL be excluded and remain Non-Goals. The review SHALL NOT be triggered by `sai-explore`'s own judgment that the idea is solid; the one-line readiness signal remains governed by `explore-crystallization-on-demand` and never starts the review.

#### Scenario: A stage advance starts the review

- **WHEN** the user advances to the `Review edge cases` stage
- **THEN** `sai-explore` presents the edge-case review before any later stage runs

#### Scenario: A premature crystallize request starts the review with no skip path

- **WHEN** the user explicitly asks to crystallize while the edge-case review has not reached agreement
- **THEN** `sai-explore` runs the edge-case review with no skip option and emits the requested crystallization only after agreement

#### Scenario: A stable idea does not repeat the review

- **WHEN** the same idea remains substantially unchanged after its edge-case review has started or completed
- **THEN** `sai-explore` does not start a second edge-case review for that stable idea

#### Scenario: No in-scope edge cases are found

- **WHEN** exploration identifies no behavior that bounds the proposed change
- **THEN** the review records an empty agreed edge-case list without inventing cases from unrelated Non-Goals

### Requirement: The edge-case review presents numbered behaviors and a semantic agreement question

The edge-case review SHALL present the candidate scope-boundary behaviors as numbered `E1` through `En` proposed behavior statements, followed by one plain conversational question asking whether the list accurately captures the change's relevant edge cases or needs adjustment. The question SHALL be understandable in the conversation's ambient language and SHALL NOT depend on a fixed agreement phrase or a native yes/no option picker.

#### Scenario: Proposed behaviors are numbered for discussion

- **WHEN** the review has one or more in-scope edge cases to discuss
- **THEN** each proposed behavior has a unique consecutive `E` identifier and the user is asked to confirm or adjust the complete list

#### Scenario: Agreement is not tied to a literal phrase

- **WHEN** the user responds to the review in natural language, including a language other than English
- **THEN** the response is evaluated for semantic agreement or discussion intent rather than exact matching of a prescribed phrase

### Requirement: The review converges through agreement or continued discussion

When the user semantically agrees that the proposed list is correct, `sai-explore` SHALL finalize that list for crystallization. A disagreement SHALL keep the review open, incorporate the requested changes, and ask the agreement question again. An ambiguous response SHALL be treated as discussion rather than agreement and SHALL cause the question to be clarified and re-asked.

#### Scenario: Semantic agreement closes the review

- **WHEN** the user communicates that the proposed edge-case list accurately captures the relevant scope boundaries
- **THEN** the review records the list as agreed and allows the edge-case gate to continue

#### Scenario: Disagreement iterates and re-asks

- **WHEN** the user rejects, removes, adds, or materially changes a proposed edge case
- **THEN** `sai-explore` updates the numbered proposals and re-asks for agreement instead of treating the disagreement as approval

#### Scenario: Ambiguity is clarified and re-asked

- **WHEN** the user's response does not clearly agree with or revise the proposed list
- **THEN** `sai-explore` treats it as ongoing discussion and asks again for unambiguous agreement
