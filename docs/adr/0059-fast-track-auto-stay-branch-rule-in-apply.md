# ADR 0059: The fast-track branch auto-stay rule lives in `apply.md`, not in the `implement.md` Prerequisites template

## Status

Accepted

## Context

`sai-4-apply --fast-track` runs unattended: commits are pre-authorized and Human Verification is deferred, both colocated in `sai/instructions/apply.md`. One interactive stop still survives — the implementation.md Prerequisites branch-selection prompt, a three-option closed choice authored in `sai/instructions/implement.md` (`Suggest branch "{feature-name}"`, `Stay on current branch "{current-branch}"`, `Enter branch name manually`). Option 2 performs no git mutation, so auto-selecting it under fast-track removes the last blocking prompt without weakening the safety model. The question is which file owns the auto-selection rule: `apply.md` (where fast-track state is known) or `implement.md` (which authors the prompt the rule resolves).

## Decision

Implement the auto-stay as an apply-time rule in `sai/instructions/apply.md`, as a labeled fast-track subsection next to the existing "Fast-track pre-activation" behavior. Because the rule lives in `apply.md` yet resolves a prompt authored in `implement.md`, the subsection explicitly states its trigger point — it fires at the moment the running plan's implementation.md Prerequisites branch-selection prompt is reached — so the cross-file coupling is not left implicit.

## Alternatives Considered

- **Guard the option-2 auto-select inside the `implement.md` Prerequisites template** — rejected: `implement.md` is authored at design/plan time when the fast-track signal is not resolvable, and it would scatter fast-track policy across two files.
- **Apply-time rule in `apply.md`** — chosen: the fast-track signal is known only at apply time; it colocates with the existing fast-track behaviors (deferral, pre-activation); and the spec mandates the apply-time home.

## Consequences

- All fast-track behaviors stay in one file, each as its own labeled subsection, matching the observed convention.
- A future reader editing `implement.md` to change fast-track branch behavior must be redirected — mitigated by the subsection naming its `implement.md` trigger lines and by the spec pinning the apply-time home.
- Rollback is a plain `git revert` of the `apply.md` edit; behavior reverts to asking the branch prompt under fast-track.

## Related

- `openspec/changes/sai-apply-fast-track-auto-stay-branch/design.md` — Decision D1
- `openspec/changes/sai-apply-fast-track-auto-stay-branch/specs/sai-fast-track-flag/spec.md` — the ADDED auto-stay requirement
- ADR 0052 — Human-Verification deferral under fast-track (sibling fast-track behavior in `apply.md`)
