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
- [0133b — Review progress is marked only by no-High pass evidence](./0133b-review-progress-is-evidence-only.md) — Refs 0109c, Refs 0110, Refs 0111
- [0134a — Automatic planning review has two distinct bounded counters](./0134a-automatic-review-has-two-distinct-counters.md) — Refs 0133b
- [0135a — An empty spec reference set still yields a full review pass](./0135a-empty-spec-reference-set-is-a-full-review-pass.md) — Refs 0133b, Refs 0134a
- [0146 — Stable planning progress ids remain compatibility keys while labels become user-facing](./0146-stable-planning-progress-ids-preserve-compatibility.md)
- [0147 — Structured spec research closes at the shared confidence boundary before proposal generation](./0147-spec-research-closes-at-confidence-boundary.md)
- [0150 — Gate mode is parameterized at the fetch site, never detected from invocation context](./0150-mode-parameterized-at-fetch-site-not-detected.md) — **Amends** adr:0028
- [0151c — External Explore findings block is the only `review` progress evidence](./0151c-external-findings-block-is-only-review-evidence.md) — **Amends** 0133b, Refs adr:0158c
- [0156 — Critical prohibitions are deliberately duplicated across the spec worker contract and its step files](./0156-critical-prohibitions-duplicated-across-spec-steps.md) — Pair with adr:0172

### `/sai-2-design`

