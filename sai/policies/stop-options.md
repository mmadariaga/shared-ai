# Stop Options

## Scope

An **unplanned stop** is a run, segment, or Step that halts on an error or an unexpected condition and leaves the next move to the user. **Stop options** close it: a stop report, then two or three concrete, costed options with the recommended one first. The closing message lets a context-switched reader choose the next move.

Planned stops keep their own contracts and get no options: a MANDATORY STOP after a completed phase, approval and feedback gates, and stops the user chose (a declined confirmation or a cancellation).

## Closing an unplanned stop

1. Give the stop report the contract requires. When the contract pins the exact stop text (for example the prerequisite literals or "No active changes found. Run `/sai-1-spec` to create one."), that text is the whole output and no options follow. When the contract requires a report without pinned text (for example "name the candidates you tried and stop"), give that report first, then the options. When the contract defines no report, the default stop report states what stopped and why, what is done, what is pending, and the exact state left behind (files written, staged, or committed, and whether the change stays retryable).
2. Offer two or three options. Each names one concrete action, its cost (effort, time, or what it touches), and its effect. Put the recommended option first and say why in one line.
3. When the evidence supports only one viable path, present it as the next step: no picker and no filler alternatives.
4. When the contract already defines the choice for that stop (for example apply's exhausted Step: manual correction or one authorized fresh attempt), that choice is its options; add no second question.

## Evidence and presentation

- Base options on the evidence the stopping surface already holds (payload, diagnosis, hand-back, or what it may read under its contract). Offering options widens no read or write scope.
- Present options through the native picker per `@sai/policies/question-context.md`: context before the picker, short picker. A free-text reply (the picker's "Other" entry) is the user's own instruction, not an invalid option.
- In unattended lanes, "what the user must decide" in the stop notice of `@sai/policies/unattended-runtime-recovery.md` is presented as stop options. The options are concrete actions, so the rule against a routine "how should I proceed?" question holds.
- Apply, Build, and full Direct Build use `@sai/policies/implementation-closing-report.md` for their closing report. Their Next step names the required decision; stop options follow Execution details as a separate decision prompt, outside the report. Existing choices and planned-stop exclusions remain in force; a pending execution question is a pause, not a terminal closing. The `--no-specs` POC keeps its own closing behavior.
- In a composition (/sai-build, /sai-review), a stop inside a segment closes once, at the supervisor, with options covering the whole invocation (for example re-entering through /sai-build), not one set per segment.

## Authority

Options are proposals only. Choosing one authorizes only that action, inside the gates it already carries: safe-operations confirmations, commit gates, and recovery budgets stay in force. No option grants a retry budget; apply's authorized Step retry (`@sai/policies/bounded-recovery.md`) remains the only grant. An option that involves a destructive operation names it so its confirmation fires. This policy adds no authorization, read scope, or write scope, and contract-pinned stop texts, report layouts, and existing choice prompts stay byte-identical.
