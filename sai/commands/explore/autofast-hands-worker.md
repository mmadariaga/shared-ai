# Auto-Fast Hands Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/policies/commit-rules.md
Fetch @sai/policies/remember.md

## Invocation Envelope

The worker receives exactly one opaque string: `arguments_value`. Its first
line is the payload marker `--autofast-materialize` or `--autofast-finish`,
selecting which half of the closed order below executes; everything after the
marker line is the ordered mutation order composed by explore's Auto (fast
implementation) supervision — the target change name, the exact destination
paths with their final validated file contents, the archive date-prefix name,
and the owned staging path set, as applicable to the selected payload.
Binding metadata remains outside the worker request. Do not scan parent
conversation history and do not derive any additional mutation.

## Closed-order execution

Execute the selected payload's exact order and nothing else:

`--autofast-materialize` executes exactly:

1. **Validated writes** — write each supplied content to its exact supplied
   path under `openspec/changes/{name}/`. Create no other file, never alter a
   supplied content, and never write to a path the order does not name.
2. **Spec sync** — run the upstream openspec delta-spec sync so the change's
   delta specs land in the main specs, then re-read the synced targets to
   confirm they match the change directory.

It stops there: no archive move, no staging, no commit.

`--autofast-finish` executes exactly:

1. **Archive move** — move `openspec/changes/{name}/` to
   `openspec/changes/archive/YYYY-MM-DD-{name}/` using the supplied date
   prefix; fail rather than overwrite an existing target.
2. **Owned staging** — `git add` exactly the supplied owned path set (the
   reconstructed artifacts now under `archive/`, the synced main specs, and
   the implementer's listed changed paths). Never
   `git add -A`, `git add .`, or any path outside the supplied set;
   unrelated dirty worktree files must remain unstaged.
3. **Commit-message authoring** — from the staged state only, author one
   message applying `@sai/policies/commit-rules.md` exactly (faithfulness to
   the staged diff, type classification, repo-style detection rubric,
   subject/body/footer limits, hard rules). The message describes only what
   is staged.
4. **Local commit** — execute the commit with the HEREDOC form
   (`git commit -m "$(cat <<'EOF' ... EOF)"`). Local only: never `git push`,
   never amend, never force.

A payload that skips a step, reorders ITS OWN steps, adds a step, names a
path or action outside its own list, or bears both markers (or neither) is
rejected: return `failed` with summary naming the rejected step, having
executed nothing.

## Lifecycle

Emit no progress events and no handshake event. Every run closes with exactly
one terminal lifecycle status — `completed`, `needs_input`, `failed`, or
`cancelled` — in the closed worker-core shapes, each carrying the mandatory
worker-authored `emitted_on`, a concrete English `summary`, and an ordered
duplicate-free `changed_files`. On a materialize success the summary reports,
in order: the written artifact paths and the sync result. On a finish success
the summary reports, in order: the archive destination directory, the staged
path count, and the commit subject line. Return `failed` when any step cannot
complete exactly as ordered; never fall back to a partial or improvised
execution.
