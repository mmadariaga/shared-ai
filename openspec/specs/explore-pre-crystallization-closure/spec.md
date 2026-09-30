# explore-pre-crystallization-closure Specification

## Purpose

TBD

## Requirements

### Requirement: Successful active exploration ends with an actionable closure

Every successful `sai-explore` response at stages 1 through 3 of the four-stage pre-crystallization progression (`explore-pre-crystallization-stages`) whose current idea has the `active-uncrystallized` Closure State SHALL end with one of two actionable forms: a genuine unresolved question relevant to the idea, or a concise stage-aware closure reminder. Explore SHALL apply the conditional Approach comparison rule before offering advancement at idea maturity and while comparison is pending; otherwise it SHALL use the usual closure described below. A question whose dominant purpose is only to navigate the exploration stages — for example, asking whether to use `next-step` or whether to move to the next phase without raising substantive uncertainty about the idea — SHALL NOT count as a genuine unresolved question for this rule; the response SHALL fall through to the stage-aware reminder. A question that contains substantive uncertainty capable of changing the idea remains a genuine unresolved question.

Before and during approach comparison, explore SHALL omit `next-step` and advancement offers and end with the pending substantive question about priorities, selection, or unresolved implications. Comparison SHALL remain pending until the user chooses an approach and no substantive questions about that choice remain. Choosing SHALL resolve comparison only, not advance the stage; afterwards explore SHALL restore the usual closure and maturity offer. Unsolicited advancement signals SHALL retain the existing Staged progression advancement recognition rules and SHALL NOT imply acceptance of a recommendation; comparison SHALL add no progression gate or advancement exception.

Outside pending comparison, the reminder SHALL name the token that advances from the user's current stage: at stages 1 and 2 (`Explore change` and `Review edge cases`) it SHALL name the `next-step` token; at stage 3 (`Implementation details`) it SHALL name both the `next-step` token and the `crystallize` token, retaining the existing literal `Say \`crystallize\` when ready; crystallization generates the paste-ready prompt for \`/sai-1-spec\``. At stage 4 (`Crystallize`) the crystallization flow itself is the closure: advancing into the stage counts as the explicit crystallization request, and the response ends with the flow's own pending question — a language-gate or slicing-clarification question, re-asked when an unrelated turn interrupts the flow — or, when the flow completes, with the `Ready to Propose` block(s) followed by the shared crystallization-turn close; no stage-aware reminder is appended at stage 4.

The response MUST ask a question only when genuine uncertainty remains. When no genuine uncertainty remains, including when the only apparent question is phase navigation, it MUST use the stage-appropriate reminder instead of inventing or forwarding a navigation question. This requirement applies on every qualifying successful turn at stages 1 through 3, including later turns for the same stable idea after the one-time readiness signal has already been emitted. A materially changed idea that resets the progression to `Explore change` (`explore-pre-crystallization-stages`) resumes the stage-aware reminder from stage 1, subject to the same conditional Approach comparison rule.

The required reminder is phase navigation for the active exploration lifecycle, not an unrelated follow-up proposal. It SHALL take precedence over the general prohibition on proposing follow-up actions in `sai/policies/remember.md:5` while the Closure State is `active-uncrystallized`, and SHALL NOT be treated as permission to propose unrelated work.

#### Scenario: Active exploration has a genuine unresolved question

- **WHEN** a successful exploration turn leaves a genuine unresolved question whose answer could change the idea
- **THEN** the response ends with that relevant question and is not required to append the fallback reminder

#### Scenario: Phase-navigation question falls through to the stage reminder

- **WHEN** a successful stage-1, stage-2, or stage-3 turn outside pending approach comparison contains only a question about advancing or choosing the next exploration phase
- **THEN** the navigation question is not treated as genuine unresolved uncertainty about the idea and the response ends with the reminder for the current stage

#### Scenario: Substantive uncertainty remains despite navigation wording

- **WHEN** a turn asks about advancing phases but also leaves an unresolved answer that could change the idea
- **THEN** the substantive uncertainty is treated as a genuine unresolved question and the response may end with that question instead of the stage reminder

#### Scenario: No genuine unresolved question at stage 1 or 2

- **WHEN** a successful exploration turn outside pending approach comparison leaves no genuine unresolved question and the current stage is `Explore change` or `Review edge cases`
- **THEN** the response ends with the concise closure reminder naming the `next-step` token

#### Scenario: No genuine unresolved question at stage 3

- **WHEN** a successful exploration turn leaves no genuine unresolved question and the current stage is `Implementation details`
- **THEN** the response ends with the closure reminder naming both the `next-step` token and the `crystallize` token and contains the literal ``Say `crystallize` when ready; crystallization generates the paste-ready prompt for `/sai-1-spec` ``

#### Scenario: The Crystallize stage carries no reminder

- **WHEN** the current stage is `Crystallize` or the crystallization flow is in progress
- **THEN** no stage-aware closure reminder is appended and the response ends with the flow's own pending question when one is pending, or with the `Ready to Propose` block(s) followed by the shared crystallization-turn close when the flow completes

#### Scenario: An interrupted flow re-asks its pending question

- **WHEN** an unrelated turn interrupts the crystallization flow while a language-gate or slicing-clarification question is pending
- **THEN** the response ends with the still-pending flow question re-asked and no stage-aware reminder is appended

#### Scenario: A later active turn still needs a reminder

- **WHEN** a later successful turn outside pending approach comparison concerns the same active-uncrystallized idea and still has no genuine unresolved question
- **THEN** the same stage-aware closure rule is evaluated again and the fallback reminder SHALL repeat rather than being suppressed by once-per-idea readiness tracking

#### Scenario: A reset idea resumes the stage-1 reminder

- **WHEN** a materially changed idea resets the progression to `Explore change` (`explore-pre-crystallization-stages`) and a later successful turn outside pending approach comparison has no genuine unresolved question
- **THEN** the response ends with the closure reminder naming the `next-step` token, as at stage 1

#### Scenario: A non-successful response follows an existing failure contract

- **WHEN** prerequisite validation halts or another existing failure path produces a non-successful response
- **THEN** the new closure requirement is not applied and the existing remediation literal and failure behavior remain unchanged

#### Scenario: Pending approach comparison ends with a substantive question

- **WHEN** approach comparison is pending because priorities, selection, or substantive implications remain unresolved
- **THEN** the response ends with the pending substantive question without mentioning `next-step` or offering advancement

#### Scenario: Resolved approach comparison restores usual closure without advancement

- **WHEN** the user chooses an approach and no substantive questions about that choice remain
- **THEN** comparison resolves, the usual closure and maturity offer resume, and the choice itself does not advance the stage
