> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

`sai-2-design` opened with an interactive specs approval question asking the user to confirm they had reviewed `specs/**` and were ready to approve them for design. Nothing in the system can verify that claim, so the question re-confirmed something already established upstream: `sai-1-spec` closes with a feedback loop over `proposal.md` and `specs/**` and a mandatory stop instructing the user to review them before invoking `sai-2-design`. Invoking the command is therefore itself the approval. The question was removed and replaced by an automatic stamp of `approval.specs.*` into `.openspec.yaml`, while the existence precondition for `proposal.md` and `specs/**` was left untouched.

The stamp is kept rather than deleted because `approval.specs.approved_at` is the only durable record of the spec→design transition and drives `sai-status`'s three-state Specs cell and its `Next:` hint.

## What Changes

- `sai/commands/design/instructions.md` — the `## Approval gate` section keeps its existence check and STOP literal verbatim; the fast-track skip line, the approval question, its `@sai/policies/question-context.md` anatomy paragraph, the decline path, and the "do not modify any other file if the user declines" line are removed. In their place the gate declares that invoking `/sai-2-design` is the approval, that no question is asked and no interactive decline path exists, and that the approval is stamped automatically into `openspec/changes/$ARGUMENTS/.openspec.yaml` with merge semantics.
- `approval.specs.approved_at` is written only when the key is absent or its value is empty, so re-invoking `/sai-2-design` on an already designed change preserves the original timestamp.
- `approval.specs.notes` is written unconditionally as the empty string, keeping the block shape stable for any reader.
- A failed `.openspec.yaml` write is a blocking STOP naming the file and the error; generation never continues with the stamp unwritten.
- `sai/commands/design/worker.md` — the worker lifecycle sentence "Unless fast-track is active, ask for spec approval" becomes an automatic, never-ask stamp with the same skip-if-present and empty-notes semantics; the startup-act progress description drops "either completing or fast-track-skipping the specs approval gate" in favour of "stamping the specs approval".
- `openspec/specs/sai-2-design-approval-gate/spec.md` — the leaked `## MODIFIED Requirements` delta header is corrected to `## Requirements`; the approve-with-notes and decline scenarios are replaced by stamped-before-generation and no-interactive-gate scenarios; a requirement is added that the spec-divergence amendment gate stays interactive and merges `approval.specs.amendment.{at, notes}` over the stamp.
- `openspec/specs/specs-approval-gate/spec.md` — gains "invoking sai-2-design is the specs approval"; the recording requirement now covers merge semantics, skip-if-present, always-empty notes, and the blocking write failure; the former "sai-2-design verifies specs approval before proceeding" requirement (and its "Specs not yet approved" halt message, which no longer exists) is replaced by an existence-precondition requirement carrying the retained STOP literal.
- `AGENTS.md` — the Specs approval gate paragraph is rewritten: `sai-1-spec` hands off for review, and `/sai-2-design` asks nothing and stamps the approval itself.
- `sai/commands/design/coordinator.md` is not touched. `--fast-track` parsing, its preflight ordering, and its banner are untouched; the flag simply no longer has an approval question to skip.

## Capabilities

### New Capabilities

None. Every capability touched by this change already existed.

### Modified Capabilities

- `specs-approval-gate` — the gate becomes an automatic stamp; the question and the decline path are removed, and the recording contract gains skip-if-present, always-empty notes, and a blocking write failure.
- `sai-2-design-approval-gate` — rewritten to the auto-stamp contract, with the amendment gate pinned as the one interactive survivor.
- `design-behavioral-parity` — the "user declines specs approval" behavior no longer exists on either path.
- `design-planning-worker` — the worker stamps the approval instead of asking for it.
- `sai-fast-track-flag` — `sai-2-design --fast-track` no longer has a specs approval question to auto-approve.
- `instruction-surface-references` — the specs approval gate is no longer one of `design.md`'s question-context decision surfaces.

## Impact

Modified files:

- `sai/commands/design/instructions.md`
- `sai/commands/design/worker.md`
- `openspec/specs/specs-approval-gate/spec.md`
- `openspec/specs/sai-2-design-approval-gate/spec.md`
- `AGENTS.md`

New files: none.

`sai/commands/status/body.md` is deliberately unchanged: all three Specs states still resolve — absent specs, specs present without `approval.specs.approved_at` (the `sai-1`→`sai-2` window), and stamped.

Accepted trade-offs: user-supplied approval notes lose their dedicated channel and are absorbed by `sai-1`'s feedback gate free-text box; no interactive abort remains at the start of `sai-2-design`, so not invoking the command is the only decline path.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
