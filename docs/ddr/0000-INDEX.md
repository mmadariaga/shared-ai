# DDR Index

This index groups the DDRs in `docs/ddr/` by **command** and by **cross-cutting category**. A DDR may appear in more than one category: the filesystem already lists them alphabetically; the value here is the relational map (amends, supersedes, sibling pairs, refs).

## Conventions

- Each entry references the DDR by its original title (as it appears in the file).
- *Note* indicates a relationship using pinned entry-line token forms: `— Pair with NNNN`, `— Refs NNNN`, `— **Amends** NNNN`, `— **Reframes** NNNN`, `— **Reverses** NNNN`, `— Supersedes NNNN`.
- *Superseded* marks DDRs whose decision was replaced; the content remains historically accurate.
- The cold build is the sole branch that recomputes global structural thresholds: a cross-cutting category appears as its own `### ` subsection only when ≥2 DDRs reference it; fewer than 8 cross-cutting DDRs collapse to a single list; the 8–12 target subsection count is a cold-build-time recomputation. The warm path does NOT recompute these — minor category/threshold drift between cold builds is accepted.

---

## By command

### `/sai-1-spec`

- [0014 — Decision summary derived exclusively from written artifacts](./0014-decision-summary-derived-from-artifacts-only.md)
- [0067 — Handoff provenance consumption as "premise to confirm and extend"](./0067-confirm-extend-consumption-framing.md)
- [0072 — Numeric complexity thresholds calibrated from an archive survey](./0072-complexity-thresholds-calibrated-from-archive-survey.md) — Refs adr:0069, Refs adr:0070

### `/sai-2-design`

- [0014 — Decision summary derived exclusively from written artifacts](./0014-decision-summary-derived-from-artifacts-only.md)
- [0072 — Numeric complexity thresholds calibrated from an archive survey](./0072-complexity-thresholds-calibrated-from-archive-survey.md) — Refs adr:0069, Refs adr:0070

### `/sai-3-implement`

- [0016 — Accept double branch-selection prompt with the sibling spec](./0016-accept-double-prompt-with-sibling-spec.md)
- [0021 — Preserve the no-dedup re-run contract when adding audit-finding judgment](./0021-preserve-rerun-no-dedup-contract.md)

### `/sai-4-apply`

