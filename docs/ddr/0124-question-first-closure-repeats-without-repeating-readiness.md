# DDR 0124: Active exploration uses question-first closure and repeatable reminders without repeating readiness

## Status

Accepted

## Context

The existing `sai-explore` readiness signal is intentionally emitted at most once for a stable idea, while a successful active exploration turn can still end without an actionable next conversational move. Suppressing all later closure would leave those turns inert; manufacturing a question would create false uncertainty.

## Decision

For every successful `active-uncrystallized` turn, `sai-explore` first checks whether genuine unresolved information could change the idea. If so, the response ends with that relevant question and no fallback reminder. Otherwise, it ends with a concise `crystallize` reminder stating that crystallization generates the paste-ready prompt for `/sai-1-spec`. The reminder is evaluated and may repeat on every qualifying turn, independently of the once-per-stable-idea readiness signal. It is phase navigation only and never emits or implies the full `Ready to Propose` block without an explicit crystallization request.

## Alternatives Considered

- **Repeat the readiness signal** — rejected because readiness is intentionally once per stable idea.
- **Append both a question and a reminder** — rejected because it is noisy and can imply uncertainty that does not exist.
- **Always ask a question** — rejected because it manufactures uncertainty when no answer could change the idea.
- **Question-first, otherwise repeat the reminder** — chosen because it preserves genuine inquiry while keeping every successful active turn actionable.

## Consequences

- Later active turns remain actionable even after readiness has been emitted.
- The explicit crystallization gate and the existing failure and review-loop terminal contracts remain unchanged.
- The reminder is an intentional exception to the general prohibition on unrelated follow-up proposals, but it cannot be used to propose unrelated work.

## Related

- `openspec/changes/enforce-explore-pre-crystallization-closure/specs/explore-pre-crystallization-closure/spec.md`
- `openspec/changes/enforce-explore-pre-crystallization-closure/specs/explore-crystallization-on-demand/spec.md`
- `openspec/changes/enforce-explore-pre-crystallization-closure/design.md` — Decision 3
