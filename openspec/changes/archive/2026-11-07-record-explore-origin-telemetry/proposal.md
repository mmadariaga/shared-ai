> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

A slice can be planned or built in another session days later, especially when it returns from the backlog, so the collector of the route session cannot reach the original exploration. The published issue body is the literal Ready to Propose block (`sai/tools/backlog-set-github.js:26`), so a block label is the carrier that survives the round trip. This change records the exploration that produced a change in its `telemetry.md`, by carrying every originating opencode explore session as a visible `Explore origin` label of the block and as `explore_origin` in `.openspec.yaml`.

## What Changes

- `sai/tools/ready-to-propose.js` registers `Explore origin` as an optional strict label after `Backlog origin`, validates the value `opencode <sessionID>[, <sessionID>…]` (`INVALID_EXPLORE_ORIGIN` otherwise), returns it per block as `explore_origin`, and makes `attach-origin` insert a published `Backlog origin` before an existing `Explore origin` line.
- `sai/policies/ready-to-propose-format.md` documents the field, its position, its format, and its path into `.openspec.yaml` and `telemetry.md`.
- `sai/commands/explore/steps/crystallization-protocol.md` composes the list: it copies an imported block's list in order and appends the current explore session only on opencode with `experimental.changeTelemetry` set to `true` and an unambiguous `explore-origin` result; `crystallization-language-gates.md` keeps the label and value English.
- `sai/commands/spec/worker.md`, `sai/commands/backfill/instructions.md`, `sai/commands/backfill/coordinator.md`, and `sai/commands/explore/direct-build-coordinator.md` persist and accept `explore_origin` as a flat flow list in `.openspec.yaml`; `sai/tools/openspec-yaml.js` reads it as an ordered list.
- `sai/tools/change-telemetry.js` gains the `explore-origin` sub-command, which resolves the explore root session of a subagent session through `opencodeRoot`, and writes an `## Exploration` section once per change from `explore_origin`: one segment per distinct origin session, made of its `explore` invocation windows minus its route windows (and, in the route's own session, only up to the route's first worker), with a `Shared:` line naming sibling changes and an `unavailable` record for a session missing from `opencode.db`.
- `sai/policies/change-telemetry.md`, `sai/policies/tool-resolution.md`, `docs/project-settings.md`, and `openspec/schemas/sai-workflow/templates/telemetry.md` document the exploration section and the new sub-command.
- Tests cover the strict label, the attach-origin order, the metadata reader, the exploration section, and the `explore-origin` usage errors.

Known limitations and trade-offs accepted: every listed opencode `sessionID` is visible in published issues; on another machine an origin exploration is recorded as `unavailable`; summing several `telemetry.md` files counts a shared exploration more than once, which the shared marker states; the label value is a list, so its format needs validation. Claude Code telemetry is out of scope, and the issue format, `convert`, and `to-backlog` stay unchanged. The fix loop of the implementation reported no findings (High=0 Medium=0 Low=0).

## Capabilities

### New Capabilities

- `explore-origin-metadata`: persistence of the block's `Explore origin` as `explore_origin` in `.openspec.yaml` by spec, backfill, and Direct Build, and its metadata reader.

### Modified Capabilities

- `change-telemetry`: the once-per-change `## Exploration` section with one segment per origin session, shared and unavailable segments, and the `explore-origin` sub-command.
- `shared-crystallization-block-format`: the optional `**Explore origin**` field and its inherit-and-append rule on crystallization.
- `ready-to-propose-detection`: strict validation of the `Explore origin` label and the returned `explore_origin` list.
- `explore-crystallization-language-gate`: the `**Explore origin**` label and value stay English scaffolding.
- `issue-origin-preservation`: `attach-origin` inserts `Backlog origin` before an existing `Explore origin` line.
- `sai-backfill-metadata-flag`: the Direct Build canonical metadata forms accept the optional `explore_origin` key.

## Impact

Modified files:

- `docs/project-settings.md`
- `openspec/schemas/sai-workflow/templates/telemetry.md`
- `sai/commands/backfill/coordinator.md`
- `sai/commands/backfill/instructions.md`
- `sai/commands/explore/direct-build-coordinator.md`
- `sai/commands/explore/steps/crystallization-language-gates.md`
- `sai/commands/explore/steps/crystallization-protocol.md`
- `sai/commands/spec/worker.md`
- `sai/policies/change-telemetry.md`
- `sai/policies/ready-to-propose-format.md`
- `sai/policies/tool-resolution.md`
- `sai/tools/change-telemetry.js`
- `sai/tools/openspec-yaml.js`
- `sai/tools/ready-to-propose.js`
- `test/change-telemetry-contract.test.js`
- `test/change-telemetry.test.js`
- `test/ready-to-propose-detector.test.js`
- `test/status-tool.test.js`

No new files.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

The issue's dependencies `record-explore-plan-route-telemetry` and `record-explore-direct-build-telemetry` are already archived (`openspec/changes/archive/2026-11-06-record-explore-plan-route-telemetry/`, `openspec/changes/archive/2026-11-06-record-explore-direct-build-telemetry/`), so this block lists no dependency. The issue's research lead `test/to-backlog-issue-format.test.js:77` pointed at backlog-id-counter regexes, not issue-format constants, and is dropped together with the issue-format work.
