**Complexity**: high (8 prompt files, 1 new policy, no breaking change)

## Why

Today every user decision reaches the user as a bare worker-authored string (`question: string`, `sai/orchestration/worker-lifecycle.md:33`) forwarded verbatim by coordinators (`sai/orchestration/coordinator-contract.md:22`), with no instruction telling workers how to phrase questions ("Return `needs_input` for planning questions" only, `sai/orchestration/workers/sai-1-spec-proposal-worker.md:15`). The result is terse, context-free prompts that a context-switched user (for example a PR reviewer who never saw the planning chat) cannot answer from the prompt alone.

## What Changes

- Introduce `sai/policies/question-context.md`, the canonical policy defining the mandatory five-element anatomy of every user-facing decision prompt: (1) what is being decided, (2) why it matters, (3) the plain-language options, (4) the essential state context, and (5) plain wording. Single-sourced and referenced by every user-facing question surface; auto-installed for both harnesses by the existing recursive `sai-policies` projection (`sai/install-manifest.json:9`) — no manifest edit.
- `sai/orchestration/worker-lifecycle.md` requires every `needs_input` question to comply with the policy and the design notice `message` to comply with the policy's informational-notice subset. This is the single lever: all three workers fetch and follow the lifecycle contract first, so the requirement propagates to Claude Code and opencode unchanged.
- The spec, design, and implementation worker contracts (`sai-1-spec-proposal-worker.md`, `sai-2-design-worker.md`, `sai-3-implementation-worker.md`) explicitly require the anatomy for planning questions, and the design contract additionally for the design notice.
- The fixed-gate instruction surfaces reference the policy: `sai/instructions/design.md` (spec approval gate, Open Questions gate), `sai/instructions/apply.md` (Human Verification gate, GREEN-conflict halt), `sai/instructions/explore.md` (slicing clarifying question).
- No changes to the lifecycle payload schema, coordinator contracts, harness bindings, wrappers, or `sai/install-manifest.json` (Option A scope).

## Capabilities

### New Capabilities
- `question-context-policy`: owns the canonical five-element question anatomy single-sourced in `sai/policies/question-context.md` and referenced — never restated — by every user-facing question surface.
- `worker-contract-references`: the spec, design, and implementation worker contracts explicitly require the anatomy for planning questions, and the design contract for the design notice message.
- `instruction-surface-references`: the fixed-gate instruction surfaces — design.md (spec approval gate, Open Questions gate), apply.md (Human Verification gate, GREEN-conflict halt), explore.md (slicing clarifying question) — reference the policy.

### Modified Capabilities
- `worker-lifecycle-protocol`: the `needs_input` question and design notice `message` payload requirements gain policy compliance (ADDED requirement).

## Impact

- `sai/policies/question-context.md` — new canonical policy. Auto-installed by the existing recursive `sai-policies` projection (`sai/install-manifest.json:9`); no manifest entry, no harness binding, no agent file.
- `sai/orchestration/worker-lifecycle.md` — question-content requirement added after the closed payload shapes; payload shapes, statuses, and notice shape unchanged.
- `sai/orchestration/workers/sai-1-spec-proposal-worker.md`, `sai/orchestration/workers/sai-2-design-worker.md`, `sai/orchestration/workers/sai-3-implementation-worker.md` — explicit anatomy requirement for planning questions/notices; pinned picker strings (`Use change '{name}'?`, `Which change?`) untouched (asserted by `test/design-coordinator-worker.test.js:260` and `test/implement-coordinator-worker.test.js:73-74,470`).
- `sai/instructions/design.md` — spec approval gate (line 7) and Open Questions gate (line 90) reference the policy; pinned option labels/ordering and yes/no semantics preserved.
- `sai/instructions/apply.md` — Human Verification gate (line 60) and GREEN-conflict halt (line 68) reference the policy; the `Human Verification` string asserted by `test/apply-coordinator-verification.test.js:137,201` preserved.
- `sai/instructions/explore.md` — slicing clarifying question (line 74) references the policy.
- `openspec/specs/question-context-policy/spec.md`, `openspec/specs/worker-contract-references/spec.md`, `openspec/specs/instruction-surface-references/spec.md` — new capability specs; `openspec/specs/worker-lifecycle-protocol/spec.md` — modified (ADDED requirement).
- `GLOSSARY.md` — term already present (pre-staged in the spec phase); no implementation edit.
- Not touched: the lifecycle payload schema (worker-lifecycle.md shapes), `sai/orchestration/coordinator-contract.md` (verbatim forwarding and the never-invent rule stay), harness bindings, wrappers, `sai/install-manifest.json`, `sai/policies/remember.md` (closed-choice picker mechanics — presentation, not content), and `sai/policies/artifact-feedback-gate.md`.

## Proposal Research Documentation

**Local files**: sai/orchestration/worker-lifecycle.md; sai/orchestration/coordinator-contract.md; sai/orchestration/workers/sai-1-spec-proposal-worker.md; sai/orchestration/workers/sai-2-design-worker.md; sai/orchestration/workers/sai-3-implementation-worker.md; sai/instructions/design.md; sai/instructions/apply.md; sai/instructions/explore.md; sai/install-manifest.json; sai/policies/artifact-review-contract.md; sai/policies/glossary-format.md; sai/instructions/spec.propose.md; openspec/specs/worker-lifecycle-protocol/spec.md; openspec/specs/worker-dispatch-prompt-template/spec.md; openspec/specs/design-planning-worker/spec.md; openspec/specs/implementation-planning-worker/spec.md; openspec/specs/sai-2-design-approval-gate/spec.md; openspec/specs/open-questions-gate/spec.md; openspec/specs/apply-human-verification-gate/spec.md; openspec/specs/green-conflict-stop/spec.md; openspec/specs/explore-vertical-slicing/spec.md; openspec/specs/pipeline-question-escalation/spec.md; openspec/specs/pipeline-question-autonomy/spec.md; GLOSSARY.md

**External URLs**: - None

## Additional Notes

- Model for the anatomy: the spec-problem amendment presentation in `sai/instructions/design.md:34-38` — (1) the discovered problem, (2) the concrete diff, (3) a closed-choice offer — is the existing context-rich question the policy formalizes for every surface.
- Enforcement point: the policy is satisfied at the worker source. Coordinators already forward questions verbatim (`coordinator-contract.md:22`; `pipeline-question-escalation/spec.md:8` mandates exact question/options unmodified) and never invent payload fields (`coordinator-contract.md:44`), so no coordinator-side context injection is possible — the worker string is the single choke point, which is exactly why the content contract lives at the worker contracts and lifecycle.
- Scoping note: the notice `message` compliance applies to the design-only notice (`worker-lifecycle.md:51-57`); implementation workers never emit notices.
- Enforcement is model discipline, not structural: a worker can still emit a terse question; no schema-level guarantee exists. Slightly longer worker-authored questions cost marginally more tokens and user reading time (accepted trade-off).
- The policy governs the question/message *content*; the option-picker *presentation* mechanics (native pickers, full-word labels) remain owned by `sai/policies/remember.md` closed-choice-prompts and are untouched.
- The five fixed-gate surfaces are coordinator/instruction-authored prompts (not worker payloads); the policy's reference requirement applies to them as user-facing decision prompts in the same way, so a context-switched reader can decide from the gate prompt alone.
