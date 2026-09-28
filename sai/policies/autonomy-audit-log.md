# Autonomy Audit Log (pinned layout)

Single source of the pinned scannable layout for the autonomy audit that
closes a supervised phase. The supervised spec and design phases consume this
layout by reference and supply their own phase labels. The Direct Build -
Unattended final report is the scoped exception: it does not emit an autonomy
audit. This exception changes no other route's display requirement. Consuming
surfaces SHALL NOT restate the layout inline.

## Invariants

- An emitted audit is assembled from the run's auto-answer records and the
  escalated count. It is presented in conversation only and is NEVER written
  to any file, artifact, change directory, or configuration.
- In each emitted audit, list every auto-answered question with the exact
  worker question, the exact answer forwarded, and the grounding citation that
  determined it.
- In each emitted audit, report `Escalated` as an aggregate calibration
  denominator only: WITHOUT reproducing the content of any escalated question,
  which the user already saw and answered.
- An audit-emitting route with no auto-answers still presents the empty report
  — the escalated count is shown and no entries are fabricated.
- **Direct Build final-report exception:** The Direct Build - Unattended final
  report does not present an autonomy audit, including the empty-report case.
  This exception applies only to that final report; its other behavior and the
  audit requirement for every other route stay unchanged.

## Pinned scannable layout (field order fixed)

```text
Autonomy audit — <phase label>
Auto-answered: <N>   Escalated: <M>
1. Q: <worker's exact question>
   A: <answer explore forwarded>
   Grounding: <permitted source> — <what within it determined the answer>
2. Q: ...
```

`<phase label>` is supplied verbatim by the emitting contract (for example
`supervised spec phase` or `supervised design phase`); the layout itself never
changes.

## Empty-report case (no auto-answers)

```text
Autonomy audit — <phase label>
Auto-answered: 0   Escalated: <M>
(no questions were auto-answered this phase)
```
