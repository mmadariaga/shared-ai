**Complexity**: medium (4 files, no breaking change)

## Why

`sai-explore`'s post-crystallization review loop had two defects. First, its per-finding `Accept` / `Decline` triage rests on a false premise: `openspec/specs/explore-post-crystallization-review-loop/spec.md:186` justifies the single-finding iteration with "the harness pickers are single-select (per `sai/policies/remember.md`)", but `sai/policies/remember.md:11-12` never claims single-select for Claude Code and calls it only a default for opencode. Second, the separate `## DesignCorrectionRequest` block is dead-weight: it carries no consumer contract (only `sai/instructions/explore.md:175` emits it; `sai/policies/artifact-feedback-gate.md:83-100` consumes generic five-field feedback text, never the block's format), its `change:` header is redundant with the `/sai-2-design {name}` invocation, and once auto-handoff removed the acceptance ceremony it became a literal copy of the findings block.

## What Changes

- **Single output**: after a completed review transaction, the loop prints exactly one findings block — every finding in the shared review finding shape per `sai/policies/artifact-review-contract.md` (severity-prefixed `Finding H1`-style identifier heading that renders the contract's `Identifier` field, followed by the contract's remaining four fields in order: `Severity`, `Artifact location`, `Issue`, `Recommended correction`), in deterministic order (High → Medium → Low, then ascending numeric), closing with the base-form `Summary: High=n Medium=n Low=n`. Nothing else.
- **Remove the acceptance step**: no `Accept` / `Decline` pickers, no confirmation of an accepted set; every finding is handed off.
- **Remove the `## DesignCorrectionRequest` block**: the re-encoded handoff block and its `change:` header are deleted from the loop output and from the contract.
- **Re-point the handoff**: the findings block itself IS the handoff payload — the user pastes it at the feedback gate of a re-invoked `/sai-2-design`; the design worker applies design-artifact findings directly and routes proposal/spec findings through the consent-gated spec-amendment path (**apply in place** vs **do not apply / leave open**); `/sai-1-spec` is not offered. Regeneration conditions (`overview.state` `current`/`stale`) unchanged.
- **Contract rewrite**: the `Correction acceptance and handoff protocol` requirement and its scenarios in `explore-post-crystallization-review-loop/spec.md:184-236`, the operational paragraph at `sai/instructions/explore.md:173-179`, the wording at `change-overview-synchronization/spec.md:165`, and the two contract tests at `test/change-overview-contract.test.js:218-239`.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `explore-post-crystallization-review-loop`: the Correction acceptance and handoff protocol requirement is reworked into a single-output handoff protocol — after a review transaction closes with findings, the loop prints exactly one findings block (shared finding shape, deterministic High → Medium → Low then ascending numeric order, base-form `Summary:` tally) and nothing else; no acceptance step, no `Accept`/`Decline` pickers, no accepted-set confirmation, and no separate `## DesignCorrectionRequest` block; the findings block is the payload the user pastes at the `/sai-2-design` feedback gate, with ownership routing (design worker / consent-gated spec-amendment path) and regeneration conditioning unchanged; the false single-select premise and the "no acceptance, no handoff" scenario are dropped, and the Read-only constraint wording follows (handed-off corrections, not accepted ones).
- `change-overview-synchronization`: wording sync in the Supported post-materialization modification surfaces requirement — the findings block itself is the handoff payload the user pastes into the writable design-worker transactions, instead of "accepted corrections are handed to the user".

## Impact

- `openspec/specs/explore-post-crystallization-review-loop/spec.md` — reworked handoff protocol requirement (renamed) plus Read-only constraint wording sync.
- `sai/instructions/explore.md` — the operational paragraph (lines 173-179) rewritten: single findings block, no `## DesignCorrectionRequest` emission, paste-at-gate handoff.
- `openspec/specs/change-overview-synchronization/spec.md` — wording sync at line 165.
- `test/change-overview-contract.test.js` — the two tests at lines 218-239 rewritten to assert single-output auto-handoff and gate routing without the handoff block.
- Explicitly NOT touched: `sai/policies/remember.md`, `sai/policies/artifact-feedback-gate.md`, and `sai/policies/artifact-review-contract.md` — the gate and the shared finding contract remain the consuming/defining sides; this change only removes the loop's redundant re-encoding.

## Proposal Research Documentation

**Local files**:
- `openspec/specs/explore-post-crystallization-review-loop/spec.md` (lines 172, 184-236)
- `sai/instructions/explore.md` (lines 169, 173-179)
- `sai/policies/remember.md` (lines 10-12)
- `sai/policies/artifact-feedback-gate.md` (lines 83-100) — the consuming gate: per-item feedback over five-field findings, no block contract
- `sai/policies/artifact-review-contract.md` (lines 19-40) — the shared finding shape and base-form `Summary:` tally both blocks already carry
- `openspec/specs/change-overview-synchronization/spec.md` (line 165, 181-183)
- `test/change-overview-contract.test.js` (lines 218-239)
- `docs/ddr/0105-severity-prefixed-identifiers-for-artifact-review-findings.md` (line 25) — the `Finding H1`-style rendered label form
- `openspec/specs/explore-pipeline-supervision/spec.md` (checked — its "accepted corrections" wording refers to the supervised design phase's own feedback dispositions and is out of scope)

**External URLs**: none

## Additional Notes

- The loop's former "SHALL NOT auto-accept" clause is dropped deliberately: the loop never applies or forwards corrections itself, so "auto-accept" in the loop only ever meant "include in the block"; the read-only guarantee and downstream consent are unchanged.
- The `## DesignCorrectionRequest` block is removed because nothing consumes its format: the feedback gate parses pasted five-field findings text, and the `change:` header duplicates the `/sai-2-design {name}` invocation scope. One output serves both consumers of the payload (the human reader and the design worker).
- A user who wants to drop a specific finding removes that line when pasting the findings block; a contested finding is declined at the downstream design gate instead.
- Harness universality: identical single-output behavior on Claude Code and opencode; no per-harness mechanism is introduced.
