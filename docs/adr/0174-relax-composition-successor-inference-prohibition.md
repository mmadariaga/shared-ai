# ADR 0174: Relax the artifact-content-inference prohibition in chained composition successor activation

<!-- adr-index: refs 0147a; refs 0151; refs 0152b; refs 0173b -->

## Status

Accepted

## Context

Rule 2 of the Chained phase composition contract in `sai/orchestration/command-runner.md` governs how a non-final adapter transitions to its successor. The pre-change text bundled two distinct protections into one sentence: (a) the shared contract SHALL activate only the consecutive successor with the authorized envelope and SHALL NOT skip ahead to a later list entry, and (b) it SHALL NOT infer the next phase from worker summary text, artifact contents, `changed_files` text, or undeclared side channels.

The `/sai-review` meta-review composition needs to activate audit segments conditionally from the freshly regenerated `review.md`: its declared bounded triage parse reads exactly three named `**Surface touched:**` fields and activates the security/performance/accessibility adapters at positions 1–3 only when a field resolves to `Yes`. That activation is driven by the declared bootstrap segment list and a declared parse of a regenerated artifact — not by inferring a successor from worker prose. The blanket artifact-content-inference prohibition in rule 2(b) collided with this legal, declared conditional-activation flow.

## Decision

Remove only the artifact-content-inference prohibition from rule 2 of Chained phase composition in `sai/orchestration/command-runner.md`, retaining the no-skip-ahead / no-duplicate-segment guard verbatim. The shared contract SHALL still activate only the declared consecutive successor with its authorized envelope and SHALL NOT skip ahead to a later list entry; a supervising composition MAY activate that declared successor under a declared conditional-activation rule (for example the meta-review triage parse of the regenerated `review.md`) without the rule counting as an undeclared side channel. Deterministic ordering stays protected while triage-driven conditional activation becomes legal.

## Alternatives Considered

- **Declared `segment_selector` adapter field** — rejected: a new adapter field for choosing segments is unnecessary indirection. The segment list is already declared by the composition's bootstrap, and the conditional-activation rule already lives in the declared bootstrap triage parse; adding a selector field would duplicate declared state in a second surface.
- **Remove the whole rule 2 sentence including the no-skip-ahead guard** — rejected: dropping the guard would permit skipping ahead to later list entries and weaken the deterministic-ordering protection this change exists to keep.
- **Narrow deletion of only the inference prohibition** (chosen) — the guard stays verbatim, the undeclared-side-channel protection for worker prose remains, and only the artifact-content clause that blocked declared conditional activation is removed.

## Consequences

- `/sai-review`'s bounded triage parse can legally activate audit segments from the regenerated `review.md` under the declared bootstrap rules.
- The no-skip-ahead / no-duplicate-segment guard remains byte-identical, so ordinary compositions (including `/sai-build`) behave exactly as before.
- A composition still SHALL NOT activate a successor inferred from worker summary text or undeclared side channels; only a declared conditional-activation rule in the composition's own bootstrap may drive activation.
- The relaxation is reflected in the change's delta spec `openspec/changes/sai-review-composition/specs/orchestration-core/spec.md` (MODIFIED `Chained phase composition`) and in `AGENTS.md`'s Meta-review coordinator and worker section.

## Related

- `openspec/changes/sai-review-composition/specs/orchestration-core/spec.md` — MODIFIED Chained phase composition delta recording this relaxation
- ADR 0147a — Three-rule composition delta lives only in command-runner.md Result Loop (the rule 2 home)
- ADR 0151 — Composition constructs successor envelopes directly (the authorized-envelope mechanism the guard protects)
- ADR 0152b — Build is an ordinary composition coordinator, not explore supervision (first ordinary composition consumer)
- ADR 0173b — Build composition inherits pointer delivery with no opt-out special case (nearest precedent of a declared composition-driven activation relaxation)
