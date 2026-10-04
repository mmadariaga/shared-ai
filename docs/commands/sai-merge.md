# `/sai-merge`

## Command function

Integrates a local branch into the current branch using a strategy chosen by the user: `Merge`, `Rebase`, or `Rebase with squash`.

## Flags and behavior modifiers

- `--fast-track`: chooses `Merge` and applies each complete strategy after presenting it, including strategies for later conflicts. Normal mode retains apply/revise/decline. Unrelated questions and safety checks remain unchanged in Claude Code and opencode.

## In detail

The command starts by identifying the branch to integrate and offering a strategy. `Merge` combines the branch histories. `Rebase` replays the commits from the current branch one by one on top of the selected branch. `Rebase with squash` first combines the commits from the current branch into one and then places it on top of the selected branch.

When the integration is clean, the command skips conflict work entirely and asks for no language or strategy. When conflicts appear, it shows the affected files and asks which language to use while working on them. Resolution always covers all affected files. It then analyzes all conflicts and presents a global strategy. Normal mode lets the user apply, revise, or decline it; fast-track applies it automatically after presentation.

After applying the strategy, it verifies the result again. Without a test suite, it reports that verification is unavailable and continues without claiming tests passed. Test failures retain the three-round correction budget; remaining failures are reported even when finalization proceeds. If a new problem appears, it resumes the analysis with the updated information and the same mode-specific strategy rule. A rebase that stops at several commits repeats this cycle once per stop. It can also resolve number collisions in documented decisions and keep their references consistent.

Invoking `/sai-merge` authorizes automatic local merge finalization, continuation at each resolved rebase stop, and a collision-repair commit after a finished rebase. A finished rebase with nothing pending creates no extra commit. This authorization applies only to this command and these operations: it adds no push, destructive-operation permission, or bypass of Git checks. The coordinator owns Git mutations and preserves unrelated changes; failures report the exact state without claiming success.
