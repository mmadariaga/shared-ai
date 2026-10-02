> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Medium and small models ended the `/sai-explore` crystallization turn right after printing the `Ready to Propose` block, before the inventory was recorded and before the route picker appeared. Seven prose-only fixes failed. In the old close, four mechanical actions came after the long block text: the final `---` started the close, then the panel, the hand-composed `recordedList` emit, and the picker. The close now composes the blocks inside a deterministic tool call that validates them and records the inventory before anything is displayed. After that call, only a transcription of the blocks and one picker call remain.

## What Changes

- `bin/sai-state.js` gains `emit <id> explore-slice@1 --ready-to-propose -`. It reads the complete block set from stdin and validates it with the strict profile of `sai/tools/ready-to-propose.js` before any session, machine, or registry read. On a valid verdict it derives `{"recordedList": [...]}` from the extracted change names in display order and advances the machine. It always returns a `validation` object and keeps change names off the wire. An invalid verdict exits 1 and records nothing. Empty, heading-less, or cut-off stdin returns `INVALID_EVENT` with `reason: "EVENT_UNPARSEABLE"`. These cases are usage errors (exit 2): use on another machine, combination with `--progress` or `--with-overview`, a missing marker, and a missing detector module.
- `sai/commands/explore/steps/crystallization-protocol.md` replaces the shared close with five ordered steps: stage panel, block emit, load the returned `next.follow`, print the blocks exactly as sent, then act on the loaded file (the picker, or the active slice's route). It removes the "final `---` starts the close" rule and the three ordered conditions. A panel error of any kind is reported and the close continues. A validation failure gets up to two silent retries and then shows the violations with no block and no picker. A delivery failure keeps the separate corrective-retry counter. Items 5 and 6 now compose the blocks, and the close validates, records, and prints them. The inline-refusal path prints its blocks without the block emit and records no inventory.
- `sai/commands/explore/steps/route-selector.md` opens with the instruction that the native picker is the one remaining action after the printed blocks, and states that the inventory is recorded before any block is displayed.
- `sai/commands/explore/instructions.md`, `steps/common.md`, and `steps/slice.md` describe the new order and forbid hand-composed `recordedList` at the close.
- `sai/policies/stage-machine.md` documents the block emit verb and the block-emit delivery exception: a quoted heredoc in Bash and a single-quoted here-string in PowerShell, on Claude Code and opencode.
- `sai/policies/ready-to-propose-format.md` drops the post-block close cue.
- Tests: new `test/sai-state-ready-to-propose-emit.test.js`; one strict whole-set failure test in `test/ready-to-propose-detector.test.js`; the close's structural tests in `test/explore-pipeline-selector.test.js` are updated.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `crystallization-close`: the close records the inventory through a validated block emit before printing the blocks. Panel errors no longer stop the close. Validation and delivery failures have bounded retries and stop with no blocks and no picker.
- `explore-crystallization-block`: the shared close's order is panel, block emit, pointer load, print, picker.
- `explore-slice-machine`: the slice inventory is derived from the validated blocks, never composed by hand.
- `stage-machine-cli-interface`: adds the `--ready-to-propose` block emit.
- `stage-machine-emit-delivery`: the block emit is a documented literal-text delivery exception.
- `explore-crystallization-handoff`: retired, because the post-block cue it required is removed.

## Impact

- New files: `test/sai-state-ready-to-propose-emit.test.js`
- Modified files: `bin/sai-state.js`, `sai/commands/explore/instructions.md`, `sai/commands/explore/steps/common.md`, `sai/commands/explore/steps/crystallization-protocol.md`, `sai/commands/explore/steps/route-selector.md`, `sai/commands/explore/steps/slice.md`, `sai/policies/ready-to-propose-format.md`, `sai/policies/stage-machine.md`, `test/explore-pipeline-selector.test.js`, `test/ready-to-propose-detector.test.js`
- Known limitations: about 800 extra output tokens per block for the stdin copy. A large multi-block heredoc is more fragile to deliver; the failure is visible as `EVENT_UNPARSEABLE` and covered by the corrective retry. If the agent stops between the emit and the print, the machine is in `waiting` with a set the user has not seen, and no route can start without a picker answer.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Discussed and excluded: the stop that happens after `route-selector.md` loads and prose is printed without a picker call (out of scope); the invented session key and stale `explore-slice@1` state seen in the same transcript (out of scope); deterministic resumption (deferred until measurement). The final step after the print is the picker; the instruction that says so must arrive short and at the top of whatever `next.follow` loads, not buried in the 3,100-word `route-selector.md`.