- [0014 — Decision summary derived exclusively from written artifacts](./0014-decision-summary-derived-from-artifacts-only.md)
- [0072 — Numeric complexity thresholds calibrated from an archive survey](./0072-complexity-thresholds-calibrated-from-archive-survey.md) — Refs adr:0069, Refs adr:0070
- [0106 — The ordered routing test resolves a qualifying decision's record family, DDR first, with no tie](./0106-ordered-routing-test-family-resolution.md)
- [0109c — Progress plans are declared, canonical, and immutable; the coordinator renders and marks only](./0109c-declared-canonical-immutable-progress-plan.md)
- [0110 — Progress reporting is additive and nonterminal; a run closes with exactly one terminal status](./0110-additive-nonterminal-progress-event.md)
- [0111 — Rendered progress state is a pure function of the declared plan order plus the marked set](./0111-rendered-progress-state-pure-function.md)
- [0112 — Task-list semantics are harness-neutral and single-sourced; below three declared steps no list renders](./0112-neutral-task-list-policy-single-source.md)
- [0113 — The task-list tool call originates exclusively from the coordinator session, never from a worker subagent](./0113-todowrite-emission-coordinator-only.md)
- [0114 — The dispatch envelope is exactly two strings; progress-plan content never travels in it](./0114-progress-plan-never-transported-in-envelope.md)
- [0117b — Target State relocates into design.md as the persisted authoritative snapshot](./0117b-target-state-relocates-into-design-md-as-the-persisted-authoritative-snapshot.md)
- [0118b — Every generation is a recoverable two-phase transition with a persisted overview.state key](./0118b-every-generation-is-a-recoverable-two-phase-transition-with-a-persisted-overview-state-key.md)
- [0130 — Change Overview uses an exact approval-oriented nine-section surface](./0130-change-overview-exact-approval-section-surface.md)
- [0131 — Change Overview requirement names and localization anchors remain separately owned](./0131-change-overview-requirement-name-and-localization-ownership.md)
- [0132 — Change Overview adapts architecture and centralizes the File Manifest](./0132-change-overview-adapts-architecture-and-centralizes-the-file-manifest.md)
- [0133b — Review progress is marked only by no-High pass evidence](./0133b-review-progress-is-evidence-only.md) — Refs 0109c, Refs 0110, Refs 0111
- [0134a — Automatic planning review has two distinct bounded counters](./0134a-automatic-review-has-two-distinct-counters.md) — Refs 0133b
- [0134c — Recovery retains the live worker and one shared attempt pool](./0134c-recovery-retains-live-worker-and-one-shared-pool.md)
- [0135a — An empty spec reference set still yields a full review pass](./0135a-empty-spec-reference-set-is-a-full-review-pass.md) — Refs 0133b, Refs 0134a
- [0135c — Failure classification identifies the repair boundary](./0135c-failure-classification-identifies-the-repair-boundary.md)
- [0136 — The overview generator envelope remains a closed five-field contract](./0136-overview-generator-envelope-remains-five-field.md)
- [0146 — Stable planning progress ids remain compatibility keys while labels become user-facing](./0146-stable-planning-progress-ids-preserve-compatibility.md)
- [0148 — Specs approval remains folded into design prerequisite resolution](./0148-specs-approval-remains-folded-into-design-prerequisites.md)
- [0150 — Gate mode is parameterized at the fetch site, never detected from invocation context](./0150-mode-parameterized-at-fetch-site-not-detected.md) — **Amends** adr:0028
- [0151b — Three mutually exclusive routing diagnoses, separate from worker failure classes](./0151b-three-mutually-exclusive-routing-diagnoses.md) — Refs 0152
- [0151c — External Explore findings block is the only `review` progress evidence](./0151c-external-findings-block-is-only-review-evidence.md) — **Amends** 0133b, Refs adr:0158c
- [0152 — Cause Locus gates eligibility; unresolved is not out-of-scope](./0152-cause-locus-gates-eligibility.md) — Refs 0151b

### `/sai-3-implement`

- [0016 — Accept double branch-selection prompt with the sibling spec](./0016-accept-double-prompt-with-sibling-spec.md)
- [0021 — Preserve the no-dedup re-run contract when adding audit-finding judgment](./0021-preserve-rerun-no-dedup-contract.md)
- [0106 — The ordered routing test resolves a qualifying decision's record family, DDR first, with no tie](./0106-ordered-routing-test-family-resolution.md)
- [0107 — Cross-family relationships are family-prefixed and family-isolated; supersedes never crosses families](./0107-cross-family-relationship-encoding.md)
- [0108 — Numbering stays independent per family; a record keeps its number when it moves between families](./0108-independent-per-family-numbering.md)
- [0109b — "Testable" (RED block) and "divisible" (production surface) are distinct Step properties](./0109b-testable-and-divisible-are-distinct-step-properties.md) — Refs adr:0115
- [0115 — The implementation plan's step identity is its `#### Step N:` H4-with-colon heading](./0115-implementation-step-identity-is-h4-heading.md)
- [0126 — Archive only after requirement-level survival review](./0126-archive-only-after-requirement-level-survival-review.md)
- [0127 — Archived specs preserve their pre-archival bytes](./0127-archived-specs-preserve-pre-archival-bytes.md)
- [0146 — Stable planning progress ids remain compatibility keys while labels become user-facing](./0146-stable-planning-progress-ids-preserve-compatibility.md)

### `/sai-4-apply`

- [0016 — Accept double branch-selection prompt with the sibling spec](./0016-accept-double-prompt-with-sibling-spec.md)
- [0026 — Stable 8-field report shape with per-dispatch n/a for the unowned field](./0026-stable-eight-field-report.md)
- [0027 — A failing GREEN is a human decision, reached via bounded iteration](./0027-failing-green-human-decision.md)
- [0041 — Uniform three-option commit gate across apply.md and commit.md](./0041-uniform-three-option-gate.md)
- [0042 — Reconcile the "ask every time" authorization principle atomically at the principle layer](./0042-reconcile-authorization-principle-atomically.md)
- [0052 — Human-Verification deferral under `--fast-track` with bounded-failure semantics](./0052-human-verification-deferral-under-fast-track.md)
- [0062 — Field 9's soft-degradation exemption is stated at two sites](./0062-field-9-soft-degradation-stated-at-two-sites.md) — **Amends** adr:0026
- [0063 — A contract-violating telemetry note is dropped whole, never trimmed](./0063-violating-telemetry-note-dropped-not-cleaned.md)
- [0109b — "Testable" (RED block) and "divisible" (production surface) are distinct Step properties](./0109b-testable-and-divisible-are-distinct-step-properties.md) — Refs adr:0115
- [0115 — The implementation plan's step identity is its `#### Step N:` H4-with-colon heading](./0115-implementation-step-identity-is-h4-heading.md)
- [0137b — The apply routed boundary carries progress events against immutable dispatch-local plans](./0137b-apply-routed-boundary-carries-progress-events.md) — Supersedes 0116
- [0151b — Three mutually exclusive routing diagnoses, separate from worker failure classes](./0151b-three-mutually-exclusive-routing-diagnoses.md) — Refs 0152
- [0152 — Cause Locus gates eligibility; unresolved is not out-of-scope](./0152-cause-locus-gates-eligibility.md) — Refs 0151b
- [0155 — Terminal documentation set is explicit and root-aware](./0155-terminal-documentation-set-is-explicit-and-root-aware.md)

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
- [0109a — The delegation envelope's status is reserved for dispatch outcomes; check verdicts travel only in the output payload](./0109a-delegation-envelope-status-reserved-for-dispatch-outcomes.md)
- [0121a — The active review check is a sticky chat-scoped reference selected once at loop start](./0121a-active-review-check-sticky-reference-selected-at-loop-start.md)
- [0122 — The in-progress state is render-only: setting, advancing, or resolving it never marks or clears an item](./0122-in-progress-state-is-render-only.md)
- [0123a — Closure State is conversation-only and has exactly three lifecycle values](./0123a-closure-state-is-conversation-only-and-has-three-lifecycle-values.md)
- [0124a — Active exploration uses question-first closure and repeatable reminders without repeating readiness](./0124a-question-first-closure-repeats-without-repeating-readiness.md)
- [0133a — Budget dispatch literals resolve through collision-safe harness-managed roles](./0133a-budget-dispatch-literals-resolve-through-collision-safe-harness-managed-roles.md)
- [0134b — Every review-loop turn re-enters except for two complementary closing choices](./0134b-every-review-loop-turn-reenters-except-two-closing-choices.md)
- [0135b — Review findings encoding and loop navigation are separate surfaces](./0135b-review-findings-encoding-and-loop-navigation-are-separate-surfaces.md)
- [0137a — The Review Engine input boundary is navigation-free](./0137a-review-engine-input-boundary-is-navigation-free.md)
- [0138 — Cap exhaustion continues after the last round's findings](./0138-cap-exhaustion-continues-after-last-round-findings.md)
- [0139 — Supervised review edits remain worker-owned](./0139-supervised-review-edits-remain-worker-owned.md) — Refs adr:0139a
- [0142b — The budget-explorer filesystem boundary starts at the harness project root](./0142b-budget-explorer-filesystem-boundary-starts-at-project-root.md)
- [0143b — Out-of-root budget-explorer access is concrete and purpose-bound](./0143b-budget-explorer-out-of-root-access-is-purpose-bound.md)
- [0144b — Self-discovered external needs use structured escalation records](./0144b-budget-explorer-self-discovered-needs-use-structured-escalation.md)
- [0145b — The budget-explorer tool-call ceiling resets for each execution segment](./0145b-budget-explorer-tool-call-ceiling-resets-per-segment.md)
- [0150 — Gate mode is parameterized at the fetch site, never detected from invocation context](./0150-mode-parameterized-at-fetch-site-not-detected.md) — **Amends** adr:0028
| [0151a — Phase-navigation-only questions are not genuine idea uncertainty](./0151a-phase-navigation-only-questions-are-not-genuine-idea-uncertainty.md) — Refs 0124a
| [0151c — External Explore findings block is the only `review` progress evidence](./0151c-external-findings-block-is-only-review-evidence.md) — **Amends** 0133b, Refs adr:0158c
- [0156 — Fast-lane artifacts follow implementation](./0156-fast-lane-artifacts-follow-implementation.md) — Refs adr:0172
- [0157 — Fast-lane validation and mutation stay in separate actors](./0157-fast-lane-validation-and-mutation-stay-in-separate-actors.md) — Refs adr:0172
- [0158 — The autofast implementer receives only the crystallized block](./0158-autofast-implementer-receives-only-the-block.md)
- [0159 — Fast-lane selection consent pre-authorizes exactly one local commit](./0159-fast-lane-selection-pre-authorizes-one-local-commit.md) — Refs 0157, Refs 0052

### `/sai-backfill`

- [0008 — sai-backfill Does Not Generate design.md, tasks.md, or implementation.md](./0008-backfill-prohibited-design-artifacts.md) — Refs adr:0007
- [0142a — Backfill intent remains ephemeral and subordinate to verified diff evidence](./0142a-intent-remains-ephemeral-and-subordinate-to-diff-evidence.md)
- [0143a — Intent reconciliation uses ordered classification and bounded gap questions](./0143a-ordered-intent-classification-and-bounded-gap-questions.md)
- [0144a — Backfill conflict scanning receives intent context only when usable](./0144a-conditional-intent-context-for-backfill-conflict-scanning.md)
- [0145a — Backfill `created` metadata uses a date-only value](./0145a-backfill-created-metadata-is-date-only.md)

### `/sai-commit`

- [0041 — Uniform three-option commit gate across apply.md and commit.md](./0041-uniform-three-option-gate.md)
- [0042 — Reconcile the "ask every time" authorization principle atomically at the principle layer](./0042-reconcile-authorization-principle-atomically.md)

### `/sai-status`


### `npx shared-ai` (install / setup / uninstall / doctor)

- [0109d — Doctor's opencode agent census derives from manifest-projected agent files, with the binding-to-projection alignment desync an explicit open gap](./0109d-doctor-census-over-manifest-projected-files.md)
- [0119 — Outcome-token completion contract with command-boundary mapping](./0119-outcome-token-completion-contract-with-command-boundary-mapping.md)
- [0120 — Readline lifecycle owned by setup orchestration, closed once at the settle point](./0120-readline-lifecycle-owned-by-setup-orchestration.md)
- [0121b — The post-setup customization result stays in memory and never touches agent files](./0121b-in-memory-non-persistent-override-contract.md)
- [0123b — Retirement records cover every distinct historical content variant, enumerated from git history at implementation time](./0123b-retirement-records-cover-every-historical-content-variant.md)
- [0125b — Existing project-local agent content takes precedence over installed availability](./0125b-existing-project-local-agent-content-takes-precedence.md)
- [0126 — Archive only after requirement-level survival review](./0126-archive-only-after-requirement-level-survival-review.md)
- [0127 — Archived specs preserve their pre-archival bytes](./0127-archived-specs-preserve-pre-archival-bytes.md)

### Harness wrappers & the shared instruction layer

- [0117a — Fetch resolution replaces the Glob existence probe with Read-then-Read exact-path fallback](./0117a-fetch-resolution-read-then-read-exact-path-fallback.md)
- [0118a — Every resolved fetch path begins with `sai/`, `commands/`, or `skills/` and the harness root is never named](./0118a-fetch-path-scope-invariant.md)
- [0129 — Routed and utility command-card classes](./0129-routed-and-utility-command-card-classes.md)
- [0133a — Budget dispatch literals resolve through collision-safe harness-managed roles](./0133a-budget-dispatch-literals-resolve-through-collision-safe-harness-managed-roles.md)
- [0133b — Review progress is marked only by no-High pass evidence](./0133b-review-progress-is-evidence-only.md) — Refs 0109c, Refs 0110, Refs 0111
- [0134a — Automatic planning review has two distinct bounded counters](./0134a-automatic-review-has-two-distinct-counters.md) — Refs 0133b
- [0135a — An empty spec reference set still yields a full review pass](./0135a-empty-spec-reference-set-is-a-full-review-pass.md) — Refs 0133b, Refs 0134a
- [0142b — The budget-explorer filesystem boundary starts at the harness project root](./0142b-budget-explorer-filesystem-boundary-starts-at-project-root.md)
- [0143b — Out-of-root budget-explorer access is concrete and purpose-bound](./0143b-budget-explorer-out-of-root-access-is-purpose-bound.md)
- [0144b — Self-discovered external needs use structured escalation records](./0144b-budget-explorer-self-discovered-needs-use-structured-escalation.md)
- [0145b — The budget-explorer tool-call ceiling resets for each execution segment](./0145b-budget-explorer-tool-call-ceiling-resets-per-segment.md)
- [0149 — The Orchestration Core contracts live under `sai/orchestration/`](./0149-orchestration-core-contracts-live-under-orchestration.md) — Supersedes 0128

---

## Cross-cutting categories

- [0109c — Progress plans are declared, canonical, and immutable; the coordinator renders and marks only](./0109c-declared-canonical-immutable-progress-plan.md)
- [0110 — Progress reporting is additive and nonterminal; a run closes with exactly one terminal status](./0110-additive-nonterminal-progress-event.md)
- [0111 — Rendered progress state is a pure function of the declared plan order plus the marked set](./0111-rendered-progress-state-pure-function.md)
- [0114 — The dispatch envelope is exactly two strings; progress-plan content never travels in it](./0114-progress-plan-never-transported-in-envelope.md)
- [0115 — The implementation plan's step identity is its `#### Step N:` H4-with-colon heading](./0115-implementation-step-identity-is-h4-heading.md)
- [0119 — Outcome-token completion contract with command-boundary mapping](./0119-outcome-token-completion-contract-with-command-boundary-mapping.md)
- [0120 — Readline lifecycle owned by setup orchestration, closed once at the settle point](./0120-readline-lifecycle-owned-by-setup-orchestration.md)
- [0121b — The post-setup customization result stays in memory and never touches agent files](./0121b-in-memory-non-persistent-override-contract.md)
- [0123b — Retirement records cover every distinct historical content variant, enumerated from git history at implementation time](./0123b-retirement-records-cover-every-historical-content-variant.md)
- [0125b — Existing project-local agent content takes precedence over installed availability](./0125b-existing-project-local-agent-content-takes-precedence.md)
- [0129 — Routed and utility command-card classes](./0129-routed-and-utility-command-card-classes.md)
- [0134c — Recovery retains the live worker and one shared attempt pool](./0134c-recovery-retains-live-worker-and-one-shared-pool.md)
- [0135c — Failure classification identifies the repair boundary](./0135c-failure-classification-identifies-the-repair-boundary.md)
- [0136 — The overview generator envelope remains a closed five-field contract](./0136-overview-generator-envelope-remains-five-field.md)
- [0137b — The apply routed boundary carries progress events against immutable dispatch-local plans](./0137b-apply-routed-boundary-carries-progress-events.md) — Supersedes 0116
- [0138 — Cap exhaustion continues after the last round's findings](./0138-cap-exhaustion-continues-after-last-round-findings.md)
- [0139 — Supervised review edits remain worker-owned](./0139-supervised-review-edits-remain-worker-owned.md) — Refs adr:0139a
- [0140 — Every closed worker payload carries a worker-authored `emitted_on`](./0140-closed-worker-payloads-carry-result-emission-time.md) — Refs 0110
- [0141 — The milestone stamp is closure-only and derived from `emitted_on`, never from a coordinator clock](./0141-milestone-stamp-is-closure-only-and-derived-from-emitted-on.md) — Refs 0140, Refs 0112, Refs adr:0144
- [0146 — Stable planning progress ids remain compatibility keys while labels become user-facing](./0146-stable-planning-progress-ids-preserve-compatibility.md)
- [0147 — Structured spec research closes at the shared confidence boundary before proposal generation](./0147-spec-research-closes-at-confidence-boundary.md)
- [0149 — The Orchestration Core contracts live under `sai/orchestration/`](./0149-orchestration-core-contracts-live-under-orchestration.md) — Supersedes 0128
- [0151b — Three mutually exclusive routing diagnoses, separate from worker failure classes](./0151b-three-mutually-exclusive-routing-diagnoses.md) — Refs 0152
- [0152 — Cause Locus gates eligibility; unresolved is not out-of-scope](./0152-cause-locus-gates-eligibility.md) — Refs 0151b
- [0155 — Terminal documentation set is explicit and root-aware](./0155-terminal-documentation-set-is-explicit-and-root-aware.md)

### Fetch resolution & path conventions

- [0117a — Fetch resolution replaces the Glob existence probe with Read-then-Read exact-path fallback](./0117a-fetch-resolution-read-then-read-exact-path-fallback.md)
- [0118a — Every resolved fetch path begins with `sai/`, `commands/`, or `skills/` and the harness root is never named](./0118a-fetch-path-scope-invariant.md)

### Harness portability & mirror discipline

- [0112 — Task-list semantics are harness-neutral and single-sourced; below three declared steps no list renders](./0112-neutral-task-list-policy-single-source.md)
- [0142b — The budget-explorer filesystem boundary starts at the harness project root](./0142b-budget-explorer-filesystem-boundary-starts-at-project-root.md)
- [0143b — Out-of-root budget-explorer access is concrete and purpose-bound](./0143b-budget-explorer-out-of-root-access-is-purpose-bound.md)
- [0144b — Self-discovered external needs use structured escalation records](./0144b-budget-explorer-self-discovered-needs-use-structured-escalation.md)
- [0145b — The budget-explorer tool-call ceiling resets for each execution segment](./0145b-budget-explorer-tool-call-ceiling-resets-per-segment.md)


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
- [0109a — The delegation envelope's status is reserved for dispatch outcomes; check verdicts travel only in the output payload](./0109a-delegation-envelope-status-reserved-for-dispatch-outcomes.md)
- [0113 — The task-list tool call originates exclusively from the coordinator session, never from a worker subagent](./0113-todowrite-emission-coordinator-only.md)
- [0133a — Budget dispatch literals resolve through collision-safe harness-managed roles](./0133a-budget-dispatch-literals-resolve-through-collision-safe-harness-managed-roles.md)
- [0142b — The budget-explorer filesystem boundary starts at the harness project root](./0142b-budget-explorer-filesystem-boundary-starts-at-project-root.md)
- [0143b — Out-of-root budget-explorer access is concrete and purpose-bound](./0143b-budget-explorer-out-of-root-access-is-purpose-bound.md)
- [0144 — Self-discovered external needs use structured escalation records](./0144b-budget-explorer-self-discovered-needs-use-structured-escalation.md)
- [0144a — Backfill conflict scanning receives intent context only when usable](./0144a-conditional-intent-context-for-backfill-conflict-scanning.md)
- [0145b — The budget-explorer tool-call ceiling resets for each execution segment](./0145b-budget-explorer-tool-call-ceiling-resets-per-segment.md)

### Testability routing & RED → GREEN

- [0109b — "Testable" (RED block) and "divisible" (production surface) are distinct Step properties](./0109b-testable-and-divisible-are-distinct-step-properties.md) — Refs adr:0115

### The `interfaces.md` contract

- [0117b — Target State relocates into design.md as the persisted authoritative snapshot](./0117b-target-state-relocates-into-design-md-as-the-persisted-authoritative-snapshot.md)

### Gates, decision summaries & feedback loops

- [0014 — Decision summary derived exclusively from written artifacts](./0014-decision-summary-derived-from-artifacts-only.md)
- [0143a — Intent reconciliation uses ordered classification and bounded gap questions](./0143a-ordered-intent-classification-and-bounded-gap-questions.md)
- [0148 — Specs approval remains folded into design prerequisite resolution](./0148-specs-approval-remains-folded-into-design-prerequisites.md)

### Explore crystallization & the review loop

- [0053 — Post-crystallization review loop fires once per turn, after the final `Ready to Propose` block](./0053-post-crystallization-review-once-per-turn.md)
- [0060 — The post-crystallization review loop's explicit trigger is the hyphenated literal token `review-loop`](./0060-review-loop-is-a-hyphenated-literal-token.md) — Pair with 0061, Refs 0053, Refs adr:0058
- [0061 — An artifact-review turn naming a tracked crystallized change is served first and then offered the loop, never rerouted into it](./0061-item-3-precedence-is-additive-not-a-reroute.md) — Pair with 0060, Refs 0053, Refs adr:0054
- [0068 — Scope provenance to item-5 single-change block; defer item-6 sliced blocks](./0068-scope-item-5-defer-sliced.md)
- [0094 — Supervised auto-answer confidence is a qualitative judgment gated by an objective grounding floor](./0094-qualitative-confidence-with-grounding-floor.md) — Pair with 0095
- [0095 — Auto-answer grounding sources are bounded and exclude the explore conversation](./0095-bounded-grounding-sources-exclude-conversation.md) — Pair with 0094
- [0105 — Severity-prefixed identifiers for artifact review findings](./0105-severity-prefixed-identifiers-for-artifact-review-findings.md)
- [0121a — The active review check is a sticky chat-scoped reference selected once at loop start](./0121a-active-review-check-sticky-reference-selected-at-loop-start.md)
- [0122 — The in-progress state is render-only: setting, advancing, or resolving it never marks or clears an item](./0122-in-progress-state-is-render-only.md)
- [0123a — Closure State is conversation-only and has exactly three lifecycle values](./0123a-closure-state-is-conversation-only-and-has-three-lifecycle-values.md)
- [0124a — Active exploration uses question-first closure and repeatable reminders without repeating readiness](./0124a-question-first-closure-repeats-without-repeating-readiness.md)
- [0134b — Every review-loop turn re-enters except for two complementary closing choices](./0134b-every-review-loop-turn-reenters-except-two-closing-choices.md)
- [0135b — Review findings encoding and loop navigation are separate surfaces](./0135b-review-findings-encoding-and-loop-navigation-are-separate-surfaces.md)
- [0137a — The Review Engine input boundary is navigation-free](./0137a-review-engine-input-boundary-is-navigation-free.md)
- [0151c — External Explore findings block is the only `review` progress evidence](./0151c-external-findings-block-is-only-review-evidence.md) — **Amends** 0133b, Refs adr:0158c

### Artifact metadata & routing tokens

- [0067 — Handoff provenance consumption as "premise to confirm and extend"](./0067-confirm-extend-consumption-framing.md)
- [0072 — Numeric complexity thresholds calibrated from an archive survey](./0072-complexity-thresholds-calibrated-from-archive-survey.md) — Refs adr:0069, Refs adr:0070
- [0118b — Every generation is a recoverable two-phase transition with a persisted overview.state key](./0118b-every-generation-is-a-recoverable-two-phase-transition-with-a-persisted-overview-state-key.md)
- [0142a — Backfill intent remains ephemeral and subordinate to verified diff evidence](./0142a-intent-remains-ephemeral-and-subordinate-to-diff-evidence.md)
- [0145a — Backfill `created` metadata uses a date-only value](./0145a-backfill-created-metadata-is-date-only.md)

### Installer dependency policy & external tooling

- [0109d — Doctor's opencode agent census derives from manifest-projected agent files, with the binding-to-projection alignment desync an explicit open gap](./0109d-doctor-census-over-manifest-projected-files.md)

---

## DDRs that extend or correct prior ones

| DDR | Action | Over |
|---|---|---|
| [0062](./0062-field-9-soft-degradation-stated-at-two-sites.md) | amends | [0026](./0026-stable-eight-field-report.md) |
| [0137b](./0137b-apply-routed-boundary-carries-progress-events.md) | supersedes | [0116](./0116-apply-phase-carries-no-progress-events.md) |
| [0141](./0141-milestone-stamp-is-closure-only-and-derived-from-emitted-on.md) | supersedes | [adr:0118a](../adr/0118a-per-harness-wall-clock-commands-in-bindings.md) |
| [0149](./0149-orchestration-core-contracts-live-under-orchestration.md) | supersedes | [0128](./0128-neutral-root-protocols-and-command-cards.md) |
| [0150](./0150-mode-parameterized-at-fetch-site-not-detected.md) | amends | [0028](../adr/0028-gate-parameters-inline-at-fetch-site.md) |
| [0151c](./0151c-external-findings-block-is-only-review-evidence.md) | amends | [0133b](./0133b-review-progress-is-evidence-only.md) |

## Superseded DDRs (historical)

- [0116 — The apply phase carries no progress events because it has no coordinator-worker boundary](./0116-apply-phase-carries-no-progress-events.md) — Refs 0110 — *Superseded by [0137b](./0137b-apply-routed-boundary-carries-progress-events.md)*
- [0128 — Neutral root protocols and command cards](./0128-neutral-root-protocols-and-command-cards.md) — *Superseded by [0149](./0149-orchestration-core-contracts-live-under-orchestration.md)* — placement rule only; its harness-neutral, phase-agnostic protocol decision remains in force
