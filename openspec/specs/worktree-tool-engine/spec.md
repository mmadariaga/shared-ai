# worktree-tool-engine Specification

## Purpose
TBD - created by archiving change project-sai-tools-and-extract-worktree. Update Purpose after archive.
## Requirements
### Requirement: The whole state machine runs through the worktree tool

The `/sai-worktree` command SHALL make every deterministic decision of its state machine — repository resolution, porcelain parsing, the free-slot search, branch derivation, refname validation, the dirty-worktree check, and the unmerged-commits check — by invoking `sai/tools/worktree.js`, and the consuming instruction SHALL NOT reproduce, second-guess, repair, or re-derive those decisions in prose.

#### Scenario: The consumer presents rather than re-derives
- **WHEN** the command needs the inventory, a creation, an indexing pass, a removal, or a branch deletion
- **THEN** it calls the tool for that action and renders the returned payload, running no git command of its own

#### Scenario: A refusal is not worked around
- **WHEN** the tool refuses an action
- **THEN** the command surfaces the refusal and returns to the selector instead of retrying the same call or re-deriving the check itself

### Requirement: Closed sub-command surface with a stable invocation form

The worktree tool SHALL expose exactly the sub-commands `inventory`, `create [name]`, `index <path>`, `remove <path>`, and `delete-branch <branch>`, and every invocation SHALL take the form `node <tool-path> <sub-command> [arguments] --json --cwd <invoking-directory>`, so a single permission whitelist entry per root covers the whole command.

#### Scenario: Inventory reports state and the next free slot
- **WHEN** `inventory` runs
- **THEN** it prunes stale bookkeeping and reports every registered worktree with its `name`, `path`, `branch`, `detached`, `isMain`, `isCurrent`, and `deletable` fields, plus `proposedName`, `proposedBranch`, and `proposedPath`

#### Scenario: Create accepts the proposal or a custom name
- **WHEN** `create` runs with no positional argument
- **THEN** it uses the reported free slot, and a single positional argument replaces that proposal

#### Scenario: Force is a separate opt-in
- **WHEN** `remove` or `delete-branch` is invoked
- **THEN** `--force` is passed only where the instruction names it and only after the user's explicit confirmation

### Requirement: The indexing pass is its own sub-command so the announcement can precede it

The `create` sub-command SHALL NOT run the CodeGraph pass itself: it SHALL return an `indexAnnouncement` string in its success payload, and `index <path>` SHALL be the only sub-command that runs the pass and the only one that returns an `indexing` object. The consuming instruction SHALL print `indexAnnouncement` verbatim first, then call `index <path>` with the created path, then print the returned `indexing.message`, so the announcement precedes the pass while each call's stdout remains a single parseable JSON payload.

#### Scenario: Create announces without indexing
- **WHEN** `create` succeeds
- **THEN** its payload carries `indexAnnouncement` and no `indexing` object, and `codegraph init` has not been invoked

#### Scenario: Index is the only sub-command that runs the pass
- **WHEN** `inventory`, `remove`, or `delete-branch` runs
- **THEN** no `indexing` object is returned and `codegraph init` is never invoked

#### Scenario: The announcement precedes the pass
- **WHEN** the Create action reaches the indexing step
- **THEN** the `indexAnnouncement` line is printed before `index <path>` is called, and the returned `indexing.message` is printed after it as the single result line

### Requirement: Closed exit-code and JSON output contract

The worktree tool SHALL signal its outcome through closed exit codes: `0` when the action succeeded, with a JSON payload on stdout describing it; `1` when the tool refused, with nothing mutated and a payload carrying `reason` and `message`; and `2` for a usage error or a git/IO failure reported on stderr.

#### Scenario: A refusal mutates nothing
- **WHEN** the tool exits 1
- **THEN** no worktree, branch, or checkout was changed by the refusing step, and the payload names the `reason` and a human-readable `message`

#### Scenario: An unknown sub-command is a usage error
- **WHEN** the tool is invoked with a sub-command it does not define
- **THEN** it writes the error and the usage text to stderr and exits 2, not 1

#### Scenario: An unrecognized flag is a usage error
- **WHEN** the tool is invoked with a flag it does not define
- **THEN** it reports the unknown flag on stderr with the usage text and exits 2

### Requirement: Tool output is forwarded verbatim

The consuming instruction SHALL surface a tool `message` and a stderr report verbatim: it SHALL NOT rephrase a message, fill in missing fields, or repair malformed JSON, and when a payload cannot be parsed it SHALL say so and return to the selector.

#### Scenario: An unparsable payload
- **WHEN** the tool's stdout cannot be parsed as JSON
- **THEN** the command reports that fact and returns to the selector instead of guessing the payload's contents

### Requirement: Tool path resolves through verbatim root candidates

The consuming instruction SHALL locate the tool by taking the first existing candidate from an ordered list of verbatim path literals, project-local before user-global, and SHALL NOT compose an absolute path by joining a root string to a suffix. On Claude Code the candidates SHALL be `.claude/sai/tools/worktree.js` then `~/.claude/sai/tools/worktree.js`; on opencode they SHALL be `.opencode/sai/tools/worktree.js` then `~/.config/opencode/sai/tools/worktree.js`, and only when neither exists MAY the instruction run `opencode debug paths` and append the fixed suffix `sai/tools/worktree.js` to the config directory exactly as that command prints it.

#### Scenario: The project-local copy wins
- **WHEN** both a project-local and a user-global copy exist
- **THEN** the project-local candidate is used, so the tool is the copy under the root that served the calling instruction

#### Scenario: No candidate exists
- **WHEN** none of the candidates exists
- **THEN** the command names the candidates it tried and stops, falling back neither to prose nor to running git commands itself

