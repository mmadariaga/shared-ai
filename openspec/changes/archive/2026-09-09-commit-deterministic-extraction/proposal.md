> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The `/sai-commit` command's ~284 lines of prose ask the model to perform git inspection, repo-style detection, sensitive-file scanning, and format validation by interpretation. A skipped scan or check has no detector today, leaving runtime safety to the model's willingness to act. The command implements all the deterministic mechanics inline: staged-state inspection, repository style detection, message validation against pinned rules, and sensitive-file detection. Extracting these mechanics into an importable tool library lets both the commit workflow and future consumers call validated implementations directly instead of re-implementing them through prose interpretation.

## What Changes

The change refactors the commit workflow to split work by mutation boundary: read-only inspection and message drafting stay in the dispatched worker session, while git mutations move exclusively to the coordinator after authorization. The implementation creates two new command tools and exposes an existing library as importable:

- `sai/tools/commit.js` with two subcommands:
  - `collect`: inspects staged state (file inventory, insertions/deletions, inferred scope), detects repository commit style (Conventional Commits adoption rates, detected types/scopes, body style), detects sensitive files matching patterns, and reports all findings as JSON. Supports `--amend` mode to report the target commit's SHA, subject, and whether it has been pushed.
  - `apply`: reads a drafted commit message from stdin, validates it against commit rules, blocks on detected sensitive files (unless explicitly acknowledged by exact filename list), and executes `git commit`. Supports `--amend` mode to amend the previous commit's message without creating an additional commit.
  
- `sai/tools/lint.js` now exports `checkCommitRules(content)` as a library function for in-process use by `apply`, rather than being available only as a standalone CLI

The coordinator and worker instructions are updated to use these tools:
- The coordinator calls `apply` to execute the commit after authorization, passing the worker's message on stdin, with `--amend` when an amendment was requested
- The worker calls `collect` to gather staging state and style info (or amend target info under `--amend`), drafts a message using that data, and asks for authorization
- Sensitive-file detection is unified: both `collect` (which reports) and `apply` (which blocks) use the same detection implementation
- The override path for sensitive files is `--acknowledge-secrets` with a comma-separated exact file list; any mismatch refuses the commit
- Under `--amend`, an empty staging area is not an error; the message-only amend is legitimate. The already-pushed warning is preserved.

## Capabilities

### New Capabilities

- **commit-collect**: Call `node sai/tools/commit.js collect --json --cwd <repo>` to retrieve staged state (file inventory with insertions/deletions counts), inferred scope from common path prefix, detected repository commit style (match rate against Conventional Commits, detected types/scopes vocabulary, body-presence rate, recurring section headers), and sensitive-file detection results. Returns exit code 0 with JSON payload on success, exit code 1 with has_staged: false when no staged changes exist. Supports `--amend` mode to report the amend target's SHA, subject, and whether it has been pushed to a remote.

- **commit-apply**: Call `node sai/tools/commit.js apply --json --cwd <repo> --acknowledge-secrets <file-list>` (optional flags) with the drafted commit message on stdin. Validates the message against commit rules, blocks on detected sensitive files unless the exact list matches `--acknowledge-secrets`, and executes `git commit` with the validated message. Returns exit code 0 with success payload on successful commit, exit code 1 with validation violations or secret-file block, exit code 2 on I/O failure. Supports `--amend` mode to amend the previous commit's message without creating an additional commit.

- **commit-secret-acknowledgement**: Accept sensitive-file overrides through `--acknowledge-secrets` carrying an exact comma-separated list of file paths. The coordinator presents detected files to the user; on confirmation, re-invokes apply with the exact list. Any difference in file paths (missing or extra files) refuses the commit.

- **lint-library-surface**: Export `checkCommitRules(content)` function from `sai/tools/lint.js` for in-process reuse. The function takes a commit message string, returns an array of violation objects with `file`, `line`, `problem`, and `detail` fields, or an empty array on success. This eliminates the need for apply to shell out to the linter.

- **commit-command-prose**: Reduce the `/sai-commit` command cards (coordinator.md, worker.md, instructions.md) to routing, answer forwarding, and JSON handling. Move message composition, faithfulness auditing, and rule enforcement into the tools themselves.

### Modified Capabilities

- **commit (command)**: Refactored to use the new tools. Worker calls collect, drafts message, and never mutates git; coordinator calls apply after authorization to execute the commit. Authorization ask remains unchanged; the enforcement point moves from prose interpretation to tool-enforced validation. The `--amend` flag is now supported end-to-end via the tools.

## Impact

**New files:**
- `sai/tools/commit.js` — deterministic commit mechanics (561 lines)
- `test/commit-tool.test.js` — comprehensive tool tests (320+ lines)

**Modified files:**
- `sai/commands/commit/coordinator.md` — refactored for tool-based execution (67 lines changed, net +53)
- `sai/commands/commit/instructions.md` — worker steps simplified to call collect and draft (126 lines changed, net -40)
- `sai/commands/commit/worker.md` — updated lifecycle contract (34 lines changed, net -58)
- `sai/tools/lint.js` — exports checkCommitRules as library function (16 lines changed, net +8)

**Affected specs:**
- `openspec/specs/commit/spec.md` — "Repo-style detection sub-step in Step 1" requirement updated to use collect payload; "Faithfulness and stop conditions unchanged" requirement updated to document the --amend exception
- `openspec/specs/routed-commit-command/spec.md` — two requirements updated to reflect tool-based execution with --amend support

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
