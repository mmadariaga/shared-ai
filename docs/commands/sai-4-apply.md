# `/sai-4-apply`

## Command function

Executes the previously prepared implementation plan in the project. It adds or changes code, runs the associated tests, and progresses through the steps until the solution is complete.

## Flags and behavior modifiers

- `--fast-track`: pre-authorizes local commits, automatically keeps a non-detached current branch, and approves preserving plan amendments. It does not answer recovery or already-satisfied questions for you.

## In detail

The command takes `implementation.md` and works through its Steps in order.
For testable work, RED authors the tests and verifies the expected failure.
GREEN can read those tests and complete the plan's skeleton, partial code, or
full implementation, but cannot create, modify, or delete tests. Both receive
the project's writing conventions. Leftover new skeleton markers fail verification.

After each step, it shows which files changed and checks that the result matches the planned work. In normal use, it asks for authorization before creating each commit, so the user retains control over what is saved in the history.

After all Steps are committed, the command runs the full repository suite and
re-exercises functional checks. Checks it cannot verify or that fail remain
pending human review in the final report; they are not silently marked complete.
A failed terminal suite stops closure, leaves the Step commits intact, and can
be rerun by invoking apply again.

## Decisions that still require you

- **RED already passes:** confirm whether the behavior already exists or the
  test checks nothing real. Existing behavior closes the Step with tests only,
  no GREEN and no production change; a vacuous test returns to RED for stronger
  assertions. The Step stays unmarked and uncommitted until your answer.
- **A worker vetoes continuation:** review its evidence and choose to lift that
  veto or correct manually. Lifting it renews no recovery budget and bypasses no
  test, scope, commit, or safety check.
- **Recovery is exhausted:** choose manual correction or explicitly authorize
  one fresh attempt for the whole Step. The prior attempt history is retained.
  Re-entering apply or using fast-track alone grants no new attempts.

Ordinary eligible failures are corrected within bounded recovery before a
human stop. A blocked Step is never marked, committed, or advanced. If the plan
omits a needed file, apply proposes a preserving amendment (automatic under
fast-track), reports it, and commits the amended planning artifacts with the Step.