- [0016 — Accept double branch-selection prompt with the sibling spec](./0016-accept-double-prompt-with-sibling-spec.md)
- [0027 — A failing GREEN is a human decision, reached via bounded iteration](./0027-failing-green-human-decision.md)
- [0041 — Uniform three-option commit gate across apply.md and commit.md](./0041-uniform-three-option-gate.md)
- [0042 — Reconcile the "ask every time" authorization principle atomically at the principle layer](./0042-reconcile-authorization-principle-atomically.md)
- [0052 — Human-Verification deferral under `--fast-track` with bounded-failure semantics](./0052-human-verification-deferral-under-fast-track.md)
- [0062 — Field 9's soft-degradation exemption is stated at two sites](./0062-field-9-soft-degradation-stated-at-two-sites.md) — **Amends** adr:0026
- [0063 — A contract-violating telemetry note is dropped whole, never trimmed](./0063-violating-telemetry-note-dropped-not-cleaned.md)

### `/sai-5-review`

- [0013 — Dedicated mMUT-N finding namespace and Mutation Analysis output section](./0013-mmut-n-finding-namespace-for-mutation-analysis.md) — **Amends** adr:0012

### `/sai-6-security`


### `/sai-7-performance`


### `/sai-8-accessibility`


### `/sai-explore`

- [0053 — Post-crystallization review loop fires once per turn, after the final `Ready to Propose` block](./0053-post-crystallization-review-once-per-turn.md)
- [0068 — Scope provenance to item-5 single-change block; defer item-6 sliced blocks](./0068-scope-item-5-defer-sliced.md)
- [0094 — Supervised auto-answer confidence is a qualitative judgment gated by an objective grounding floor](./0094-qualitative-confidence-with-grounding-floor.md) — Pair with 0095
- [0095 — Auto-answer grounding sources are bounded and exclude the explore conversation](./0095-bounded-grounding-sources-exclude-conversation.md) — Pair with 0094
- [0105 — Severity-prefixed identifiers for artifact review findings](./0105-severity-prefixed-identifiers-for-artifact-review-findings.md)

### `/sai-backfill`

- [0008 — sai-backfill Does Not Generate design.md, tasks.md, or implementation.md](./0008-backfill-prohibited-design-artifacts.md) — Refs adr:0007

### `/sai-commit`

- [0041 — Uniform three-option commit gate across apply.md and commit.md](./0041-uniform-three-option-gate.md)
- [0042 — Reconcile the "ask every time" authorization principle atomically at the principle layer](./0042-reconcile-authorization-principle-atomically.md)

### `/sai-status`


### `npx shared-ai` (install / setup / uninstall / doctor)


### Harness wrappers & the shared instruction layer


---

## Cross-cutting categories

### Fetch resolution & path conventions


### Harness portability & mirror discipline


### Argument passing & change-name resolution


### Fast-track mode

- [0052 — Human-Verification deferral under `--fast-track` with bounded-failure semantics](./0052-human-verification-deferral-under-fast-track.md)

### Commit authorization, staging & message rules

- [0041 — Uniform three-option commit gate across apply.md and commit.md](./0041-uniform-three-option-gate.md)
- [0042 — Reconcile the "ask every time" authorization principle atomically at the principle layer](./0042-reconcile-authorization-principle-atomically.md)

### Subagent dispatch & report contract

- [0027 — A failing GREEN is a human decision, reached via bounded iteration](./0027-failing-green-human-decision.md)
- [0062 — Field 9's soft-degradation exemption is stated at two sites](./0062-field-9-soft-degradation-stated-at-two-sites.md) — **Amends** adr:0026
- [0063 — A contract-violating telemetry note is dropped whole, never trimmed](./0063-violating-telemetry-note-dropped-not-cleaned.md)

### Testability routing & RED → GREEN


### The `interfaces.md` contract


### Gates, decision summaries & feedback loops

- [0014 — Decision summary derived exclusively from written artifacts](./0014-decision-summary-derived-from-artifacts-only.md)

### Explore crystallization & the review loop

- [0053 — Post-crystallization review loop fires once per turn, after the final `Ready to Propose` block](./0053-post-crystallization-review-once-per-turn.md)
- [0068 — Scope provenance to item-5 single-change block; defer item-6 sliced blocks](./0068-scope-item-5-defer-sliced.md)
- [0094 — Supervised auto-answer confidence is a qualitative judgment gated by an objective grounding floor](./0094-qualitative-confidence-with-grounding-floor.md) — Pair with 0095
- [0095 — Auto-answer grounding sources are bounded and exclude the explore conversation](./0095-bounded-grounding-sources-exclude-conversation.md) — Pair with 0094
- [0105 — Severity-prefixed identifiers for artifact review findings](./0105-severity-prefixed-identifiers-for-artifact-review-findings.md)

### Artifact metadata & routing tokens

- [0067 — Handoff provenance consumption as "premise to confirm and extend"](./0067-confirm-extend-consumption-framing.md)
- [0072 — Numeric complexity thresholds calibrated from an archive survey](./0072-complexity-thresholds-calibrated-from-archive-survey.md) — Refs adr:0069, Refs adr:0070

### Installer dependency policy & external tooling


---

## DDRs that extend or correct prior ones

| DDR | Action | Over |
|---|---|---|
| [0013](./0013-mmut-n-finding-namespace-for-mutation-analysis.md) | amends | [0012](../adr/0012-mutation-analysis-as-dedicated-protocol-section.md) |
| [0062](./0062-field-9-soft-degradation-stated-at-two-sites.md) | amends | [0026](../adr/0026-stable-eight-field-report.md) |

## Superseded DDRs (historical)

