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
4. Run `git commit --amend --no-edit`.

## Create a new commit

1. Stage exactly the two literal paths:

   `git add openspec/specs openspec/changes/archive`

   Never `git add -A` and never stage any other path.
2. Compose the commit message by applying `sai/instructions/commit.md` steps
   1–5 — inspect staged state, classify the change, determine scope, compose
   the message, and verify faithfulness — with `sai/policies/commit-rules.md`
   as the single source of commit-message rules. Reference those two files; do
   not restate their rule content.
3. Commit with the composed message. The picker selection is the per-invocation
   commit authorization: after selection, stage, compose the message from the
   staged diff, and commit without presenting any further authorization prompt.

## Do nothing

Run no `git add` and no `git commit`. The index stays exactly as it was when
the gate was reached.

## Fast-track branch

When the fast-track signal is active for this invocation (`sai-archive
--fast-track`; opt-out set per `openspec/specs/sai-fast-track-flag/spec.md`):

- Present no gate prompt; auto-select the amend option, assuming unpushed HEAD.
- The pushed-HEAD guard still applies, exactly as in the amend path above, and
  still runs before any staging.
- When the guard fires (HEAD is already pushed): do NOT amend, run no `git add`
  and no `git commit`, and print exactly one explanatory line:

  `amend skipped because HEAD is already pushed`

- The skip rule still applies: when `git status` shows no changes, the gate and
  its auto-selection are skipped.
- No other gate is affected.
