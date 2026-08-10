# explore-pre-crystallization-closure Specification

## Purpose

TBD

## Requirements

### Requirement: Successful active exploration ends with an actionable closure

Every successful `sai-explore` response whose current idea has the `active-uncrystallized` Closure State SHALL end with one of two actionable forms: a genuine unresolved question relevant to the idea, or a concise reminder containing the literal `crystallize` token and stating that crystallization generates the paste-ready prompt for `/sai-1-spec`.

The response MUST ask a question only when genuine uncertainty remains. When no genuine uncertainty remains, it MUST use the reminder instead of inventing a question. This requirement applies on every qualifying successful turn, including later turns for the same stable idea after the one-time readiness signal has already been emitted.

The required reminder is phase navigation for the active exploration lifecycle, not an unrelated follow-up proposal. It SHALL take precedence over the general prohibition on proposing follow-up actions in `sai/policies/remember.md:5` while the Closure State is `active-uncrystallized`, and SHALL NOT be treated as permission to propose unrelated work.

#### Scenario: Active exploration has a genuine unresolved question

- **WHEN** a successful exploration turn leaves a genuine unresolved question whose answer could change the idea
- **THEN** the response ends with that relevant question
- **AND** the response is not required to append the fallback reminder

#### Scenario: Active exploration has no genuine unresolved question

- **WHEN** a successful exploration turn leaves no genuine unresolved question
- **THEN** the response ends with a concise reminder containing the literal `crystallize`
- **AND** the reminder states that crystallization generates the paste-ready prompt for `/sai-1-spec`

#### Scenario: A later active turn still needs a reminder

- **WHEN** a later successful turn concerns the same active-uncrystallized idea and still has no genuine unresolved question
- **THEN** the same actionable closure rule is evaluated again
- **AND** the fallback reminder SHALL repeat rather than being suppressed by once-per-idea readiness tracking

#### Scenario: A non-successful response follows an existing failure contract

- **WHEN** prerequisite validation halts or another existing failure path produces a non-successful response
- **THEN** the new closure requirement is not applied
- **AND** the existing remediation literal and failure behavior remain unchanged
