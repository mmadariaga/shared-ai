# No-Commit Guard

Single source of the deterministic HEAD-immobility guard that coordinator
cards wrap around their routed worker dispatches. Workers keep their prose rule
never to run a mutating git command; this guard catches the recurrences that
prose misses, in every current and future worker, without new prose.

## The single rule

HEAD must be identical at the opening and at the closing of every guard
window. One snapshot, one verify, two git observations per window, zero project knowledge: no path lists, no scope validation, no
project configuration. The threat model is accidents, not malice — a worker
that commits and self-resets evades the guard by design.

## The tool

`sai/tools/no-commit-guard.js` makes the checks. Fetch
@sai/policies/tool-resolution.md and resolve the copy with `<name>` set to
`no-commit-guard.js`; the first existing candidate wins. Run it, read its
verdict, and follow § Verdict handling: the verdict is final, so run no git
probe of your own in its place and never repair a verdict. The invocations are
byte-identical whichever candidate wins, so a single whitelist entry per root
covers both:

```
node <tool-path> snapshot --json --cwd <project-root>
node <tool-path> verify --base <guard_base> [--allow-commit] --json --cwd <project-root>
```

Always pass `--json`, and `--cwd` with the project root the command was invoked
from. If no candidate exists, name the candidates you tried, log one line that
the guard is inactive, and continue without it; there is no prose fallback.

## Window pairing

A **window** is the stretch between a guard `snapshot` and its `verify`.
Windows are bounded by control hand-offs, not by worker dispatches: one window
spans every consecutive worker stretch — fresh dispatches, same-worker
continuations, and replacement workers alike — until the next boundary. A
replacement worker therefore inherits the running window's `guard_base` and
takes no new snapshot.

A **boundary** forces the running window to close and, when another worker
stretch follows, a new one to open. The closed list of boundaries is:

1. **Human turn** — a `needs_input` result (closed or open), a nonterminal
   extension whose handler hands the turn to the user (such as merge's
   `conflict_detected` language question), or a user interruption that is
   later resumed.
2. **Coordinator git mutation** — any git mutation the coordinator itself runs:
   an apply commit gate (asked or pre-authorized), a merge launch, checkout,
   `git mv`, or staging, the archive CLI move and post-archive commit, a
   close's staging and commit, and a nonterminal extension whose handler
   performs one.
3. **Run close** — the terminal result (`completed`, `failed`, `cancelled`) or
   user cancellation after which the coordinator dispatches no further worker
   before a human turn or its own git mutation.

Nothing else is a boundary. A progress event, a `notice`, a ready return, a
nonterminal extension whose handler neither asks the user nor mutates git, a
terminal result followed directly by the next dispatch (apply's RED then
GREEN, a recovery replacement, the next segment of a composition), and a
segment transition inside a composition all continue the running window: the
coordinator acts on them with no guard call.

- **Snapshot** — open a window with `snapshot` once the first dispatch's
  harness-native resumable handle is captured and retained, immediately before
  the worker's expensive work proceeds; after a human turn, once the answer is
  in and before it is forwarded to a worker; and after a coordinator git
  mutation, before the next dispatch or continuation. Hold the returned `head`
  SHA as `guard_base` for that window. A dispatch cancelled before its handle
  returns opens no window; when no window is running, its retry starts over
  with a deferred snapshot, which also baselines any HEAD movement between
  dispatch and handle capture.
- **Verify** — close the window with `verify --base <guard_base>` immediately
  before each boundary and **before acting on it**: before presenting a
  human-turn question, before a coordinator git mutation, and before acting on
  a run-closing result. A result that is not a boundary gets no verify.
- **Batch semantics** — a concurrent batch sits inside one window: the
  coordinator neither moves HEAD nor asks anything inside it. With no window
  running at batch start, snapshot once every batch handle is captured. Verify
  at batch close, before acting on the batch outcome, when that close is a
  boundary.
- **`allow_commit` isolation** — a dispatch or continuation carrying
  `allow_commit` always opens its own window and is never merged with a
  preceding one: run a normal `verify` immediately before it, a fresh
  `snapshot`, and `verify --allow-commit` over that window only, so the flag
  cannot mask an unauthorized commit made by an earlier worker.

