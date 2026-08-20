## Target State

### Architecture Snapshot

None — no planned public surfaces (instruction, policy, main-spec, and contract-test edits only; no new classes, interfaces, or methods).

### File Manifest

M openspec/specs/artifact-feedback-gate/spec.md (Step 6)
M openspec/specs/explore-pipeline-supervision/spec.md (Step 6)
M openspec/specs/pipeline-design-phase-chaining/spec.md (Step 6)
M openspec/specs/planning-artifact-review-loop/spec.md (Step 6)
M openspec/specs/supervised-pipeline-forwarding/spec.md (Step 6)
M openspec/specs/supervised-review-reporting/spec.md (Step 6)
M openspec/specs/supervised-review-rounds/spec.md (Step 6)
M sai/commands/design/worker.md (Step 2)
M sai/commands/explore/instructions.md (Step 4)
M sai/commands/spec/worker.md (Step 1)
M sai/policies/artifact-feedback-gate.md (Step 5)
M sai/policies/artifact-review-contract.md (Step 5)
M test/explore-pipeline-selector.test.js (Step 3, Step 7)
M test/design-coordinator-worker.test.js (Step 7 verification alignment)
M test/spec-coordinator-worker.test.js (Step 7)
M test/todo-structure-policy.test.js (Step 7)

## Context

Selector-dispatched Auto supervision already runs explore's in-session Review Engine over phase artifacts. Spec and design workers still run their own automatic isolated planning-artifact review loops on every invocation, including supervised ones. That duplication costs up to six automatic reviewer dispatches per phase on a full supervised run even though the supervised layer already holds repository context.

The archived `2026-08-15-supervised-in-situ-review` moved supervised review in-session but left the worker-owned automatic loop unconditional. Production explore instructions still describe a one-round supervised cap justified by "heavy convergence" inside the worker-owned loop, while `GLOSSARY.md` **Supervised Review Round** and parts of the contract suite already state a three-round per-phase bound. This change closes the supervised-path gap only: suppress the worker-owned automatic loop when a new `--supervised` marker is present, forward that marker from explore Auto dispatches, and align supervised round wording and related triggers to three rounds per phase per Auto attempt.

Standalone `/sai-1-spec` and `/sai-2-design` without the marker stay byte-for-byte unchanged in automatic-loop behavior. Boot adapters and the two-string envelope shape are untouched.

## Goals / Non-Goals

**Goals**

- Honor `--supervised` on the selected envelope source so the automatic worker-owned planning-artifact review loop does not run (no automatic isolated reviewer dispatch; no automatic-loop counter advance; no automatic-path `review` progress event).
- Forward `--supervised` from explore Auto into sai-1 and chained sai-2 (including design-phase retry) as flag content on `arguments_value` with empty `wrapper_echo_value`.
- Raise supervised in-session per-phase round caps and related production/policy wording from one round to three rounds per Auto attempt, with counters resetting on a new Auto attempt.
- Keep user-requested additional passes at the prose feedback gate uncapped and unconditioned by the marker.
- Leave declared worker progress plans intact (step lists unchanged). Under suppression the automatic path emits no `review` progress event, so `review` stays unmarked. On the supervised explore path the coordinator still declares no adapter plan/list for step marking; suppression does not invent supervised step marks.
- Update the closed set of contract tests that pin unconditional worker review, one-round wording, or surface enumeration.

**Non-Goals**

- No boot-adapter changes; no third envelope field; no separate supervised worker bindings.
- No change to severity vocabulary, finding shape, identifier scheme, or tally form.
- No change to the manual post-crystallization review loop (item 9 / `review-loop-navigation`).
- No dispatcher provenance verification on the marker.
- No removal of the worker-owned loop on the standalone path.
- No GLOSSARY rewrite beyond what production alignment already implies (definition already states three rounds per phase).

## Decisions

### D1: Carry the supervision marker as flag content inside the existing two-string envelope

**Choice:** Put the literal token `--supervised` on the selected envelope source (`wrapper_echo_value` vs `arguments_value` after existing wrapper-echo precedence). Explore Auto always leaves echo empty and places the marker on `arguments_value` so a crystallized request body is never discarded by echo precedence.

**Alternatives considered:** bare non-empty `wrapper_echo_value` as sole carrier (rejected: echo precedence would discard the Ready-to-Propose body); third envelope field (rejected: breaks two-string boot contract); separate supervised worker bindings (rejected: duplicates an entire surface for one boolean).

**Record family**: adr

**Provenance**: user

### D2: Two phase grammars, one marker token

**Choice:** Spec worker gains a minimal leading line-wise recognized-flag grammar: strip leading lines whose trimmed content is exactly `--supervised`; the first non-flag line opens the verbatim request inclusive; nothing after that opening is parsed as a flag. Design worker recognizes `--supervised` on its existing name-first flag surface alongside `--fast-track` and `--overview-lang <language>` without requiring first-token position. Canonical Auto design shape: `{name} --fast-track --supervised` with optional `--overview-lang {overview_language}`.

**Alternatives considered:** single unified ordering rule for both workers (rejected: spec request bodies are multi-line prose; design is name-first tokens); invert default so the loop runs only on an explicit standalone flag (rejected: silence becomes the signal).

**Record family**: adr

**Provenance**: derived

### D3: Suppress only the automatic worker-owned loop; keep user-requested passes and plan shape

