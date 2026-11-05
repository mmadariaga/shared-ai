# `/sai-archive`

## Command function

Checks that a change is ready and moves it from the active changes area to the archive of completed changes, keeping the active workspace clean.

## Flags and behavior modifiers

- `--fast-track`: skips the commit selector after the archive and creates the local commit directly. Other safety confirmations remain in place.
- `Direct Build - Unattended` route: allows an authorized run to prepare and complete the order of synchronization, archiving, staging changes, and creating a local commit.

## In detail

The command reviews the state of the change before moving it. It checks which documents exist and whether another destination archive already has the same name. Proposal and specs are required (specs are satisfied by `skip_specs: true`), and design and tasks are too unless the change was backfilled; a missing required artifact blocks the archive. A missing review, security, performance, or accessibility report produces only an informational notice. An existing report with a `## Not Applicable` heading counts as present and produces no missing-report notice. It also reports any update that should be reflected in the general documentation.

Before syncing specifications, the coordinator independently checks scenario
preservation on both Claude Code and opencode. A MODIFIED requirement must keep
every existing scenario name, with no exceptions for approved removals or renames.
Intentional replacement uses REMOVED for the old requirement and ADDED for its
replacement under an explicitly chosen distinct name. Missing scenarios or an
incomplete comparison must be corrected before sync.

Once everything is authorized, the change is removed from the active changes area and moved to the archive with its documentation. On the normal route, the operation that moves the change belongs to the main run, and the commit control is then offered with three options: create a new commit (recommended), amend the latest commit, or do nothing. Amending a pushed commit asks for a second confirmation.

In a `Direct Build - Unattended` run, the user has already explicitly authorized the complete process: prepare the required documentation, synchronize it, move the change to the archive, stage only the relevant files, and create one local commit. Nothing is sent to a remote server.

A change that declares `skip_specs: true` has no delta spec: the archive treats its specs as satisfied, reports that no delta syncs, and lists no capability.

A change whose delta removes every requirement of a capability retires that capability: the archive records the retirement, and the CLI deletes the spec. When the change keeps a verified originating issue, the archive commit includes it as a closing reference for the pull request. A lost or unverifiable origin only produces a warning. Azure Boards items are not supported.
