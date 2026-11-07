> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The `Explore origin` label and the `explore-origin` lookup accepted only opencode `ses_` ids (`sai/tools/ready-to-propose.js`, `sai/tools/change-telemetry.js`), and crystallization appended nothing on Claude Code (`sai/commands/explore/steps/crystallization-protocol.md`). A change explored on Claude Code therefore had no `## Exploration` section in its `telemetry.md`. This change records the `/sai-explore` session that crystallized a change on Claude Code as an `Explore origin` entry, so `telemetry.md` gains its exploration section on Claude Code and one origin list may mix opencode and Claude Code sessions.

## What Changes

- `commands/claude/sai-explore.md` carries the line `Session id: ${CLAUDE_SESSION_ID}`, so the Claude Code explore session learns its own id through the documented substitution.
- `sai/commands/explore/steps/crystallization-protocol.md` appends the current session on both harnesses when `experimental.changeTelemetry` is `true` and `change-telemetry.js explore-origin` returns `found`: on opencode with the `sessionID` of a dispatched subagent, on Claude Code with the id of the `Session id:` line. A value that still reads `${CLAUDE_SESSION_ID}`, or is not a UUID, counts as absent: the call is skipped, nothing is appended, and one line says that the explore origin was not recorded. The label now reads `<harness> <sessionID>[, <harness> <sessionID>…]`, each entry naming its own harness.
- `sai/tools/ready-to-propose.js` parses `Explore origin` entries with a per-entry `opencode` or `claude` prefix; an entry without a prefix inherits the previous entry's, so the older `opencode ses_a, ses_b` form stays valid. An id whose shape does not match its harness (`ses_…` for opencode, a UUID for Claude Code), or a first entry without a prefix, fails with `INVALID_EXPLORE_ORIGIN`. The validator returns the bare ids.
- `sai/tools/openspec-yaml.js` exports `exploreOriginHarness`, which infers the harness of a bare `explore_origin` id from its shape, with the `OPENCODE_SESSION` and `CLAUDE_SESSION` patterns; `.openspec.yaml` keeps bare ids.
- `sai/tools/change-telemetry.js` records the exploration on both harnesses: each origin id is read with the reader of its own harness, whichever harness runs the collection, and an id whose harness data is absent on the machine (or of no known harness) is recorded as `unavailable`. `explore-origin --harness claude --session <uuid>` prints `found` with the given session when it is a root session of the project's Claude Code transcripts holding a `/sai-explore` invocation, and `skipped` otherwise; a `--session` that is not a UUID is a usage error. The opencode lookup and its output are unchanged.
- `sai/policies/change-telemetry.md`, `sai/policies/ready-to-propose-format.md`, `docs/project-settings.md`, and `openspec/schemas/sai-workflow/templates/telemetry.md` describe the per-entry harness prefix, the Claude Code origin, mixed-harness reading, and the fields unavailable on Claude Code (cost, reasoning, variant).
- Tests cover the Claude Code `explore-origin` lookup and its usage error, a Claude Code origin recorded and a missing one marked unavailable, an opencode origin marked unavailable when `opencode.db` is absent, and the mixed-harness label with prefix inheritance.

Known limitations and trade-offs accepted: an origin entry from the other harness is shown as `unavailable` when that harness's data is absent on the machine that collects; the exploration of a Claude Code session shows no cost, reasoning, or variant. Existing blocks, issues, and `.openspec.yaml` files with the `opencode ses_…` form stay valid, and the opencode `explore-origin` lookup and its output stay unchanged. The functional fix loop of the implementation converged on its first full pass with no findings.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `change-telemetry`: the exploration section is recorded on both harnesses, each origin id read with its own harness reader; `explore-origin` resolves Claude Code sessions; the documentation describes both harnesses.
- `shared-crystallization-block-format`: `**Explore origin**` entries carry a per-entry harness prefix, and crystallization on Claude Code appends its own session from the wrapper's `Session id:` line.
- `ready-to-propose-detection`: the strict profile validates per-entry harness prefixes with inheritance and returns bare ids.
- `explore-origin-metadata`: the metadata reader module infers the harness of a bare `explore_origin` id from its shape.

## Impact

Modified files:

- `commands/claude/sai-explore.md`
- `docs/project-settings.md`
- `openspec/schemas/sai-workflow/templates/telemetry.md`
- `sai/commands/explore/steps/crystallization-protocol.md`
- `sai/policies/change-telemetry.md`
- `sai/policies/ready-to-propose-format.md`
- `sai/tools/change-telemetry.js`
- `sai/tools/openspec-yaml.js`
- `sai/tools/ready-to-propose.js`
- `test/change-telemetry-contract.test.js`
- `test/change-telemetry.test.js`
- `test/ready-to-propose-detector.test.js`

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
