# `/sai-archive`

## Command function

Checks that a change is ready and moves it from the active changes area to the archive of completed changes, keeping the active workspace clean.

## Flags and behavior modifiers

- `--fast-track`: skips the commit selector after the archive and creates the local commit directly. Other safety confirmations remain in place.
- `--push yes|no`: answers the push question in advance. Without it, the command asks once before the archive whether to push the branch, naming the branch and its destination (its upstream, or `origin/<branch>` when it has none). Any other value, or no value, ends the run before anything is written. `--fast-track` neither skips the question nor counts as the answer.
- `Direct Build - Unattended` route: allows an authorized run to prepare and complete the order of synchronization, archiving, staging changes, and creating a local commit.

## In detail

The command reviews the state of the change before moving it with one deterministic tool, `archive-plan.js`, that the command runs itself: no model turn computes the review. The tool checks which documents exist, whether another destination archive already has the same name, which capabilities the change retires, which main specs the archive touches, and which paths the commit owns. It only reads, and it prints the plan or a refusal with its reason. Proposal and specs are required (specs are satisfied by `skip_specs: true`), and design and tasks are too unless the change was backfilled; a missing required artifact blocks the archive. A missing review, security, performance, or accessibility report produces only an informational notice. An existing report with a `## Not Applicable` heading counts as present and produces no missing-report notice. It also reports any update that should be reflected in the general documentation.

Before syncing specifications, the coordinator independently checks scenario
preservation on both Claude Code and opencode. A MODIFIED requirement must keep
every existing scenario name, with no exceptions for approved removals or renames.
Intentional replacement uses REMOVED for the old requirement and ADDED for its
replacement under an explicitly chosen distinct name. Missing scenarios or an
incomplete comparison must be corrected before sync.

Once everything is authorized, the change is removed from the active changes area and moved to the archive with its documentation by `openspec archive`, which stays the only command that syncs and moves. On the normal route, the operation that moves the change belongs to the main run, and the commit control is then offered with three options: create a new commit (recommended), amend the latest commit, or do nothing. The commit stages exactly the paths the plan lists. A worker exists only to write the commit message from the staged changes; the retirement lines and the issue closing line come from the plan. Amending a pushed commit asks for a second confirmation.

With the answer `yes`, the command pushes the branch at the end, after the commit gate, only when the gate created a new commit or amended a `HEAD` that was not pushed yet: `git push` when the branch has an upstream, `git push -u origin <branch>` when it has none. The push sends every local commit of the branch, not only the archive commit, and the default branch is not refused: the question names the branch and the answer decides. The push never uses force and never creates or updates a pull request. It does not run after `Do nothing`, an empty index, or a gate skipped because nothing changed. It does not run after an amend of an already-pushed commit either, because that needs a force push, which the command leaves to you. It is not asked when there is no destination (a detached `HEAD`, or no upstream and no `origin` remote). A failed push does not undo the archive or the commit: the summary shows the error and the command to retry, and `Archive done.` still prints. The closing summary always states the push outcome: pushed, not requested, not applicable (with the reason), or failed.

In a `Direct Build - Unattended` run, the user has already explicitly authorized the complete process: prepare the required documentation, synchronize it, move the change to the archive, stage only the relevant files, and create one local commit. The run computes the same plan before any order, and the archive worker receives one order tied to that plan's fingerprint; if the plan changed meanwhile (for example, midnight passed and the destination date changed), the order is rebuilt from the new plan. An implementer deletion that is already staged is not added again and stays in the commit, and on the no-specs route the commit paths are the archived copies. Nothing is sent to a remote server: this route receives neither the push question nor `--push`.

The plan refuses, and nothing is written, when a required document is missing (`Missing CORE artifact(s): <ids>. Archive blocked.`), when the destination already exists, when a MODIFIED requirement drops an existing scenario, when `.openspec.yaml` cannot be read, or when a retirement is refused (`retire_capabilities: false`, a value that is not a boolean, a spec with a `##` section other than Purpose and Requirements, or missing metadata). A check the tool does not predict, such as a requirement without a scenario, fails in the CLI and is reported as it is, with no commit.

A change that declares `skip_specs: true` has no delta spec: the archive treats its specs as satisfied, reports that no delta syncs, and lists no capability.

A change whose delta removes every requirement of a capability retires that capability: the archive records the retirement, and the CLI deletes the spec. When the change keeps a verified originating issue, the archive commit includes it as a closing reference for the pull request. A lost or unverifiable origin only produces a warning. Azure Boards items are not supported.
