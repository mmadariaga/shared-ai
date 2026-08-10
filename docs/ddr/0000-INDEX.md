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
- [0106 — The ordered routing test resolves a qualifying decision's record family, DDR first, with no tie](./0106-ordered-routing-test-family-resolution.md)

### `/sai-2-design`

- [0014 — Decision summary derived exclusively from written artifacts](./0014-decision-summary-derived-from-artifacts-only.md)
- [0072 — Numeric complexity thresholds calibrated from an archive survey](./0072-complexity-thresholds-calibrated-from-archive-survey.md) — Refs adr:0069, Refs adr:0070
- [0106 — The ordered routing test resolves a qualifying decision's record family, DDR first, with no tie](./0106-ordered-routing-test-family-resolution.md)
- [0109 — Progress plans are declared, canonical, and immutable; the coordinator renders and marks only](./0109-declared-canonical-immutable-progress-plan.md)
- [0110 — Progress reporting is additive and nonterminal; a run closes with exactly one terminal status](./0110-additive-nonterminal-progress-event.md)
- [0111 — Rendered progress state is a pure function of the declared plan order plus the marked set](./0111-rendered-progress-state-pure-function.md)
- [0112 — Task-list semantics are harness-neutral and single-sourced; below three declared steps no list renders](./0112-neutral-task-list-policy-single-source.md)
- [0113 — The task-list tool call originates exclusively from the coordinator session, never from a worker subagent](./0113-todowrite-emission-coordinator-only.md)
- [0114 — The dispatch envelope is exactly two strings; progress-plan content never travels in it](./0114-progress-plan-never-transported-in-envelope.md)
- [0117 — Target State relocates into design.md as the persisted authoritative snapshot](./0117-target-state-relocates-into-design-md-as-the-persisted-authoritative-snapshot.md)
- [0118 — Every generation is a recoverable two-phase transition with a persisted overview.state key](./0118-every-generation-is-a-recoverable-two-phase-transition-with-a-persisted-overview-state-key.md)

### `/sai-3-implement`

- [0016 — Accept double branch-selection prompt with the sibling spec](./0016-accept-double-prompt-with-sibling-spec.md)
- [0021 — Preserve the no-dedup re-run contract when adding audit-finding judgment](./0021-preserve-rerun-no-dedup-contract.md)
- [0106 — The ordered routing test resolves a qualifying decision's record family, DDR first, with no tie](./0106-ordered-routing-test-family-resolution.md)
- [0107 — Cross-family relationships are family-prefixed and family-isolated; supersedes never crosses families](./0107-cross-family-relationship-encoding.md)
- [0108 — Numbering stays independent per family; a record keeps its number when it moves between families](./0108-independent-per-family-numbering.md)
- [0109 — "Testable" (RED block) and "divisible" (production surface) are distinct Step properties](./0109-testable-and-divisible-are-distinct-step-properties.md) — Refs adr:0115
- [0115 — The implementation plan's step identity is its `#### Step N:` H4-with-colon heading](./0115-implementation-step-identity-is-h4-heading.md)

### `/sai-4-apply`

- [0016 — Accept double branch-selection prompt with the sibling spec](./0016-accept-double-prompt-with-sibling-spec.md)
- [0026 — Stable 8-field report shape with per-dispatch n/a for the unowned field](./0026-stable-eight-field-report.md)
- [0027 — A failing GREEN is a human decision, reached via bounded iteration](./0027-failing-green-human-decision.md)
- [0041 — Uniform three-option commit gate across apply.md and commit.md](./0041-uniform-three-option-gate.md)
- [0042 — Reconcile the "ask every time" authorization principle atomically at the principle layer](./0042-reconcile-authorization-principle-atomically.md)
- [0052 — Human-Verification deferral under `--fast-track` with bounded-failure semantics](./0052-human-verification-deferral-under-fast-track.md)
- [0062 — Field 9's soft-degradation exemption is stated at two sites](./0062-field-9-soft-degradation-stated-at-two-sites.md) — **Amends** adr:0026
- [0063 — A contract-violating telemetry note is dropped whole, never trimmed](./0063-violating-telemetry-note-dropped-not-cleaned.md)
- [0109 — "Testable" (RED block) and "divisible" (production surface) are distinct Step properties](./0109-testable-and-divisible-are-distinct-step-properties.md) — Refs adr:0115
- [0115 — The implementation plan's step identity is its `#### Step N:` H4-with-colon heading](./0115-implementation-step-identity-is-h4-heading.md)
- [0116 — The apply phase carries no progress events because it has no coordinator-worker boundary](./0116-apply-phase-carries-no-progress-events.md) — Refs 0110

### `/sai-5-review`


### `/sai-6-security`


### `/sai-7-performance`


### `/sai-8-accessibility`


### `/sai-explore`

- [0053 — Post-crystallization review loop fires once per turn, after the final `Ready to Propose` block](./0053-post-crystallization-review-once-per-turn.md)
- [0060 — The post-crystallization review loop's explicit trigger is the hyphenated literal token `review-loop`](./0060-review-loop-is-a-hyphenated-literal-token.md) — Pair with 0061, Refs 0053, Refs adr:0058
- [0061 — An artifact-review turn naming a tracked crystallized change is served first and then offered the loop, never rerouted into it](./0061-item-3-precedence-is-additive-not-a-reroute.md) — Pair with 0060, Refs 0053, Refs adr:0054
- [0068 — Scope provenance to item-5 single-change block; defer item-6 sliced blocks](./0068-scope-item-5-defer-sliced.md)
- [0094 — Supervised auto-answer confidence is a qualitative judgment gated by an objective grounding floor](./0094-qualitative-confidence-with-grounding-floor.md) — Pair with 0095
- [0095 — Auto-answer grounding sources are bounded and exclude the explore conversation](./0095-bounded-grounding-sources-exclude-conversation.md) — Pair with 0094
- [0105 — Severity-prefixed identifiers for artifact review findings](./0105-severity-prefixed-identifiers-for-artifact-review-findings.md)
- [0109 — The delegation envelope's status is reserved for dispatch outcomes; check verdicts travel only in the output payload](./0109-delegation-envelope-status-reserved-for-dispatch-outcomes.md)
- [0121 — The active review check is a sticky chat-scoped reference selected once at loop start](./0121-active-review-check-sticky-reference-selected-at-loop-start.md)
- [0122 — The in-progress state is render-only: setting, advancing, or resolving it never marks or clears an item](./0122-in-progress-state-is-render-only.md)

### `/sai-backfill`

- [0008 — sai-backfill Does Not Generate design.md, tasks.md, or implementation.md](./0008-backfill-prohibited-design-artifacts.md) — Refs adr:0007

### `/sai-commit`

- [0041 — Uniform three-option commit gate across apply.md and commit.md](./0041-uniform-three-option-gate.md)
- [0042 — Reconcile the "ask every time" authorization principle atomically at the principle layer](./0042-reconcile-authorization-principle-atomically.md)

### `/sai-status`


### `npx shared-ai` (install / setup / uninstall / doctor)

- [0109 — Doctor's opencode agent census derives from manifest-projected agent files, with the binding-to-projection alignment desync an explicit open gap](./0109-doctor-census-over-manifest-projected-files.md)
- [0119 — Outcome-token completion contract with command-boundary mapping](./0119-outcome-token-completion-contract-with-command-boundary-mapping.md)
- [0120 — Readline lifecycle owned by setup orchestration, closed once at the settle point](./0120-readline-lifecycle-owned-by-setup-orchestration.md)
- [0121 — The post-setup customization result stays in memory and never touches agent files](./0121-in-memory-non-persistent-override-contract.md)
- [0123 — Retirement records cover every distinct historical content variant, enumerated from git history at implementation time](./0123-retirement-records-cover-every-historical-content-variant.md)

### Harness wrappers & the shared instruction layer

- [0117 — Fetch resolution replaces the Glob existence probe with Read-then-Read exact-path fallback](./0117-fetch-resolution-read-then-read-exact-path-fallback.md)
- [0118 — Every resolved fetch path begins with `sai/`, `commands/`, or `skills/` and the harness root is never named](./0118-fetch-path-scope-invariant.md)

---

## Cross-cutting categories

- [0109 — Progress plans are declared, canonical, and immutable; the coordinator renders and marks only](./0109-declared-canonical-immutable-progress-plan.md)
- [0110 — Progress reporting is additive and nonterminal; a run closes with exactly one terminal status](./0110-additive-nonterminal-progress-event.md)
- [0111 — Rendered progress state is a pure function of the declared plan order plus the marked set](./0111-rendered-progress-state-pure-function.md)
- [0114 — The dispatch envelope is exactly two strings; progress-plan content never travels in it](./0114-progress-plan-never-transported-in-envelope.md)
- [0115 — The implementation plan's step identity is its `#### Step N:` H4-with-colon heading](./0115-implementation-step-identity-is-h4-heading.md)
- [0116 — The apply phase carries no progress events because it has no coordinator-worker boundary](./0116-apply-phase-carries-no-progress-events.md) — Refs 0110
- [0119 — Outcome-token completion contract with command-boundary mapping](./0119-outcome-token-completion-contract-with-command-boundary-mapping.md)
- [0120 — Readline lifecycle owned by setup orchestration, closed once at the settle point](./0120-readline-lifecycle-owned-by-setup-orchestration.md)
- [0121 — The post-setup customization result stays in memory and never touches agent files](./0121-in-memory-non-persistent-override-contract.md)
- [0123 — Retirement records cover every distinct historical content variant, enumerated from git history at implementation time](./0123-retirement-records-cover-every-historical-content-variant.md)

### Fetch resolution & path conventions

- [0117 — Fetch resolution replaces the Glob existence probe with Read-then-Read exact-path fallback](./0117-fetch-resolution-read-then-read-exact-path-fallback.md)
- [0118 — Every resolved fetch path begins with `sai/`, `commands/`, or `skills/` and the harness root is never named](./0118-fetch-path-scope-invariant.md)

### Harness portability & mirror discipline

- [0112 — Task-list semantics are harness-neutral and single-sourced; below three declared steps no list renders](./0112-neutral-task-list-policy-single-source.md)


### Argument passing & change-name resolution


### Fast-track mode

- [0052 — Human-Verification deferral under `--fast-track` with bounded-failure semantics](./0052-human-verification-deferral-under-fast-track.md)

### Commit authorization, staging & message rules

- [0041 — Uniform three-option commit gate across apply.md and commit.md](./0041-uniform-three-option-gate.md)
- [0042 — Reconcile the "ask every time" authorization principle atomically at the principle layer](./0042-reconcile-authorization-principle-atomically.md)

### Subagent dispatch & report contract

- [0026 — Stable 8-field report shape with per-dispatch n/a for the unowned field](./0026-stable-eight-field-report.md)
- [0027 — A failing GREEN is a human decision, reached via bounded iteration](./0027-failing-green-human-decision.md)
- [0062 — Field 9's soft-degradation exemption is stated at two sites](./0062-field-9-soft-degradation-stated-at-two-sites.md) — **Amends** 0026
- [0063 — A contract-violating telemetry note is dropped whole, never trimmed](./0063-violating-telemetry-note-dropped-not-cleaned.md)
- [0109 — The delegation envelope's status is reserved for dispatch outcomes; check verdicts travel only in the output payload](./0109-delegation-envelope-status-reserved-for-dispatch-outcomes.md)
- [0113 — The task-list tool call originates exclusively from the coordinator session, never from a worker subagent](./0113-todowrite-emission-coordinator-only.md)

### Testability routing & RED → GREEN

- [0109 — "Testable" (RED block) and "divisible" (production surface) are distinct Step properties](./0109-testable-and-divisible-are-distinct-step-properties.md) — Refs adr:0115

### The `interfaces.md` contract

- [0117 — Target State relocates into design.md as the persisted authoritative snapshot](./0117-target-state-relocates-into-design-md-as-the-persisted-authoritative-snapshot.md)

### Gates, decision summaries & feedback loops

- [0014 — Decision summary derived exclusively from written artifacts](./0014-decision-summary-derived-from-artifacts-only.md)

### Explore crystallization & the review loop

- [0053 — Post-crystallization review loop fires once per turn, after the final `Ready to Propose` block](./0053-post-crystallization-review-once-per-turn.md)
- [0060 — The post-crystallization review loop's explicit trigger is the hyphenated literal token `review-loop`](./0060-review-loop-is-a-hyphenated-literal-token.md) — Pair with 0061, Refs 0053, Refs adr:0058
- [0061 — An artifact-review turn naming a tracked crystallized change is served first and then offered the loop, never rerouted into it](./0061-item-3-precedence-is-additive-not-a-reroute.md) — Pair with 0060, Refs 0053, Refs adr:0054
- [0068 — Scope provenance to item-5 single-change block; defer item-6 sliced blocks](./0068-scope-item-5-defer-sliced.md)
- [0094 — Supervised auto-answer confidence is a qualitative judgment gated by an objective grounding floor](./0094-qualitative-confidence-with-grounding-floor.md) — Pair with 0095
- [0095 — Auto-answer grounding sources are bounded and exclude the explore conversation](./0095-bounded-grounding-sources-exclude-conversation.md) — Pair with 0094
- [0105 — Severity-prefixed identifiers for artifact review findings](./0105-severity-prefixed-identifiers-for-artifact-review-findings.md)
- [0121 — The active review check is a sticky chat-scoped reference selected once at loop start](./0121-active-review-check-sticky-reference-selected-at-loop-start.md)
- [0122 — The in-progress state is render-only: setting, advancing, or resolving it never marks or clears an item](./0122-in-progress-state-is-render-only.md)

### Artifact metadata & routing tokens

- [0067 — Handoff provenance consumption as "premise to confirm and extend"](./0067-confirm-extend-consumption-framing.md)
- [0072 — Numeric complexity thresholds calibrated from an archive survey](./0072-complexity-thresholds-calibrated-from-archive-survey.md) — Refs adr:0069, Refs adr:0070
- [0118 — Every generation is a recoverable two-phase transition with a persisted overview.state key](./0118-every-generation-is-a-recoverable-two-phase-transition-with-a-persisted-overview-state-key.md)

### Installer dependency policy & external tooling

- [0109 — Doctor's opencode agent census derives from manifest-projected agent files, with the binding-to-projection alignment desync an explicit open gap](./0109-doctor-census-over-manifest-projected-files.md)

---

## DDRs that extend or correct prior ones

| DDR | Action | Over |
|---|---|---|
| [0062](./0062-field-9-soft-degradation-stated-at-two-sites.md) | amends | [0026](./0026-stable-eight-field-report.md) |

## Superseded DDRs (historical)

