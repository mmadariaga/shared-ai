# No-Commit Guard

Single source of the deterministic HEAD-immobility guard that coordinator
cards wrap around their routed worker dispatches. Worker behavioral rules —
"never run a mutating git command" — live in the worker contracts as prose and
stay there; the prose reduces first occurrence, and this guard catches
recurrence in every current and future worker without new prose.

## The single rule

HEAD must be identical immediately before and immediately after every routed
worker dispatch window. One snapshot, one verify, two git observations per
window, zero project knowledge: no path lists, no scope validation, no
project configuration. The threat model is accidents, not malice — a worker
that commits and self-resets evades the guard by design.

## The tool

The checks are made by `sai/tools/no-commit-guard.js`, not re-derived here.
Run the tool, read its verdict, and follow the verdict handling below. Do not
run the underlying git probes yourself in place of the tool, do not
second-guess a verdict, and do not repair one.

Use the copy that lives beside this policy file: a copy under a different root
is a different version. Do **not** build its path by joining a root string to a
suffix — composed absolute paths are known to drop a segment (see the "Path
composition" rule in the fetch skill). Take the **first candidate below that
exists**, copied **verbatim**, exactly as written:

On **Claude Code**, in this order:

1. `.claude/sai/tools/no-commit-guard.js` — the project-local root, relative to the working directory.
2. `~/.claude/sai/tools/no-commit-guard.js` — the user-global root.

On **opencode**, in this order:

1. `.opencode/sai/tools/no-commit-guard.js` — the project-local root, relative to the working directory.
2. `~/.config/opencode/sai/tools/no-commit-guard.js` — the default user-global config root.
3. Only when neither exists: run `opencode debug paths`, take the config directory **exactly as that command prints it** (an XDG override moves it), and use the fixed suffix `sai/tools/no-commit-guard.js` inside it. This is the one place a path is joined at all, and only to a path the harness itself printed.

Whichever candidate wins, the invocations are byte-identical, so a single
whitelist entry per root covers both:

```
node <tool-path> snapshot --json --cwd <project-root>
node <tool-path> verify --base <guard_base> [--allow-commit] --json --cwd <project-root>
```

Always pass `--json`, and always pass `--cwd` with the project root the
command was invoked from. If no candidate exists, say so — name the candidates
you tried — log one line that the guard is inactive, and continue without it;
do not fall back to re-deriving the check in prose.

## Window pairing

A **window** is one dispatch-to-result stretch of a routed worker. The guard
pairs every window:

- **Snapshot** — run the `snapshot` sub-command immediately before each worker
  dispatch and immediately before each same-worker continuation. Hold the
  returned `head` SHA as invocation-scoped coordinator conversation state
  `guard_base` for that window only. A fresh snapshot opens every stretch: a
  coordinator-owned mutation (an apply commit gate, a merge launch, the
  archive post-archive commit, backfill staging) always runs between windows
  and never inside one, because the next stretch starts with its own snapshot.
- **Verify** — run the `verify` sub-command immediately after every returned
  worker result — progress event, notice, nonterminal extension, and terminal
  status alike — and **before acting on that result**. Pass
  `--base <guard_base>`.
- **Batch semantics** — concurrent batch dispatches are one window: snapshot
  at batch start, verify at batch close, before acting on the batch outcome.
  No coordinator mutation of HEAD may occur inside a batch.
- **Replacement workers** — a replacement dispatch is a new window with its
  own fresh snapshot; `guard_base` is never carried across stretches.

`guard_base` is conversation state exactly like `fast_track_active`: never
written to `.openspec.yaml`, any artifact, any config, or any file; never a
dispatch envelope key; never a reconstruction field. When the snapshot cannot
resolve HEAD — not a git repository, git missing, or an unborn HEAD (empty
repository) — record `guard_base` as the literal `n/a`, print one ordinary
conversation line that the guard is inactive for this window, and skip the
window's verify steps entirely: one `n/a` line per window, no check, no
auto-remediation, and the route continues.

## Verdict handling

- **`clean`** (exit 0) — HEAD is unchanged. Act on the result normally.
- **`allowed`** (exit 0) — HEAD moved while `allow_commit` was carried for
  this window. Act on the result normally. `allow_commit` is a
  dispatch-carried, coordinator-held flag with **lax** semantics: any HEAD
  movement passes while the flag is carried, with no scope validation. Today's
  only carrier is the archive worker's pre-authorized Direct Build
  `--direct-build-execute` continuation — the one local commit inside its
  validated closed execution order; run that window's verify with
  `--allow-commit`. No other dispatch carries the flag, and the flag is never
  persisted.
- **`n/a`** (exit 0) — no check was possible. Print one ordinary conversation
  line naming the payload's `reason`, act on the result normally, and perform
  no auto-remediation.
- **`violation`** (exit 1) — HEAD moved during the window without
  authorization. Remediate exactly once, in this order:
  1. **Capture the evidence first** — the verify payload already carries the
     `commits` list (sha + subject of exactly `git log <base>..HEAD`), because
     the reset erases the commits. Use that list verbatim; run no extra
     evidence git commands.
  2. **Reset** — run exactly `git reset <guard_base>` (mixed). Never
     `--hard`, never `--soft`, never `--keep`, and never a checkout or
     branch operation. The commits are removed and their content returns
     unstaged, so it cannot leak into the next authorized commit; working-tree
     changes are never deleted.
  3. **One incident line** — print the single pinned incident line from
     `@sai/policies/autonomy-audit-log.md` (§ Incident line) as ordinary
     conversation text, built from the captured evidence. Never write it to
     any file, and never print more than one line per violation.
  4. **Continue** — act on the result normally; the route continues. A
     violation is never a failure, cancellation, recovery trigger, or
     diagnosis-round input of its own.

The remediation reset is pre-authorized by the calling flow and is explicitly
carved out of safe-operations: it does not fire the destructive-operation
confirmation gate. The carve-out covers exactly this one mixed reset; every
other safe-operations confirmation stays in force.

## Limits (accepted, never hidden)

- A human commit inside the window is reset like a worker commit; its content
  is preserved unstaged (single-operator pattern).
- Pre-existing staged content loses its staged state on remediation; the
  content stays intact.
- Branch and tag creation, and an adversarial worker that commits and
  self-resets, are undetectable.
- Hook side effects of a worker commit (CI, linters) are not remediable.
- Out-of-scope working-tree writes remain undetected and are assumed
  legitimate. Remediation never deletes: out-of-scope tree changes are left
  unstaged and removal is always the user's call.

## Scope notes

- The two tool invocations per window are the coordinator's only git access on
  an artifact-blind clean route; they change no other rule of the calling
  card.
- Worker contracts keep their prose prohibitions unchanged. The guard adds no
  worker prohibition, no binding edit, and no helper-permission change.
