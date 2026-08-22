# DDR 0151a: Phase-navigation-only questions are not genuine idea uncertainty

<!-- adr-index: refs 0124a -->

## Status

Accepted

## Context

At stages 1–3 of pre-crystallization progression, every successful active-uncrystallized turn must end with either a genuine unresolved question about the idea or a stage-aware closure reminder (DDR 0124a). Without a disqualifier, a question whose only purpose is navigating exploration stages (for example, whether to use `next-step` or advance phases) can be treated as genuine uncertainty, inventing a navigation question and bypassing the stage reminder.

## Decision

At stages 1–3, a question whose dominant purpose is only navigating exploration stages does not satisfy the genuine unresolved-question branch. The response falls through to the existing stage-aware reminder. A question that still carries substantive uncertainty capable of changing the idea remains genuine even if it also mentions advancing.

## Alternatives Considered

- **Treat any interrogative ending as genuine** — rejected: invents navigation questions and bypasses the stage reminder.
- **Hard-block any mention of `next-step`/`crystallize` in questions** — rejected: over-filters legitimate substantive questions that also mention tokens.

## Consequences

- Phase-navigation-only turns always end with the stage-aware reminder rather than a fabricated navigation question.
- Substantive idea uncertainty remains first-class even when navigation wording is present.
- The disqualifier is independent of the crystallization-turn shared close (ADR 0158a) and is applied as its own instruction step.

## Provenance

User — `openspec/changes/single-source-crystallization-close/design.md`, Decision 2.
