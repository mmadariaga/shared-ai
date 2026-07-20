## Why

Under `sai-4-apply --fast-track` the run is otherwise unattended — commits are pre-authorized and Human Verification is deferred — yet the implementation.md Prerequisites branch-selection prompt still stops the coordinator to ask which branch to use. "Stay on current branch" performs no git mutation, so auto-selecting it removes the last interactive stop without weakening the safety model.

## What Changes

- Extend `sai-4-apply`'s fast-track opt-out set to include the implementation.md Prerequisites branch-selection prompt: under an active fast-track signal the coordinator auto-selects option 2 "Stay on current branch" without asking.
- Print a short announcement line (`> Fast-track: staying on current branch "{current-branch}"`) so there is a trace of why no prompt appeared.
- In detached HEAD, do NOT auto-stay — fall back to asking the branch prompt interactively.
- The auto-selection is implemented in `sai/instructions/apply.md` (apply-time), colocated with the existing fast-track behaviors (commit pre-activation, Human-Verification deferral) — not in the implementation.md template.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `sai-fast-track-flag`: add a requirement (plus scenarios) that `sai-4-apply --fast-track` auto-selects "Stay on current branch" for the Prerequisites branch prompt, with a detached-HEAD ask-fallback and an announcement line; and update the fixed per-command opt-out set so `sai-4-apply`'s named gates additionally include the Prerequisites branch-selection prompt.

## Impact

- Spec: `openspec/specs/sai-fast-track-flag/spec.md` — one ADDED requirement, one MODIFIED requirement (the per-command opt-out set scenario).
- Implementation surface (downstream `/sai-3`/`/sai-4`, not this phase): `sai/instructions/apply.md` gains the apply-time rule resolving the Prerequisites branch prompt under an active fast-track signal.
- No `.openspec.yaml` key, session flag, or environment variable is introduced. No other command surfaces this prompt, so scope is `sai-4-apply` only.

## Proposal Research Documentation

**Local files**:
- `openspec/specs/sai-fast-track-flag/spec.md` — canonical fast-track membership, the fixed per-command opt-out requirement (scenario "The opt-out set is fixed per command"), and existing sai-4-apply opt-outs.
- `sai/instructions/apply.md` — existing fast-track behaviors: Human-Verification deferral (workflow step 3) and commit pre-activation (`session_commit_authorized`); confirms apply-time is where fast-track state is known.
- `sai/instructions/implement.md` (lines 235-252) — the implementation.md Prerequisites three-option branch prompt, option 2 "Stay on current branch", detached-HEAD label handling, and the branch-base sub-prompt already skipped when stay-on-current is chosen (line 251).

**External URLs**: none.

## Additional Notes

- The three branch options live in the implementation.md Prerequisites template (`implement.md:243-246`): (1) Suggest branch, (2) Stay on current branch, (3) Enter branch name manually. Option 2 is the only zero-mutation choice — it creates no branch and switches to none.
- Reframing: the auto-default is "pick the zero-mutation branch choice", not "skip a git approval". This is why it does not collide with the existing carve-out that keeps branch create/switch outside fast-track — staying on the current branch is a git no-op.
- The branch-base sub-prompt (`implement.md:248-251`) is already skipped when option 2 is chosen, so auto-staying needs no extra handling for it.
- Detached HEAD is the safe-fallback exception: option 2's label there would be `detached HEAD`, and auto-committing onto a detached HEAD is fragile, so fast-track SHALL still ask.
