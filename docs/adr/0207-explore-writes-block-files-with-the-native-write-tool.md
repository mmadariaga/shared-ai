# ADR 0207: Explore writes `Ready to Propose` block files with the native write tool into a private transfer directory

## Status

Accepted.

## Context

`/sai-explore` registered and amended a `Ready to Propose` block set by sending it on stdin through a quoted heredoc (Bash) or a single-quoted here-string (PowerShell) to `sai-state emit <id> explore-slice@1 --ready-to-propose -`. The opencode shell scanner rejected a large block piped through a PowerShell here-string three times. The `--block-file` and `--verdicts-file` form already existed in both CLIs (`bin/sai-state.js`, `sai/tools/ready-to-propose.js`) but was the prescribed path only for registrations with verdicts and for stored-block amendments. `ready-to-propose.js check` calls and the backfill block detection also piped block-sized text on stdin.

`transfer.js put` writes the content it reads on stdin, so using it to prepare the files would bring the large block back into a shell command.

## Decision

1. **The file form is the only block delivery in the instructions, on both Claude Code and opencode.** Registration (`sai-state emit <id> explore-slice@1 --ready-to-propose`), amendment (`--amend <change-name>`), and every prescribed `ready-to-propose.js check` call pass the block with `--block-file <path>` and its verdicts with `--verdicts-file <path>`. A registration with no flagged line still passes a verdicts file containing `[]`. The heredoc and here-string delivery and its `SAI_BLOCKS` example are removed from `sai/policies/stage-machine.md`; the single-quoted JSON stdin delivery of non-block events and the stdin input of `ready-to-propose.js convert` are unchanged. Both CLIs keep accepting stdin.
2. **The session writes the files with the harness-native file-write tool** (`Write` on Claude Code, `write` on opencode) into a directory opened with `transfer.js open --harness <claude|opencode>`, under the SAI temp root, and closes it with `transfer.js close` once the registration or amendment is recorded. No block content passes through a shell command. The order is: open the directory, write `blocks.md`, run `check --profile dispatchable --block-file` to read violations and flagged lines, judge them, write `verdicts.json`, run `sai-state emit` with both files. The file-form emit composes the verdicts first and rejects a non-dispatchable block with `BLOCK_COMPOSITION_FAILED` and no per-line detail, so `check` is what reports the lines.
3. **File preparation failure stops the emit or check and reports the error.** The instructions offer no stdin fallback. A `BLOCK_COMPOSITION_FAILED` result joins the corrective-retry rule of `stage-machine.md` for delivery failures.
4. **The `explore-command` profile gained `write: true`** in `sai/install-manifest.json`, which projects `Write` and `Edit` on Claude Code and `edit` on opencode. The grant cannot be limited to a path: the restriction to the transfer directory is a contract rule in `sai/commands/explore/instructions.md` and `steps/common.md`, and repository files stay read-only for `/sai-explore` by that contract alone. opencode needed no new permission, because `bin/capabilities.js` already grants `external_directory` for the SAI temp root.
5. **Instructions follow the new form:** `crystallization-protocol.md` (block emit), `block-hygiene-judgment.md`, the `ready-to-propose.js` entry of `tool-resolution.md`, `ready-to-propose-format.md` § Block and verdict delivery, and `backfill/instructions.md` (block detection with `check --profile loose --block-file`). `issue-intake.md` describes the `convert` stdin delivery itself.

## Alternatives Considered

- **File form only on opencode** — rejected: keeps two delivery forms to maintain and test.
- **Stdin first, then a file retry after a rejection** — rejected: spends turns, which the change aims to avoid.
- **`transfer.js put` fed by a heredoc** — rejected: keeps the large block inside a shell command, the failure this change removes.
- **Also move `ready-to-propose.js convert` to a file input** — rejected for this change: it reads a whole issue, has no file input, and would need new CLI code and tests.

## Consequences

- The `explore-command` profile holds a write grant (`Write` and `Edit`) although `/sai-explore` writes no repository file; the transfer-directory scope exists in instructions only, not in the permission.
- A flagged or invalid block now costs one `check` call before the emit, because the file-form emit reports no per-line validation.
- `ready-to-propose.js dependencies` still reads the complete set on stdin, and `convert` still reads the issue text on stdin; both can meet the same scanner rejection and have no file input yet.
- Published specs under `openspec/specs/` that name the stdin block emit stay unedited until backfill and archive sync them.

## Provenance

Change `explore-block-file-emit`, decision "Write the block and verdict files with the harness-native file-write tool into a `transfer.js open` directory".
