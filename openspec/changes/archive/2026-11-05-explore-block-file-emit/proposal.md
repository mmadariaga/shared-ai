> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The opencode shell scanner rejected a large `Ready to Propose` block piped through a PowerShell here-string three times in a row. The `--block-file` / `--verdicts-file` form already existed in both CLIs (`bin/sai-state.js` and `sai/tools/ready-to-propose.js`), but the instructions still prescribed the heredoc / here-string stdin delivery for block registration and the stdin delivery for `ready-to-propose.js check`. Every block-sized delivery is now a file, so no block content passes through a shell command.

## What Changes

- `sai/policies/ready-to-propose-format.md` § Block and verdict delivery now prescribes one ordered file procedure for registration, amendment, and every `check` call, on Claude Code and opencode: open a private directory with `transfer.js open`, write `blocks.md` with the harness-native file-write tool, run `check --profile dispatchable --block-file`, write `verdicts.json` (`[]` when no line is flagged), emit with `--block-file` / `--verdicts-file`, and close the directory with `transfer.js close`. `transfer.js put` is not used, because it reads stdin. A directory that cannot be opened or a file that cannot be written stops the emit or check; there is no stdin fallback. The header comment names the `--block-file` validator form.
- `sai/policies/stage-machine.md`: the block emit and block amend verbs are documented only in the `--block-file <path> --verdicts-file <path>` form; § Event delivery drops the heredoc / here-string example and its `SAI_BLOCKS` marker, states that a non-block event keeps the single-quoted JSON on stdin, and names `BLOCK_COMPOSITION_FAILED` as the block delivery failure. § Corrective retry now also covers `reason: "BLOCK_COMPOSITION_FAILED"`.
- `sai/commands/explore/steps/crystallization-protocol.md` step 2 writes the block set to a block file, runs the dispatchable `check` on it, writes the verdicts file, and emits in the file form. The hygiene, violation, and validation branches read the `check` output, and the delivery-failure branch keys on `BLOCK_COMPOSITION_FAILED` and stops at once when the transfer directory or a file cannot be prepared.
- `sai/policies/block-hygiene-judgment.md`, the `ready-to-propose.js` entry of `sai/policies/tool-resolution.md`, and the crystallized-block detection of `sai/commands/backfill/instructions.md` prescribe `check --block-file <path>`, adding `--verdicts-file <path>` when verdicts exist.
- `sai/commands/explore/instructions.md` rule 1 and the read-only reminder of `sai/commands/explore/steps/common.md` name the block and verdicts files as the one direct write of `/sai-explore`, made into the transfer directory under the SAI temp root and never into the repository.
- `sai/install-manifest.json`: the `explore-command` capability profile gains `"write": true`.
- `sai/commands/explore/steps/issue-intake.md` § Conversion describes the `ready-to-propose.js convert` stdin delivery itself (quoted heredoc in Bash, single-quoted here-string in PowerShell 7) instead of citing `stage-machine.md` § Event delivery.
- Tests: `test/explore-pipeline-selector.test.js` asserts the file form and the absence of the heredoc / here-string delivery; `test/explore-pipeline-selector.test.js` and `test/design-coordinator-worker.test.js` assert that the `sai-explore` command grants `Write` while repository files stay read-only by contract.

The `sai-state` and `ready-to-propose.js` CLIs are not changed by this diff.

## Capabilities

### New Capabilities

- `block-file-delivery`: block-sized inputs reach `sai-state emit --ready-to-propose` and `ready-to-propose.js check` as files in a private transfer directory, written with the harness-native file-write tool, while non-block events and `convert` input keep stdin.

### Modified Capabilities

- `stage-machine-emit-delivery`: the documented block emit form, the block delivery-failure reason, and the corrective-retry trigger change to the file form.
- `crystallization-close`: the close emits through the file form, validates with `check --block-file`, and treats `BLOCK_COMPOSITION_FAILED` as its delivery failure.
- `validated-block-recording`: the hygiene-judgment resend carries the verdicts in a verdicts file.
- `backfill-unattended-intake`: crystallized-block detection runs `check --profile loose` on a block file.
- `explore-read-only-discipline`: the read-only reminder names the outside-repository block and verdicts files.
- `explore-instruction-delivery`: the explore write prohibition names the block and verdicts file write into the transfer directory as its one direct write.
- `per-command-tool-scoping`: the read-only `sai-explore` allowed-tools requirement is replaced by one whose projected allowed-tools carry the native file-write tools for the transfer-directory block write; repository files stay read-only by contract.
- `ready-to-propose-detection`: `sai/policies/tool-resolution.md` documents `check` in the `--block-file` form.

## Impact

- Modified files: `sai/policies/ready-to-propose-format.md`, `sai/policies/stage-machine.md`, `sai/policies/block-hygiene-judgment.md`, `sai/policies/tool-resolution.md`, `sai/commands/explore/instructions.md`, `sai/commands/explore/steps/common.md`, `sai/commands/explore/steps/crystallization-protocol.md`, `sai/commands/explore/steps/issue-intake.md`, `sai/commands/backfill/instructions.md`, `sai/install-manifest.json`, `test/explore-pipeline-selector.test.js`, `test/design-coordinator-worker.test.js`.
- New files: none.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Undecided: whether opencode requires a separate permission to write outside the project directory; this affects I12. Future scope, outside this change: `ready-to-propose.js convert` may gain a file input if its stdin delivery meets the same scanner rejection.
