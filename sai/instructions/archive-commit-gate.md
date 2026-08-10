# Archive Commit Gate

Post-archive commit gate for `/sai-archive`. This instruction is fetched
immediately after the upstream archive-skill fetch, so it applies once the
skill completes — the archive move, any delta-spec sync, and the archive
summary. It implements the seven ADDED requirements of
`openspec/changes/sai-archive-commit-gate/specs/sai-archive-commit-gate/spec.md`;
the spec's scenario text is referenced by path, not restated here.

## Skip rule

After the archive skill completes, run `git status`:

- **No changes** → skip the gate entirely: no prompt, no `git add`, no `git commit`.
- **Changes present** → proceed to the gate below.

## Gate presentation

Present a closed-choice action-selector through the harness-native option-picker
per the "Closed-choice prompts" rule in `sai/policies/remember.md`, with exactly
three options, in this order:

1. **Create a new commit (Recommended)**
2. **Amend the latest commit**
3. **Do nothing**

The new-commit option is the only option carrying the `Recommended` marker.
The `commit-auth-gate` option set (`yes` / `no` / `Allow on this session`) is
never used, the session-scoped commit-authorization flag is neither set nor
read, and no session grant is offered.

Ask first, stage after: no `git add` runs until an option is selected.

## Shared empty-index guard

After `git add` of the two literal paths (`openspec/specs`,
`openspec/changes/archive`) and BEFORE executing `git commit --amend` or
creating the new commit, check whether the index contains staged changes:

- Run `git diff --cached --quiet`.
- **Exit 0** (no staged changes) → the two-path staging left the index empty:
  do NOT amend and do NOT create a commit; print exactly one line:

  `[sai-archive] no commit: staging left the index empty`

  Then leave the index exactly as it was after staging. For the new-commit
  path, `sai/instructions/commit.md` steps 1–5 are not applied.
- **Exit 1** (staged changes present) → proceed with the selected commit
  action.

The guard is shared between the two commit options and between the interactive
and fast-track paths: it prevents the amend option from rewriting HEAD with an
identical tree (a pointless SHA) and prevents the new-commit option from
committing nothing. It does not alter the amend path's ordering: the
pushed-HEAD guard still runs BEFORE any staging, so the sequence remains
pushed-HEAD check, then `git add`, then the empty-index check.

## Amend the latest commit

1. Run the pushed-HEAD guard BEFORE any staging, per the `--amend` detection
   idiom in `sai/instructions/commit.md`:
   - Run `git log @{push}..HEAD --oneline`.
   - `@{push}` does not resolve (no configured upstream) → treat HEAD as
     unpushed and proceed without a secondary confirmation.
   - Output is empty and HEAD matches the push target → HEAD is already pushed:
     print an explicit warning and ask a secondary confirmation before amending
     (commit-rules hard rule: never amend a pushed commit without explicit
     warning plus secondary confirmation).
   - Output is non-empty → HEAD is unpushed; proceed.
2. On decline of the secondary confirmation: do NOT amend, do NOT create any
   commit, and leave the index exactly as it was — the guard ran before any
   `git add`, so the index is untouched.
3. Stage exactly the two literal paths:

   `git add openspec/specs openspec/changes/archive`

   Never `git add -A` and never stage any other path.
4. Run the shared empty-index guard (above). When it fires — the two-path
   staging left the index empty — do NOT amend, print the guard's single
   diagnostic line, and run no further git mutation.
5. Run `git commit --amend --no-edit`.

## Create a new commit

1. Stage exactly the two literal paths:

   `git add openspec/specs openspec/changes/archive`

   Never `git add -A` and never stage any other path.
2. Run the shared empty-index guard (above). When it fires — the two-path
   staging left the index empty — do NOT commit, print the guard's single
   diagnostic line, and run no further git mutation. The guard runs before
   `sai/instructions/commit.md` steps 1–5 are applied, so step 1's
   "No staged changes" stop is never reached on this path.
3. Compose the commit message by applying `sai/instructions/commit.md` steps
   1–5 — inspect staged state, classify the change, determine scope, compose
   the message, and verify faithfulness — with `sai/policies/commit-rules.md`
   as the single source of commit-message rules. Reference those two files; do
   not restate their rule content.
4. Commit with the composed message. The picker selection is the per-invocation
   commit authorization: after selection, stage, compose the message from the
   staged diff, and commit without presenting any further authorization prompt.

## Do nothing

Run no `git add` and no `git commit`. The index stays exactly as it was when
the gate was reached.

## Fast-track branch

When the fast-track signal is active for this invocation (`sai-archive
--fast-track`; opt-out set per `openspec/specs/sai-fast-track-flag/spec.md`):

- Present no gate prompt; auto-select the new-commit option.
- Stage exactly the two literal paths:

  `git add openspec/specs openspec/changes/archive`

  Never `git add -A` and never stage any other path.
- Run the shared empty-index guard (above). When it fires — the two-path
  staging left the index empty — do NOT create a commit, print the guard's
  single diagnostic line, and run no further git mutation.
- When the guard passes, apply `sai/instructions/commit.md` steps 1–5 —
  inspect staged state, classify the change, determine scope, compose the
  message, and verify faithfulness — with `sai/policies/commit-rules.md` as
  the single source of commit-message rules, then commit with the composed
  message. The guard runs before steps 1–5 are applied, so the step-1
  "No staged changes" and "Only unstaged changes" stop conditions are never
  reached on this path.
- The step-1 secret-file heuristic (for example the `*credentials*` pattern)
  does NOT apply on the fast-track path and presents no confirmation STOP,
  because the gate fixes the staging scope to exactly the two paths under
  `openspec/`, so a matching staged path is a capability or archived-change
  spec, never a secret.
- There is no pushed-HEAD check, no do-nothing fallback, and no pushed-HEAD
  explanatory line on this path — a new commit is never destructive.
- The skip rule still applies: when `git status` shows no changes, the gate and
  its auto-selection are skipped.
- No other gate is affected.
