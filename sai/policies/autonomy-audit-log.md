# Autonomy Audit Log (pinned layout)

Single source of the pinned scannable layout for the autonomy audit that
closes a supervised phase. Consumed by reference by `sai-explore`'s
supervised contracts — the spec phase, the design phase, and the
Build (unattended) run — which name their own phase label when they
invoke this layout. Consuming surfaces SHALL NOT restate the layout inline.

## Invariants

- The audit log is assembled from the run's auto-answer records and the
  escalated count. It is presented in conversation only and is NEVER written
  to any file, artifact, change directory, or configuration.
- List every auto-answered question with the exact worker question, the exact
  answer forwarded, and the grounding citation that determined it.
- Report `Escalated` as an aggregate calibration denominator only: WITHOUT
  reproducing the content of any escalated question, which the user already
  saw and answered.
- When nothing was auto-answered, present the empty report — the escalated
  count is still shown and no entries are fabricated.

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
`supervised spec phase`, `supervised design phase`, or the Auto (fast
implementation) run's label); the layout itself never changes.

## Empty-report case (no auto-answers)

```text
Autonomy audit — <phase label>
Auto-answered: 0   Escalated: <M>
(no questions were auto-answered this phase)
```
