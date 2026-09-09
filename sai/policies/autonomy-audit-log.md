# Autonomy Audit Log (pinned layout)

Single source of the pinned scannable layout for the autonomy audit that
closes a supervised phase. Consumed by reference by `sai-explore`'s
supervised contracts — the spec phase, the design phase, and the
Direct Build (unattended) run — which name their own phase label when they
invoke this layout. Consuming surfaces SHALL NOT restate the layout inline.

Also consumed by reference by every coordinator surface that fetches
`@sai/policies/no-commit-guard.md`: the guard's one visible violation line
(§ Incident line below) rides this layout's conversation-only invariant.

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
`supervised spec phase`, `supervised design phase`, or the Direct Build - Unattended run's label); the layout itself never changes.

## Empty-report case (no auto-answers)

```text
Autonomy audit — <phase label>
Auto-answered: 0   Escalated: <M>
(no questions were auto-answered this phase)
```

## Incident line (no-commit guard)

When the no-commit guard remediates a violation, the coordinator prints
exactly one visible incident line, in the fixed field order below, as
ordinary conversation text. Like the audit log, the line is NEVER written to
any file, artifact, change directory, or configuration, and never more than
one line is printed per violation:

```text
> NO-COMMIT GUARD: unauthorized commit(s) detected after <worker label> dispatch — reset to <base> (mixed); commits preserved unstaged; evidence: <sha> <subject>[; <sha> <subject>]
```

`<worker label>` is the dispatched worker's name, `<base>` is the window's
`guard_base`, and the evidence pairs come verbatim from the verify payload's
`commits` list. When that list is empty, the evidence field reads exactly
`evidence: none reported`.
