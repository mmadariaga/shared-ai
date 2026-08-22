# DDR 0159: Fast-lane selection consent pre-authorizes exactly one local commit

<!-- ddr-index: refs ddr:0157, refs ddr:0052 -->

## Status

Accepted

## Context

The fast lane's premise is an unattended run ending in a committed change. Requiring a mid-run commit authorization would reintroduce the exact human gate the option trades away, while granting blanket git authority would exceed any reasonable reading of user consent.

## Decision

1. Selecting **Auto (fast implementation)** on the crystallization-close selector is the single explicit user act that both authorizes the two workers' delegated writes and pre-authorizes exactly one local commit inside the hands worker's closed order.
2. The pre-authorization covers staging of owned paths and one HEREDOC-form local commit — never push, amend, or force.
3. Staging is path-scoped to owned paths only; unrelated dirty worktree files can never enter the authorized commit even though no per-commit confirmation intervenes.

## Alternatives Considered

- A dedicated commit picker before the mutation — rejected because it breaks the unattended premise for a gate the selection already answers; safe-operations confirmations remain in force for anything outside the closed order.
- No commit at all, leaving the tree dirty for manual commit — rejected because it halves the feature's value and strands archive moves unstaged.
- Session-wide commit authorization for all follow-up work — rejected as over-broad; exactly one commit is consented.

## Consequences

- The commit subject and body are authored from staged state under commit-rules faithfulness, so the message cannot describe uncommitted work.
- A hands-worker failure stops before mutation with nothing written and reports manual `/sai-archive` / `/sai-commit` guidance.
- The consent semantics mirror how selecting Auto consents delegated writes today: consent to selection and dispatch, never to answer later worker questions.

## Related

- `docs/ddr/0052-human-verification-deferral-under-fast-track.md`
- `docs/ddr/0157-fast-lane-validation-and-mutation-stay-in-separate-actors.md`
