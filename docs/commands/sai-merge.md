# `/sai-merge`

## Command function

Integrates a local branch into the current branch using a strategy chosen by the user: `Merge`, `Rebase`, or `Rebase with squash`.

## Flags and behavior modifiers

- `--fast-track`: automatically chooses `Merge`, applies the full available resolution scope without asking about that scope, and removes the squash option. Safety confirmations and final authorization are still required.

## In detail

The command starts by identifying the branch to integrate and offering a strategy. `Merge` combines the branch histories. `Rebase` replays the commits from the current branch one by one on top of the selected branch. `Rebase with squash` first combines the commits from the current branch into one and then places it on top of the selected branch.

When the integration is clean, the command can complete it without asking for additional conflict information. When conflicts appear, it shows the affected files and asks which language to use while working on them. It then analyzes all conflicts, proposes a global strategy, and allows the user to correct it or request clarification before resolutions are written.

After applying the strategy, it verifies the result again. If a new problem appears, it resumes the analysis with the updated information. It can also resolve name collisions in documented decisions and keep their references consistent.

Before creating the final commit, the user must explicitly authorize it. If the user does not authorize it, the command records the state reached and does not present the integration as complete.