**Choice:** When the marker is present, skip automatic isolated reviewer dispatch and automatic-loop counter advances; proceed to the ordinary pre-gate terminal without automatic-path `review` evidence. The `review` step remains in each declared plan. User-requested passes at the coordinator-owned prose feedback gate stay available, uncapped, same isolation and contract, and are not conditioned on the marker. Workers honor the marker as written with no dispatcher provenance check.

**Record family**: adr

**Provenance**: user

### D4: Three-round supervised cap per phase per Auto attempt; drop co-running-loop justification

**Choice:** Align production explore instructions, delta-driven main specs, and related policy trigger sentences to at most three in-session rounds per phase per Auto attempt. Phase counters (`review_rounds.spec`, `review_rounds.design`) already exist; reset them to zero at the start of each new Auto attempt so rounds from an earlier failed/cancelled attempt do not count against the new bound. High findings extend while the cap permits; third-round High closes as non-failure cap exhaustion. Under supervision, in-session rounds are the sole automatic convergence mechanism — coexistence no longer treats worker-owned + supervised duplication as an accepted trade-off.

**Alternatives considered:** keep one supervised round after suppressing the worker loop (rejected: leaves insufficient automatic convergence and contradicts GLOSSARY/tests already stating three); share one six-round budget across both phases (rejected: caps stay per phase).

**Record family**: ddr

**Provenance**: user

### D5: Minimal policy surface edits only

**Choice:** Reword only (a) `sai/policies/artifact-review-contract.md` surface enumeration so the automatic worker-owned loop is conditional on marker absence (user-requested worker-owned passes remain bound), and (b) the deferred-gate exhaustion trigger sentence in `sai/policies/artifact-feedback-gate.md` from one-round to three-round. Severity body, finding shape, identifier scheme, tally form, gate ownership, labels, iteration counter, and interruption branch stay unchanged.

**Record family**: adr

**Provenance**: derived

### D6: Apply main `openspec/specs/**` in the same change as production surfaces

**Choice:** Implementation updates the seven modified main capability specs in lockstep with production instruction/policy files so archive-time delta sync is not the only path to a consistent main tree. Delta specs under the change directory remain authoritative for requirement text during the change.

**Record family**: adr

**Provenance**: codebase-forced

## Risks / Trade-offs

- [Risk] Supervised path gives up reviewer independence from the coordinator's own auto-answers → Mitigation: keep per-round disk reread and the autonomy audit log as guards against rubber-stamping.
- [Risk] Spec leading-flag grammar could strip a legitimate first line if a request body started with bare `--supervised` → Mitigation: only Auto serialization places that line first; standalone requests do not; empty-after-strip fails validation.
- [Risk] Forgetting `--supervised` on design-phase retry would reintroduce isolated worker reviewers mid-supervision (**Verify-first**: Step 4) → Mitigation: Step 3 lands concrete explore-pipeline-selector pins for the design-retry envelope (same shape as chained design, including `--supervised`, no proposal/spec regen) before Step 4 edits `sai/commands/explore/instructions.md`; Step 4 must turn those pins green and must not drop the marker.
- [Risk] Partial one-round wording left in production or tests after the raise → Mitigation: closed grep of `one-round` / `at most one review round` / `heavy convergence` across `sai/`, `openspec/specs/`, and `test/**/*.js` in Step 7; update every hit that pins the old bound.
- [Risk] Contract tests already expect three-round language in places while production still says one-round — edits can flip which side fails first → Mitigation: pin Auto envelopes first (Step 3), land explore/policy production wording next (Steps 4–5), finish remaining suite pins in Step 7, and run the scoped contract suite after each test touch.

## Migration Plan

No runtime data migration. Deploy by landing the instruction, policy, main-spec, and test edits together. Rollback is a git revert of the change. No feature flag beyond the invocation marker itself.

## Open Questions

None

## Deferred

- **Wrapper `argument-hint` documentation of `--supervised` on explore/design/spec wrappers** — Cost of postponing: operators discover the flag only via explore Auto or delta specs; manual supervised invocations stay possible but less discoverable. Recommendation: add hint text in a small follow-up once Auto forwarding is stable, without touching boot adapters.
- **Explicit GLOSSARY "per Auto attempt" clause on Supervised Review Round** — Cost of postponing: glossary already says three rounds per phase but not the attempt-reset rule; readers may miss counter reset semantics. Recommendation: append a short attempt-reset phrase when the next glossary pass touches review terms.

## Manual Verification

- **End-to-end smoke (supervised):** Run explore Auto on a throwaway change and confirm (1) sai-1 `arguments_value` begins with `--supervised` and the Ready-to-Propose body, (2) chained design `arguments_value` is `{name} --fast-track --supervised` (plus overview-lang when selected), (3) neither worker dispatches an automatic isolated reviewer, (4) in-session rounds may run up to three times per phase on sustained High findings, (5) `review` stays unmarked on both workers' automatic paths.
- **End-to-end smoke (standalone):** Invoke `/sai-1-spec` and `/sai-2-design` without the marker and confirm the automatic worker-owned review loop still runs and can mark `review` on High=0.
- **Generated-artifact drift:** After edits, re-run the scoped contract tests listed in `tasks.md` Implementation Context and confirm no stale one-round / heavy-convergence / unconditional-worker-review pins remain in the closed grep set.