Because every coordinator git mutation is a boundary, coordinator-owned
mutations (an apply commit gate, a merge launch, the archive post-archive
commit, backfill staging) always run between windows, never inside one.

`guard_base` is invocation-scoped conversation state, exactly like
`fast_track_active`: it is never carried across a boundary and never written to
`.openspec.yaml`, an artifact, a config, a dispatch envelope, or a
reconstruction field. When the snapshot cannot resolve HEAD — not a git
repository, git missing, or an unborn HEAD — record `guard_base` as the literal
`n/a`, print one conversation line that the guard is inactive for this window
(one line per window, never one per continuation), and skip the window's
verify: no check, no remediation, and the route continues. The next boundary
attempts a fresh snapshot.

## Verdict handling

- **`clean`** (exit 0) — HEAD is unchanged. Act on the result normally.
- **`allowed`** (exit 0) — HEAD moved while `allow_commit` was carried for this
  window. Act on the result normally. `allow_commit` is a dispatch-carried,
  coordinator-held flag with **lax** semantics: any HEAD movement passes while
  it is carried, with no scope validation, and it is never persisted. Its only
  carrier is the archive worker's pre-authorized Direct Build
  `--direct-build-execute` continuation, the one local commit inside its
  validated closed execution order; verify that window with `--allow-commit`.
- **`n/a`** (exit 0) — no check was possible. Print one conversation line
  naming the payload's `reason` and act on the result normally, without
  remediation.
- **`violation`** (exit 1) — HEAD moved during the window without
  authorization. Remediate exactly once, in this order:
  1. **Capture the evidence** — use the verify payload's `commits` list (sha +
     subject of exactly `git log <base>..HEAD`) verbatim; the reset erases
     those commits, and no extra git command is needed.
  2. **Reset** — run exactly `git reset <guard_base>` (mixed). The mixed reset
     removes the commits and returns their content unstaged, so it cannot leak
     into the next authorized commit and no working-tree change is lost; never
     `--hard`, `--soft`, `--keep`, a checkout, or a branch operation.
  3. **One incident line** — print the single pinned incident line
     (§ Incident line below), built from the captured evidence, as
     conversation text only: one line per violation, written to no file.
  4. **Continue** — act on the result normally. A violation is never a
     failure, cancellation, recovery trigger, or diagnosis-round input of its
     own.

The calling flow pre-authorizes this one mixed reset, so it does not fire the
safe-operations confirmation gate; every other safe-operations confirmation
stays in force.

## Accepted limits

- A human commit inside the window is reset like a worker commit; its content
  stays, unstaged.
- A violation is detected when its window closes at the next boundary, not at
  the exact worker stretch that committed; the mixed reset to the window base
  still preserves all content unstaged, and one incident line may aggregate
  commits from several workers of the same window.
- Pre-existing staged content loses its staged state on remediation; the
  content stays intact.
- Branch and tag creation, and a worker that commits and self-resets, are
  undetectable.
- Hook side effects of a worker commit (CI, linters) are not remediable.
- Out-of-scope working-tree writes are not detected and are assumed legitimate;
  remediation never deletes them, and removing them is the user's call.

## Scope

The two tool invocations per window are the coordinator's only git access on an
artifact-blind clean route and change no other rule of the calling card. Worker
contracts keep their prose prohibitions unchanged; the guard adds no worker
prohibition, binding edit, or helper-permission change.

## Incident line

When the guard remediates a violation, the coordinator prints
exactly one visible incident line, in the fixed field order below, as
ordinary conversation text. The line is NEVER written to
any file, artifact, change directory, or configuration, and never more than
one line is printed per violation:

```text
> NO-COMMIT GUARD: unauthorized commit(s) detected after <worker label> dispatch — reset to <base> (mixed); commits preserved unstaged; evidence: <sha> <subject>[; <sha> <subject>]
```

`<worker label>` names every worker dispatched inside the window, in dispatch
order and joined with ` + ` (a single worker's name when only one ran), `<base>` is the window's
`guard_base`, and the evidence pairs come verbatim from the verify payload's
`commits` list. When that list is empty, the evidence field reads exactly
`evidence: none reported`.
