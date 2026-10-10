# `/new-change-branch`

## Command function

Creates and switches to a consistently named **local** branch in Claude Code
and opencode, reusing the current discussion. No OpenSpec setup is required.

## Inputs and choices

There are no documented behavior flags. The skill derives the change type,
name, and optional relevant work-item identifier from context, asking only when
information is missing or ambiguous.

- Types: `feat`, `fix`, `docs`, `chore`.
- Names: `<type>/<name>` or `<type>/<id>_<name>`. The name becomes lowercase,
  hyphen-separated words; an actual work-item identifier is preserved exactly.
- Base: you always choose a suggested reference or enter one. Suggestions include
  the current branch, a detected parent, and available `main`/`master` references.
  A detected parent is a convenience, not proof of historical origin. Existing
  remote-tracking references may be stale; the skill does not fetch.

## In detail

The skill shows the final branch and base commit before creating it. Your explicit
request and base selection authorize only creation and switching. Cancellation
before creation leaves the repository unchanged.

An occupied name requires a new choice; it is never reused or automatically
suffixed. A missing HEAD or an active merge/rebase blocks the workflow. Staged,
unstaged, and untracked work are preserved. If Git prevents switching, the skill
stops rather than stashing or discarding work.

Success reports the verified active branch and selected base. A failed operation
reports whether creation occurred and which branch remains active. There is no
automatic cleanup or retry, remote tracking, commit, push, or remote refresh.
