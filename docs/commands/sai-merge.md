# `/sai-merge`

## Command function

Integrates a local branch into the current branch using a strategy chosen by the user: `Merge`, `Rebase`, or `Rebase with squash`.

## Flags and behavior modifiers

- `--fast-track`: chooses `Merge` and applies each complete strategy after presenting it, including strategies for later conflicts. Normal mode retains apply/revise/decline. Unrelated questions and safety checks remain unchanged in Claude Code and opencode.

## In detail

The command starts by identifying the branch to integrate and offering a strategy. `Merge` combines the branch histories. `Rebase` replays the commits from the current branch one by one on top of the selected branch. `Rebase with squash` first combines the commits from the current branch into one and then places it on top of the selected branch.

The command has two sessions and one tool. The tool computes every mechanical result: the starting checks, the conflict inventory, the test run, the decision-number check, and the closing state. The coordinator runs those stages itself, one tool call per stage, asks the questions, performs every Git operation, and writes the final summary. A second session, the worker, starts only when something needs judgment: resolving conflicts, correcting failing tests, or renumbering documented decisions. It keeps the conflict contents out of the coordinator's context, and the coordinator reviews what it wrote. In a rebase that stops several times the same worker is reused for every stop.

When the integration is clean, the command skips conflict work entirely, asks for no language or strategy, and starts no worker unless documented decisions collide. When conflicts appear, it shows the affected files and asks which language to use while working on them. Resolution always covers all affected files. It then analyzes all conflicts and presents a global strategy. Normal mode lets the user apply, revise, or decline it; fast-track applies it automatically after presentation.

After applying the strategy, the coordinator runs the tests. It finds the test command in a fixed order: an explicit command written in `AGENTS.md`, then one in `README.md`, then the merge tool's list of project markers (`package.json`, `Cargo.toml`, `go.mod`, Python, `Makefile`, `mix.exs`, Maven, Gradle, and for .NET a `*.sln` at the root or one level below, else a root `*.csproj`, run with `dotnet test`). Only a command written literally counts; a document that names several test commands with no clear general one counts as naming none. The command is fixed once, before the integration starts, and every verification round uses it: files that the incoming branch adds, removes, or changes do not alter which command runs. Without a match, or with several candidate .NET solutions or projects, it reports that verification is unavailable and continues without claiming tests passed. A command that cannot start (the tool is not installed, the command is unknown) is also reported as unavailable, with the reason, apart from failing tests, and uses no correction round. Test failures retain the three-round correction budget; remaining failures are reported even when finalization proceeds. If a new problem appears, it resumes the analysis with the updated information and the same mode-specific strategy rule. A rebase that stops at several commits repeats this cycle once per stop. It can also resolve number collisions in documented decisions and keep their references consistent.

Invoking `/sai-merge` authorizes automatic local merge finalization, continuation at each resolved rebase stop, and a collision-repair commit after a finished rebase. A finished rebase with nothing pending creates no extra commit. This authorization applies only to this command and these operations: it adds no push, destructive-operation permission, or bypass of Git checks. The coordinator owns Git mutations and preserves unrelated changes; failures report the exact state without claiming success.
