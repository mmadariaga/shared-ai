# explore-pre-crystallization-closure Specification

## Purpose

TBD

## Requirements

### Requirement: Successful active exploration ends with an actionable closure

Every successful `sai-explore` response at stages 1 through 3 of the four-stage pre-crystallization progression (`explore-pre-crystallization-stages`) whose current idea has the `active-uncrystallized` Closure State SHALL end with one of two actionable forms: a genuine unresolved question relevant to the idea, or a concise stage-aware closure reminder. The reminder SHALL name the token that advances from the user's current stage: at stages 1 and 2 (`Explore change` and `Review edge cases`) it SHALL name the `next-step` token; at stage 3 (`Implementation details`) it SHALL name both the `next-step` token and the `crystallize` token, retaining the existing literal ``Say `crystallize` when ready; crystallization generates the paste-ready prompt for `/sai-1-spec` ``. At stage 4 (`Crystallize`) the crystallization flow itself is the closure: advancing into the stage counts as the explicit crystallization request, and the response ends with the flow's own pending question — a language-gate or slicing-clarification question, re-asked when an unrelated turn interrupts the flow — or with the `Ready to Propose` block when the flow completes; no stage-aware reminder is appended at stage 4.

The response MUST ask a question only when genuine uncertainty remains. When no genuine uncertainty remains, it MUST use the stage-appropriate reminder instead of inventing a question. This requirement applies on every qualifying successful turn at stages 1 through 3, including later turns for the same stable idea after the one-time readiness signal has already been emitted. A materially changed idea that resets the progression to `Explore change` (`explore-pre-crystallization-stages`) resumes the stage-aware reminder from stage 1.

The required reminder is phase navigation for the active exploration lifecycle, not an unrelated follow-up proposal. It SHALL take precedence over the general prohibition on proposing follow-up actions in `sai/policies/remember.md:5` while the Closure State is `active-uncrystallized`, and SHALL NOT be treated as permission to propose unrelated work.

#### Scenario: Active exploration has a genuine unresolved question

- **WHEN** a successful exploration turn leaves a genuine unresolved question whose answer could change the idea
- **THEN** the response ends with that relevant question
- **AND** the response is not required to append the fallback reminder

#### Scenario: No genuine unresolved question at stage 1 or 2

- **WHEN** a successful exploration turn leaves no genuine unresolved question and the current stage is `Explore change` or `Review edge cases`
- **THEN** the response ends with the concise closure reminder naming the `next-step` token

#### Scenario: No genuine unresolved question at stage 3

- **WHEN** a successful exploration turn leaves no genuine unresolved question and the current stage is `Implementation details`
- **THEN** the response ends with the closure reminder naming both the `next-step` token and the `crystallize` token
- **AND** the reminder contains the literal ``Say `crystallize` when ready; crystallization generates the paste-ready prompt for `/sai-1-spec` ``

#### Scenario: The Crystallize stage carries no reminder

- **WHEN** the current stage is `Crystallize` or the crystallization flow is in progress
- **THEN** no stage-aware closure reminder is appended
- **AND** the response ends with the flow's own pending question when one is pending, or with the `Ready to Propose` block when the flow completes

#### Scenario: An interrupted flow re-asks its pending question

- **WHEN** an unrelated turn interrupts the crystallization flow while a language-gate or slicing-clarification question is pending
- **THEN** the response ends with the still-pending flow question re-asked
- **AND** no stage-aware reminder is appended

#### Scenario: A later active turn still needs a reminder

- **WHEN** a later successful turn concerns the same active-uncrystallized idea and still has no genuine unresolved question
- **THEN** the same stage-aware closure rule is evaluated again
- **AND** the fallback reminder SHALL repeat rather than being suppressed by once-per-idea readiness tracking

#### Scenario: A reset idea resumes the stage-1 reminder

- **WHEN** a materially changed idea resets the progression to `Explore change` (`explore-pre-crystallization-stages`) and a later successful turn has no genuine unresolved question
- **THEN** the response ends with the closure reminder naming the `next-step` token, as at stage 1

#### Scenario: A non-successful response follows an existing failure contract

- **WHEN** prerequisite validation halts or another existing failure path produces a non-successful response
- **THEN** the new closure requirement is not applied
- **AND** the existing remediation literal and failure behavior remain unchanged
