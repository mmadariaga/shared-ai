# Auto-Fast Hands Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/policies/commit-rules.md
Fetch @sai/commands/archive/instructions.md and perform its read-only
pre-flight exactly after the validated writes below.
Fetch @sai/policies/remember.md

## Invocation Envelope

The worker receives exactly one opaque string: `arguments_value` — the
ordered mutation order composed by explore's Auto (fast implementation)
supervision: the target change name, the exact destination paths with their
final validated file contents, the archive date-prefix name, and the owned
staging path set. Binding metadata remains outside the worker request. Do not
scan parent conversation history and do not derive any additional mutation.

## Closed-order execution

Execute this exact order and nothing else:

1. **Validated writes** — write each supplied content to its exact supplied
   path under `openspec/changes/{name}/`. Create no other file, never alter a
   supplied content, and never write to a path the order does not name.
2. **Archive pre-flight** — against the files just written, perform the
   existing archive instruction's complete read-only pre-flight: classification
   (including the backfilled marker), unchecked-item scan, delta-spec assessment
   including missing-main-spec additions, and archive-target collision check.
   Apply the supplied fast-track state to the documented unchecked-item and
   delta-sync gates, without skipping the CORE check, AUDIT reporting, or
   collision check. If any check fails or a gate cannot resolve, stop before
   sync, move, staging, or commit. Do not dispatch a second writer or replace
   these checks with an in-memory summary.
3. **Spec sync** — run the upstream openspec delta-spec sync so the change's
   delta specs land in the main specs, then re-read the synced targets to
   confirm they match the change directory.
4. **Archive move** — move `openspec/changes/{name}/` to
   `openspec/changes/archive/YYYY-MM-DD-{name}/` using the supplied date
   prefix; fail rather than overwrite an existing target.
5. **Owned staging** — `git add` exactly the supplied owned path set (the
   reconstructed artifacts now under `archive/`, the synced main specs, and
   the production code paths listed as changed by the implementer). Never
   `git add -A`, `git add .`, or any path outside the supplied set;
   unrelated dirty worktree files must remain unstaged.
6. **Commit-message authoring** — from the staged state only, author one
   message applying `@sai/policies/commit-rules.md` exactly (faithfulness to
   the staged diff, type classification, repo-style detection rubric,
   subject/body/footer limits, hard rules). The message describes only what
   is staged.
7. **Local commit** — execute the commit with the HEREDOC form
   (`git commit -m "$(cat <<'EOF' ... EOF)"`). Local only: never `git push`,
   never amend, never force.

A payload that skips a step, reorders steps, adds a step, or names a path or
action outside this list is rejected: return `failed` with summary naming the
rejected step, having executed nothing.

The archive pre-flight runs after the exact-path writes and before sync,
archive move, staging, or commit. The supplied validated contents are immutable
between schema validation and mutation.

## Lifecycle

Emit no progress events and no handshake event. Every run closes with exactly
one terminal lifecycle status — `completed`, `needs_input`, `failed`, or
`cancelled` — in the closed worker-core shapes, each carrying the mandatory
worker-authored `emitted_on`, a concrete English `summary`, and an ordered
duplicate-free `changed_files`. On success the summary reports, in order: the
written artifact paths, the archive pre-flight result, the sync result, the
archive destination directory, the staged path count, and the commit subject
line. Return
`failed` when any step cannot complete exactly as ordered; never fall back to
a partial or improvised execution.
