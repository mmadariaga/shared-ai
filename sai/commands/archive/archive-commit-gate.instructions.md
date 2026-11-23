# Archive Commit Gate

Fetch `@sai/policies/command-execution.md` and follow it exactly.

The coordinator-owned post-archive commit gate of `/sai-archive`, applied on
the ordinary route after `openspec archive <name> --yes --json` succeeded.

## Archive paths

The gate stages exactly the **archive paths** of the plan the run holds
(`archive-plan.js`, computed before the CLI archive moved the change; the tool
cannot plan a change that is already archived): its `owned_staging_paths`, with pathspec-scoped,
deletion-aware commands, never an unscoped `git add -A` or `git add .`, never
`-f`, and never any other path:

```bash
git add -A -- <owned_staging_paths>
```

The plan lists the archived copies of the change files, the originals that the
move removed from the index (so the commit records their removal), and the main
specs the archive wrote, created, or deleted. Its `omitted_ignored_paths` stay
out, and each is reported as
`[sai-archive] warning: omitted ignored untracked path: <path>`. A plan whose
`owned_staging_paths` is empty leaves the index empty, which the empty-index
guard below reports.

## Skip rule

Run `git status`. With no changes, skip the gate entirely: no question, no
staging, no commit.

## Selector

Present a closed-choice action selector through the harness-native
option-picker per "Closed-choice prompts" in `sai/policies/remember.md`, with
exactly these options in this order:

1. **Create a new commit (Recommended)**
2. **Amend the latest commit**
3. **Do nothing**

The selection is this invocation's commit authorization: no further
authorization question follows, and no session-scoped grant is offered, set, or
read. Staging starts only after an option is selected.

## Empty-index guard

After staging and before any commit or amend, run `git diff --cached --quiet`.
Exit 0 means staging left the index empty: create no commit, amend nothing,
print exactly `[sai-archive] no commit: staging left the index empty`, and run
no further git mutation. Exit 1 continues with the selected action.

## Create a new commit

1. Stage the archive paths.
2. Run the empty-index guard.
3. Author the message with the `sai-archive-worker`: create it when none is
   alive (the coordinator card's Start steps 4 and 5) and send it the
   `--archive-commit-message` envelope of `sai/commands/archive/worker.md` with
   the plan's `commit_body_lines` and `closing_line`. The worker writes the
   subject and body from the staged diff under `sai/policies/commit-rules.md`,
   the single source of message rules; the retired-capability body lines
   (`sai/commands/archive/retirement-declaration.md` § Disclosure) and the
   closing line come from the plan, never from the worker. The guard has already
   ruled out an empty index.
4. Fetch `@sai/policies/issue-origin-preservation.md` and check the known
   pre-move origin of the plan against the archived metadata, warning without
   blocking when lost or unverifiable.
5. Commit with the worker's message (the `summary` of its accepted report)
   passed literally on standard input to `git commit -F -` under
   `@sai/policies/command-execution.md`.

## Amend the latest commit

1. Before any staging, check whether `HEAD` is pushed: run
   `git log '@{push}..HEAD' --oneline`. When `@{push}` does not resolve (no
   upstream), or the output is non-empty, `HEAD` is unpushed. When the output
   is empty, `HEAD` is pushed: print an explicit warning and ask a secondary
   confirmation. A decline ends the gate with nothing staged and nothing
   committed.
2. Stage the archive paths.
3. Run the empty-index guard.
4. Read the latest commit message with `git log -1 --format=%B` and add the
   plan's `closing_line` when the message does not already contain it. With no
   missing line, run `git commit --amend --no-edit`. Otherwise run
   `git commit --amend -F -` with the current message plus the missing line
   passed literally on standard input under
   `@sai/policies/command-execution.md`. An amend asks the worker for nothing.

## Do nothing

Stage nothing and commit nothing.

## Fast-track

Under `fast_track_active`, the selector is not shown: the gate runs **Create a
new commit** directly, after the same skip rule. On this path, Step 1's
secret-file heuristic of `sai/commands/commit/instructions.md` (for example the
`*credentials*` pattern) presents no confirmation stop, because the staged set
is confined to the archive paths under `openspec/`.
