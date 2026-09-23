# Archive Commit Gate

The coordinator-owned post-archive commit gate of `/sai-archive`, applied on
the ordinary route after `openspec archive <name> --yes --json` succeeded.
Its governing spec is `openspec/specs/sai-archive-commit-gate/spec.md`.

## Archive paths

The gate stages exactly the **archive paths** with pathspec-scoped,
deletion-aware commands, never an unscoped `git add -A` or `git add .`, and
never any other path:

```bash
git add -A -- openspec/specs openspec/changes/archive
# only when the change directory was tracked before the move:
git add -A -- openspec/changes/<name>
```

The second command records the removal of the change directory the CLI moved;
without it the commit would leave the original change tracked beside its
archived copy. Decide it with `git ls-files -- openspec/changes/<name>`
before staging: non-empty output means tracked.

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
3. Compose the message by applying `sai/commands/commit/instructions.md`
   Steps 1–5 with `sai/policies/commit-rules.md` as the single source of
   message rules. The guard has already ruled out Step 1's "No staged changes"
   stop.
4. Add the retired-capability body lines of
   `sai/commands/archive/retirement-declaration.md` § Disclosure when this run
   retired capabilities.
5. Commit with the composed message.

## Amend the latest commit

1. Before any staging, check whether `HEAD` is pushed: run
   `git log @{push}..HEAD --oneline`. When `@{push}` does not resolve (no
   upstream), or the output is non-empty, `HEAD` is unpushed. When the output
   is empty, `HEAD` is pushed: print an explicit warning and ask a secondary
   confirmation. A decline ends the gate with nothing staged and nothing
   committed.
2. Stage the archive paths.
3. Run the empty-index guard.
4. Run `git commit --amend --no-edit`.

## Do nothing

Stage nothing and commit nothing.

## Fast-track

Under `fast_track_active`, the selector is not shown: the gate runs **Create a
new commit** directly, after the same skip rule. On this path, Step 1's
secret-file heuristic of `sai/commands/commit/instructions.md` (for example the
`*credentials*` pattern) presents no confirmation stop, because the staged set
is confined to the archive paths under `openspec/`.
