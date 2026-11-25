# Test execution

The single source for how an SAI command chooses, runs, and classifies project tests. `/sai-3-implement` (and through it `/sai-build` and `/sai-deep-review`), Direct Build (the explore route and `/sai-direct-build`), and `/sai-merge` load it and keep only their own scope and their fix loop. The goal is a verified change at the lowest cost: a run executes the tests the work indicates and the tests related to the files it changed, and the routine full-suite run belongs to CI.

Fetch `@sai/policies/tool-resolution.md`

`/sai-4-review`, the audits, `/sai-commit`, `/sai-archive`, `/sai-backfill`, `/to-pr`, and the `--no-specs` POC lane run no project tests under this policy and keep their behavior. End-to-end suites are never run by an SAI command, and no SAI command gates on a CI result.

## Terms

- **Indicated tests**: the tests the work itself names: a step's or the plan's `**Tests**` in `/sai-3-implement`, and the test files the implementer created or modified in Direct Build.
- **Related tests**: the test files `test-select.js select` reports for the files a run changed.
- **Scoping idiom**: the way the test command takes a list of test files (a path argument, a filter, or a pattern).
- **Full suite**: every unit and integration suite of the project.
- **Classification base**: the revision a failing test is checked against, named by the command card.
- **Dirty git state**: the uncommitted paths present before the run started (`git status --porcelain`), which the run never owns.

## Resolve the command once

Run `node <tool-path> command [--change <name>] --cwd <project root>` (`test-select.js`, resolved per `tool-resolution.md`; pass `--change` when `openspec/changes/<name>/tasks.md` exists) once, at the start of the run, and use its answer for every run of the tests. It reads the sources in this order: the `**Test Command**` of `## Implementation Context` in `tasks.md`, the `## Test Command` of `SAI_LEARNINGS.md`, `AGENTS.md`, `README.md`, and then the project markers. It prints `verdict`, `command`, `scoping_idiom`, `source`, and `candidates` when ambiguous.

- `found`: `command` is the runnable command line, never one with a placeholder (a source that names only the parameterised form gives it without the placeholder arguments and the flags that take them, kept only when what remains is still a test invocation), and `scoping_idiom` says how it takes a list of test files (a parameterised form such as `dotnet test App.sln --filter FullyQualifiedName~<TestName>`, or a note). A `null` idiom means the command takes no list, so every run of the tests is the full suite with the reason `no scoping idiom`.
- `ambiguous`: several sources at one level name different commands and none is clearly the general one, a source gives only a parameterised form with no runnable command in it, or a `package.json` test script runs under a package manager the tool does not know. It is the obstacle `test-command`.
- `none`: the project has no test suite (no source and no marker, or the `None — no test runner in this project` sentinel). Report it, run no tests, and continue. Direct Build keeps its literal `> Suite gate: skipped — no test suite found`.

## Select

Compute the test set of each run as the indicated tests plus the related tests of the files changed in that run's scope; the command card names the scope. Write the changed paths as a JSON list to a file in the run directory and run `node <tool-path> select --input-file <file> --base <sha> --cwd <project root>`, where `--base` is the revision before the run's changes, which the command card names. It prints `verdict`, `tests`, and `reason`. The tool leaves plan artifacts under `openspec/` out, and files of a type that `codegraph` does not index (documentation, configuration, assets) never cause a fallback; only a file of an indexed type that exists in the working tree and is missing from the index does. A file the run deleted is gone from the index after the sync, so its tests come from the graph of `--base`: the tool writes the project's files at that revision to a private temporary directory (never a worktree, and with no smudge filter: the project's working tree, git index, and refs stay untouched, and no Git LFS object is fetched), indexes it there, asks which tests depended on each deleted file, keeps those that still exist, and removes the directory. A deleted file the base does not hold was created inside the run and is left out.

- `selected`: run the indicated tests together with `tests`. When the list is empty and the work has no indicated tests, no test runs: the closing report says that no test is related to the changes, and this is not an obstacle.
- `full`: the selection cannot be trusted, and `reason` says why (`no-binary`, `no-index`, `sync-failed`, `stale-index`, `unindexed-file`, `no-dependents` (here or at the base), or `deleted-file` (a deletion and no `--base`), each with the files it names in `files`, `base-index-failed` (the base could not be written or indexed), `codegraph-error`, `timeout` (the calls, or the base's export and index, ran out of time), or `invalid-output`). That run executes the full suite once, with the project's unit and integration command, and records the reason. The next run computes the selection again.

Append one line per run to `selection.md` in the run directory: the run (step, gate round, or verification), `selected N` or `full <reason>`, and the command line.

## Run

Build the exact command line from `command`, `scoping_idiom`, and the test files, and hand that line to whoever runs it (the budget executor, or `merge.js verify --command` in `/sai-merge`). Never hand over a generic goal such as "run the project's full test suite". Apply the idiom to the whole list; an idiom that takes one identifier per run becomes one command line per file. A run that can fail long writes its output to a log in the run's scratch folder.

## Classify a failing test

Classify lazily: only a test that fails is classified, in this order.

1. **Rerun at the current state.** Run each failing test once more. A test that passes is flaky: report it, and it never blocks.
2. **Run at the classification base.** Run `node <tool-path> swap --record <run directory>/swap.json --dirty-baseline <run directory>/baseline-dirty.txt <base option> --cwd <project root>` and record the swap path in the run's state when it keeps one. `swap` puts the base version of the run's files in the working tree, leaves the git index and the dirty git state alone, and prints `swapped`. The base option is the one the command card names: the change base (`--parent-branch <branch>`, or none for the default parent) for a run whose changes are committed, or `--base <sha>` for another base; `--paths-file <file>` (the JSON list of the repository paths the run changed, which requires `--base`) when the run's changes are not committed. Run the failing tests through the same kind of command line, then run `node <tool-path> restore --record <run directory>/swap.json` whatever the outcome, an interrupted or failed run of the tests included, and read its verdict before anything else happens.
3. **Verdict.** A test that also fails at the base is **pre-existing**: report it, and it never blocks. A test that passes there, does not exist there (the change added it), or cannot run there is **new**, and it enters the fix loop of its command.
4. **Failures of the check itself.** When `swap` answers `refused` or a tool error, the failures count as new. When `restore` answers `failed`, the run blocks: nothing is edited, staged, or committed while base files are in the working tree, and the command's obstacle rules say how to recover.

Record the dirty git state before the run starts (`git status --porcelain` to `baseline-dirty.txt` in the run directory), so `swap` never touches work outside the run. When that state overlaps a file the run changed, `swap` answers `refused` and the failures count as new.

## Obstacles

An ambiguous command and a runner that fails before running any test (missing dependencies, a broken environment, a runner error) are one obstacle, `test-command`, under `@sai/policies/obstacle-escalation.md`: a budget of 3 attempts, each a different approach, and then escalation. The approaches, each different: settle an ambiguous command by reading the project's build files and documentation for the one that runs the unit and integration tests; repair the environment with the project's documented setup command (installing dependencies) through the executor; run the narrowest documented command that runs the tests. A run that cannot run a test never closes as if it had run one. A project with no test suite is not an obstacle.

## Closing report

The closing report of each command lists every test run with its selection result (`selected N` or `full <reason>`), the flaky tests, the pre-existing failures, and the statement that the routine full-suite run belongs to CI.
