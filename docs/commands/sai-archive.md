# `/sai-archive`

## Command function

Checks that a change is ready and moves it from the active changes area to the archive of completed changes, keeping the active workspace clean.

## Flags and behavior modifiers

- `--fast-track`: skips the commit selector after the archive and creates the local commit directly. Other safety confirmations remain in place.
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

In a `Direct Build - Unattended` run, the user has already explicitly authorized the complete process: prepare the required documentation, synchronize it, move the change to the archive, stage only the relevant files, and create one local commit. The run computes the same plan before any order, and the archive worker receives one order tied to that plan's fingerprint; if the plan changed meanwhile (for example, midnight passed and the destination date changed), the order is rebuilt from the new plan. An implementer deletion that is already staged is not added again and stays in the commit, and on the no-specs route the commit paths are the archived copies. Nothing is sent to a remote server.

The plan refuses, and nothing is written, when a required document is missing (`Missing CORE artifact(s): <ids>. Archive blocked.`), when the destination already exists, when a MODIFIED requirement drops an existing scenario, when `.openspec.yaml` cannot be read, or when a retirement is refused (`retire_capabilities: false`, a value that is not a boolean, a spec with a `##` section other than Purpose and Requirements, or missing metadata). A check the tool does not predict, such as a requirement without a scenario, fails in the CLI and is reported as it is, with no commit.

A change that declares `skip_specs: true` has no delta spec: the archive treats its specs as satisfied, reports that no delta syncs, and lists no capability.

A change whose delta removes every requirement of a capability retires that capability: the archive records the retirement, and the CLI deletes the spec. When the change keeps a verified originating issue, the archive commit includes it as a closing reference for the pull request. A lost or unverifiable origin only produces a warning. Azure Boards items are not supported.
