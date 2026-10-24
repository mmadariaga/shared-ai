# `/sai-merge`

## Command function

Integrates a branch into the current branch with no human in the loop: it resolves every conflict by commit intent, repairs ADR/DDR number collisions, checks the result against the test suite as it stood before the launch, and finalizes locally. Nothing is pushed.

## Flags and behavior modifiers

`/sai-merge [<branch>] [--rebase|--squash]`

- `<branch>`: a local branch, or an `origin/<branch>` remote-tracking branch already fetched. Without it, the command asks which branch to integrate. A branch that does not exist stops the run with the cause; a branch already integrated into `HEAD` closes the run with no changes.
- no flag: `Merge`. The merge stops before its commit, so every merge, clean or conflicted, is finalized by the coordinator.
- `--rebase`: replays the commits of the current branch one by one on top of the selected branch. Conflicts may appear at each commit.
- `--squash`: first turns the commits of the current branch since the merge base into one local commit, then rebases it, so conflicts appear at most once. When both `--rebase` and `--squash` are given, `--squash` wins.
- `--fast-track`: accepted and ignored. The command already asks no approval.

## In detail

The run has three parties. The merge tool (`merge.js`) computes every mechanical result: the starting checks, the conflict snapshot, the baseline and test runs, the decision-number check, and the closing state. The coordinator runs the tool and every git operation, reviews what the worker wrote, and writes the closing report. A second session, the worker, starts only when something needs judgment: deciding conflicts, correcting a new test failure, or planning the renumbering of documented decisions. One worker serves the whole run, so a rebase with several stops keeps its context. If the worker has to be replaced, the new one receives a hand-over file.

**Conflicts.** The criterion for every conflict is commit intent: what each side meant to achieve, judged from its commits and from the specs, ADRs, and DDRs it touched. The worker first reports a strategy. The coordinator then has the worker write the resolution through the tool, which keeps each file's encoding, byte-order mark, and line endings and refuses text that still contains conflict markers. The coordinator checks the result against the captured snapshot, reviews it in up to three rounds for fidelity to both sides, changes outside the conflict regions, and leftover markers, and stages it. Review findings still open after the third round are recorded as pending and listed in the report. A conflict with no text to compare (a binary file, a file deleted on one side, a renamed file) takes one whole side, chosen by intent.

When commit intent cannot decide between two sides, because they change the same behavior incompatibly, the command stops and asks, through a picker with options it writes: resolve for either side, leave the merge or rebase in progress, or abort it. It aborts only if you choose that.

**Tests.** The command fixes one test command before anything runs: an explicit command written in `AGENTS.md`, then one in `README.md`, then the project markers (`package.json`, `Cargo.toml`, `go.mod`, Python, `Makefile`, `mix.exs`, Maven, Gradle, and for .NET a `*.sln` at the root or one level below, else a root `*.csproj`, run with `dotnet test`). It runs the suite once at `HEAD` as the baseline, then once on the integrated tree: after the resolution for a merge, and after the last stop for a rebase, never per stop. A test that passes in the baseline and fails after the resolution is run again once. If it fails again, it is a new failure and the only kind that blocks; if it passes, it is reported as flaky. A failure already present in the baseline is reported and never blocks. When the suite does not name individual tests and the baseline already failed, the result is reported as not comparable. With no suite, or several ambiguous candidates, verification is marked unavailable and the report says so.

A new failure gets up to three attempts to correct it, then escalates. On a rebase, the correction goes in one additional local commit on top of the rebased branch, not inside the commit that introduced the failure.

**Decision records.** When the source branch adds ADRs or DDRs whose numbers collide with records already in the tree, the worker plans the renumbering and the coordinator applies the planned replacements and the `git mv`. Ambiguous references, orphan references, and delete/modify conflicts are reported and never modified.

**Authorization.** Invoking `/sai-merge` authorizes these local operations only: the merge commit, the squash commit, each `git rebase --continue`, the correction commit, and the repair commit. It adds no push, no force, no hook bypass, and no destructive operation. Unrelated unstaged changes stay as they are when git allows the launch; staged content unrelated to the merge stops the run before it starts, because it would enter the commit.

**Interruption.** The run keeps its state in a run store and a run directory under the SAI temp root. An interrupted run resumes only when you invoke the command with the same branch; the git state (`MERGE_HEAD`, the rebase directory) wins over the store. A merge or rebase that you started yourself is never touched: the command stops and says why.

**Closing report.** The report uses the language of the chat. It names the method, the branches, the commits the run made, how each conflict was decided, the verification against the baseline, the pending review findings, the collision repairs, and anything still open. For every run that changed the branch it names the `HEAD` recorded before the launch and the command that restores the branch to it. When a rebase or squash rewrote commits that the branch's upstream already holds, it says that the next push needs a force push. A run that finalized the integration ends with `Merge done.`.
