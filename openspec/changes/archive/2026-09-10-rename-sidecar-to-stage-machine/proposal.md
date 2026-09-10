> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The term "sidecar" was introduced for the per-session state subsystem before the HTTP service model stabilized. Commit 67b3fbc4 ("refactor(sai-state): replace sidecar with CLI"), two commits before this one, removed the HTTP server, the port, the token, the liveness model, and the tombstone, cutting the implementation from 576 lines to 340. Once the HTTP transport was removed, "sidecar" named nothing that exists in this repository — it describes a service that is gone.

Additionally, "sidecar" is overloaded across approximately 100 occurrences spanning three distinct unrelated meanings: (1) this state subsystem, (2) the agent-file ownership sidecar in `.owner.json` install records, and (3) generic companion-file patterns throughout the codebase. The term was never doing a single job. Renaming this subsystem to "stage machine" eliminates this vocabulary debt without touching the unrelated meanings, and accurately names what remains after HTTP removal: the per-session state owner that hosts registered machines and manages their transitions.

## What Changes

The vocabulary renaming affects instructions, records, and glossary entries that document the state subsystem serving `/sai-explore`. Specifically:

- **GLOSSARY.md**: Entry renamed from "State Machine Sidecar" to "Stage Machine"; definition updated to call it the stage machine platform instead of sidecar platform
- **AGENTS.md**: Section header renamed from "Explore sidecar" to "Explore stage machine"; body text updated with three occurrences: "explore stage-machine sidecar" → "explore stage machine", "sidecar CLI" → "stage machine CLI", and "without the sidecar" → "without the stage machine"
- **sai-state/machines/design-standalone.js**: Comments updated with four occurrences: "stateful sidecar machine" → "stateful stage machine", "sidecar owns" → "stage machine owns", "surviving sidecar session" → "surviving stage machine session", and "fresh sidecar session" → "fresh stage machine session"
- **sai-state/machines/explore-slice.js**: Comment updated: "persist in sidecar state" → "persist in stage machine state"
- **sai-state/machines/implement-standalone.js**: Comments updated with six occurrences: "stateful sidecar machine" → "stateful stage machine", "sidecar owns" → "stage machine owns", "surviving sidecar session" → "surviving stage machine session", "fresh sidecar" → "fresh stage machine", "sidecar-owned" → "stage-machine-owned", and "without the sidecar" → "without the stage machine"
- **sai-state/machines/spec-standalone.js**: Comments updated with four occurrences: "stateful sidecar machine" → "stateful stage machine", "sidecar owns" → "stage machine owns", "surviving sidecar session" → "surviving stage machine session", and "fresh sidecar" → "fresh stage machine"
- **sai/commands/explore/steps/common.md**: Three references updated: "sidecar-owned state rules" → "stage-machine-owned state rules", "Sidecar `next.hint`" → "Stage machine `next.hint`", and "not the sidecar" → "not the stage machine"
- **test/explore-pre-crystallization-stages.test.js**: Assertion updated: "sidecar-owned state rules" → "stage-machine-owned state rules"

The binary name `sai-state` and directory name `sai-state/` are preserved because they were never promised as temporary and are already accurate names. The persisted field name `sidecarVersion` is preserved because renaming a persisted field is a behavioural change outside the scope of vocabulary correction.

## Capabilities

### New Capabilities

- **session-state-lifecycle**: Introduces a replacement capability for the old `sidecar-session-lifecycle` with identical requirements and scenarios. The capability name now accurately reflects that the per-session service owns state machine registry and lifecycle transitions. The old capability is directly deleted from `openspec/specs/` because OpenSpec has no mechanism to express capability retirement through deltas — removing a capability's final requirement produces an invalid spec that the archive step rejects.

### Modified Capabilities

None (the prior capability `sidecar-session-lifecycle` is superseded by direct deletion combined with the introduction of its replacement, not by modification).

## Impact

**New files**:
- `openspec/changes/rename-sidecar-to-stage-machine/specs/session-state-lifecycle/spec.md`

**Modified files**:
- `AGENTS.md` (section rename and prose update)
- `GLOSSARY.md` (entry rename and definition updates)
- `sai-state/machines/design-standalone.js` (comments)
- `sai-state/machines/explore-slice.js` (comments)
- `sai-state/machines/implement-standalone.js` (comments)
- `sai-state/machines/spec-standalone.js` (comments)
- `sai/commands/explore/steps/common.md` (prose)
- `test/explore-pre-crystallization-stages.test.js` (prose)

**Archive impact**:
The ADDED delta creates `openspec/specs/session-state-lifecycle/spec.md` through the CLI sync. The old capability directory `openspec/specs/sidecar-session-lifecycle/` is deleted directly in the same commit as a file operation, because OpenSpec cannot express capability retirement through deltas — a REMOVED delta that empties a capability of all its requirements causes the rebuilt spec to fail validation during the archive step. No precedent for capability retirement exists in this repository's archive history, and this limitation is worth recording for future readers who encounter the same constraint.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
