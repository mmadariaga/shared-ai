# ADR Index

This index groups the ADRs in `docs/adr/` by **command** and by **cross-cutting category**. An ADR may appear in more than one category: the filesystem already lists them alphabetically; the value here is the relational map (amends, supersedes, sibling pairs, refs).

## Conventions

- Each entry references the ADR by its original title (as it appears in the file).
- *Note* indicates a relationship using pinned entry-line token forms: `— Pair with NNNN`, `— Refs NNNN`, `— **Amends** NNNN`, `— **Reframes** NNNN`, `— **Reverses** NNNN`, `— Supersedes NNNN`.
- *Superseded* marks ADRs whose decision was replaced; the content remains historically accurate.
- The cold build is the sole branch that recomputes global structural thresholds: a cross-cutting category appears as its own `### ` subsection only when ≥2 ADRs reference it; fewer than 8 cross-cutting ADRs collapse to a single list; the 8–12 target subsection count is a cold-build-time recomputation. The warm path does NOT recompute these — minor category/threshold drift between cold builds is accepted.

---

## By command

### `/sai-1-spec`

- [0015 — Decision summary precedes the completion sentinel](./0015-decision-summary-precedes-completion-sentinel.md) — **Amends** ddr:0014
- [0028 — The feedback gate takes three named parameters supplied inline at the fetch site](./0028-gate-parameters-inline-at-fetch-site.md)
- [0066 — Provenance as inline citations on existing Why / Decisions & Rationale fields — no new field](./0066-inline-provenance-no-new-field.md)
- [0093 — Route spec through workers while Copilot remains inline](./0093-route-spec-through-workers-while-copilot-remains-inline.md) — Refs 0082, Refs 0083, Refs 0090, Refs 0092
- [0144 — The three planning-phase coordinators drop the scoped `Bash(date:*)` entry](./0144-planning-coordinators-drop-the-scoped-date-shell-entry.md) — Supersedes 0117, Refs 0118, Refs ddr:0141
- [0145 — Routed coordinators receive panel tools with non-blocking runtime degradation](./0145-routed-coordinators-receive-panel-tools-with-non-blocking-runtime-degradation.md) — Refs 0117, Refs 0144
- [0139 — Use fresh read-only reviewers with worker-owned artifact edits](./0139-fresh-read-only-reviewers-with-worker-owned-edits.md) — Refs ddr:0105
### `/sai-2-design`

- [0015 — Decision summary precedes the completion sentinel](./0015-decision-summary-precedes-completion-sentinel.md) — **Amends** ddr:0014
- [0022 — interfaces.md is a standalone, step-keyed artifact rather than a section of tasks.md](./0022-interfaces-artifact-standalone-file.md)
- [0023 — interfaces.md is an optional soft dependency, not a schema hard requirement](./0023-interfaces-soft-dependency.md)
- [0028 — The feedback gate takes three named parameters supplied inline at the fetch site](./0028-gate-parameters-inline-at-fetch-site.md)
- [0046 — Single-object amendment audit with overwrite-latest semantics](./0046-single-object-amendment-audit.md)
- [0047 — Keep the amendment path distinct from the artifact-feedback-gate](./0047-amendment-path-distinct-from-feedback-gate.md) — Refs 0028
- [0069 — Test Command is a sibling field of Implementation Context, outside the Conventions bullet quota](./0069-test-command-sibling-field-outside-conventions-quota.md)
- [0070 — Test Command carries the project's parameterised scoping idiom, not a bare suite command](./0070-test-command-carries-parameterised-scoping-idiom.md)
- [0078 — Design workflow selects routed or inline entry](./0078-design-workflow-selects-routed-or-inline-entry.md) — Refs 0074, Refs 0035
- [0079 — Design worker notices and reconstruction metadata](./0079-design-worker-notices-and-reconstruction-metadata.md) — Refs 0075, Refs 0076
- [0081 — Name shared orchestration contracts explicitly](./0081-name-shared-orchestration-contracts-explicitly.md) — Refs 0004, Refs 0075
- [0082 — Keep canonical phase workers and bindings in mirrored orchestration subtrees](./0082-canonical-phase-workers-and-mirrored-bindings.md) — Refs 0077, Refs 0078
- [0083 — Extract shared coordinator mechanics through phase adapters](./0083-shared-coordinator-mechanics-through-phase-adapters.md) — Refs 0075, Refs 0076, Refs 0079, Refs 0080
- [0086 — Separate worker write journals from the coordinator changed-file union](./0086-worker-journals-and-coordinator-union.md) — Refs 0075, Refs 0076
- [0087 — Implementation phase adapter and durable verification](./0087-implementation-phase-adapter-and-durable-verification.md) — Refs 0083, Refs 0086
- [0090 — Centralize Copilot inline planning lifecycle in one adapter](./0090-centralize-copilot-inline-planning-lifecycle.md) — Refs 0089, Refs 0083, Refs 0078, Refs 0074
- [0092 — Group planning assets by phase without changing harness routing](./0092-group-planning-assets-by-phase-without-changing-harness-routing.md) — Refs 0082, Refs 0088, Refs 0090
- [0108 — Tasks files-affected entries carry a closed four-letter change-type vocabulary](./0108-tasks-files-affected-change-type-vocabulary.md)
- [0109 — R change-type entry is a single move entry, never a delete-plus-add pair](./0109-r-change-type-single-move-entry.md) — Refs 0108
- [0111 — design.md records the resolved record family as a pinned marker that Step 3 reads](./0111-record-family-marker-in-design.md)
- [0144 — The three planning-phase coordinators drop the scoped `Bash(date:*)` entry](./0144-planning-coordinators-drop-the-scoped-date-shell-entry.md) — Supersedes 0117, Refs 0118, Refs ddr:0141
- [0145 — Routed coordinators receive panel tools with non-blocking runtime degradation](./0145-routed-coordinators-receive-panel-tools-with-non-blocking-runtime-degradation.md) — Refs 0117, Refs 0144
- [0139 — Use fresh read-only reviewers with worker-owned artifact edits](./0139-fresh-read-only-reviewers-with-worker-owned-edits.md) — Refs ddr:0105

### `/sai-3-implement`

- [0023 — interfaces.md is an optional soft dependency, not a schema hard requirement](./0023-interfaces-soft-dependency.md)
- [0064 — Instruction-file-only Steps are classified non-testable](./0064-instruction-only-steps-classified-non-testable.md)
- [0074 — Harness wrappers select coordinator or inline implementation planning](./0074-harness-wrappers-select-coordinator-or-inline-implementation-planning.md) — Refs 0035
- [0075 — Normalize coordinator-worker exchange around an invocation envelope and lifecycle payload](./0075-normalized-invocation-envelope-and-lifecycle-payload.md) — Pair with 0076
- [0076 — Resume the current planning worker before reconstructing from durable artifacts](./0076-resume-worker-before-durable-reconstruction.md) — Pair with 0075
- [0077 — Keep model and continuation mechanics in harness-specific worker bindings](./0077-harness-specific-worker-bindings.md) — Refs 0074, Refs 0075, Refs 0076
- [0081 — Name shared orchestration contracts explicitly](./0081-name-shared-orchestration-contracts-explicitly.md) — Refs 0004, Refs 0075
- [0082 — Keep canonical phase workers and bindings in mirrored orchestration subtrees](./0082-canonical-phase-workers-and-mirrored-bindings.md) — Refs 0077, Refs 0078
- [0083 — Extract shared coordinator mechanics through phase adapters](./0083-shared-coordinator-mechanics-through-phase-adapters.md) — Refs 0075, Refs 0076, Refs 0079, Refs 0080
- [0086 — Separate worker write journals from the coordinator changed-file union](./0086-worker-journals-and-coordinator-union.md) — Refs 0075, Refs 0076
- [0089 — Share one routed SAI coordinator profile across planning phases](./0089-shared-sai-coordinator-profile.md) — Refs 0083, Refs 0074, Refs 0078
- [0090 — Centralize Copilot inline planning lifecycle in one adapter](./0090-centralize-copilot-inline-planning-lifecycle.md) — Refs 0089, Refs 0083, Refs 0078, Refs 0074
- [0092 — Group planning assets by phase without changing harness routing](./0092-group-planning-assets-by-phase-without-changing-harness-routing.md) — Refs 0082, Refs 0088, Refs 0090
- [0099 — Terminal routing failure and explicit fresh dispatch](./0099-terminal-routing-failure-and-explicit-fresh-dispatch.md) — Refs 0075, Refs 0076, Refs 0086
- [0105 — Two-stage verification for the audit-derived-step append](./0105-two-stage-audit-append-verification.md) — Refs ddr:0021, Refs 0087
- [0106 — Run-path baseline predicate for the audit-append check](./0106-run-path-baseline-predicate.md) — Pair with 0105
- [0107 — ADR creation decision gets its own capability](./0107-adr-creation-decision-capability.md)
- [0108 — Tasks files-affected entries carry a closed four-letter change-type vocabulary](./0108-tasks-files-affected-change-type-vocabulary.md)
- [0110 — Extract the decision-record index machinery into an abstract capability with spec-pinned framework values](./0110-extract-decision-record-index-machinery-abstract-capability.md)
- [0111 — design.md records the resolved record family as a pinned marker that Step 3 reads](./0111-record-family-marker-in-design.md)
- [0112 — DDR is instantiated as a first-class family with the five per-index bindings](./0112-ddr-family-first-class-instantiation.md)
- [0113 — Index maintenance runs one cycle per family that received records in the run](./0113-per-family-index-maintenance-cycles.md)
- [0114 — A sibling DDR index template mirrors the ADR index template instance for instance](./0114-sibling-ddr-index-template.md)
- [0144 — The three planning-phase coordinators drop the scoped `Bash(date:*)` entry](./0144-planning-coordinators-drop-the-scoped-date-shell-entry.md) — Supersedes 0117, Refs 0118, Refs ddr:0141
- [0131 — Keep OpenCode budget skills behind canonical behavior policies](./0131-canonicalize-opencode-budget-skill-behavior.md)
- [0132 — Reconcile the executor capability at the canonical Fetch boundary](./0132-reconcile-executor-capability-at-fetch-boundary.md)
- [0137 — Change Overview preserves the generation lifecycle and write boundary](./0137-change-overview-preserves-generation-lifecycle-and-write-boundary.md)
- [0139 — Use fresh read-only reviewers with worker-owned artifact edits](./0139-fresh-read-only-reviewers-with-worker-owned-edits.md) — Refs ddr:0105
- [0139 — Use a presence-only policy for bounded worker recovery](./0139-presence-only-bounded-recovery-policy.md)

### `/sai-4-apply`

- [0005 — Verbatim Extraction of Commit Rules into commit-rules.md](./0005-verbatim-extraction-of-commit-rules.md) — Refs 0006
- [0006 — Load commit-rules at Git Operations Section Header in apply.md](./0006-commit-rules-fetch-placement-in-apply.md) — Refs 0005
- [0017 — Same-model Step-execution dispatch via omitted `model:` parameter](./0017-same-model-dispatch-via-omitted-model-param.md)
- [0018 — Per-Step checkbox override scoped locally to apply.md, not remember.md](./0018-checkbox-override-scoped-to-apply-not-remember.md)
- [0019 — Fixed gate ordering after a Step-execution subagent's report](./0019-coordinator-gate-ordering-after-subagent-report.md)
- [0020 — Ephemeral in-context technical-learnings memory for the apply coordinator](./0020-ephemeral-in-context-technical-learnings-memory.md) — Refs 0019
- [0025 — Blind test-writer receives injected context; implementation dispatch is barred from test files](./0025-blind-test-writer-impl-test-prohibition.md)
- [0040 — Session-scoped commit authorization lives in in-conversation working memory only](./0040-session-auth-in-memory-only.md)
- [0044 — Preview committed-files block from intended add-list instead of git index](./0044-preview-committed-block-from-add-list-not-index.md)
- [0045 — Pin staged file set to previewed add-list with deferred timing preserved](./0045-pin-staged-set-to-previewed-add-list.md) — Pair with 0044
- [0059 — The fast-track branch auto-stay rule lives in `apply.md`, not in the `implement.md` Prerequisites template](./0059-fast-track-auto-stay-branch-rule-in-apply.md) — Pair with 0052
- [0064 — Instruction-file-only Steps are classified non-testable](./0064-instruction-only-steps-classified-non-testable.md)
- [0070 — Test Command carries the project's parameterised scoping idiom, not a bare suite command](./0070-test-command-carries-parameterised-scoping-idiom.md)
- [0073 — The durable channel was always the deviations appendix, not the learnings memory](./0073-durable-channel-is-the-deviations-appendix.md) — **Reframes** 0020
- [0108 — Tasks files-affected entries carry a closed four-letter change-type vocabulary](./0108-tasks-files-affected-change-type-vocabulary.md)
- [0109 — R change-type entry is a single move entry, never a delete-plus-add pair](./0109-r-change-type-single-move-entry.md) — Refs 0108
- [0115 — Three-part dispatch-routing condition (RED block, Step Contract, AND production surface)](./0115-three-part-dispatch-routing-condition.md) — Supersedes 0071
- [0145 — Routed coordinators receive panel tools with non-blocking runtime degradation](./0145-routed-coordinators-receive-panel-tools-with-non-blocking-runtime-degradation.md) — Refs 0117, Refs 0144

### `/sai-5-review`

- [0012 — Mutation Analysis (pass 11) as a dedicated protocol section in review.md](./0012-mutation-analysis-as-dedicated-protocol-section.md)
- [0096 — Fail closed when dispatching owned worker sidecars](./0096-fail-closed-owned-worker-owner-dispatch.md) — Refs 0084, Refs 0085
- [0106 — Keep both report template families with pinned skeleton parity](./0106-keep-both-report-template-families-pinned-parity.md)
- [0107 — Unified audit severity vocabulary across the four report surfaces](./0107-unified-audit-severity-vocabulary.md) — Supersedes 0013

### `/sai-6-security`

- [0106 — Keep both report template families with pinned skeleton parity](./0106-keep-both-report-template-families-pinned-parity.md)
- [0107 — Unified audit severity vocabulary across the four report surfaces](./0107-unified-audit-severity-vocabulary.md) — Supersedes 0013

### `/sai-7-performance`

- [0097 — Route performance by continuation capability](./0097-route-performance-by-continuation-capability.md) — Refs 0082, Refs 0083, Refs 0093
- [0106 — Keep both report template families with pinned skeleton parity](./0106-keep-both-report-template-families-pinned-parity.md)
- [0107 — Unified audit severity vocabulary across the four report surfaces](./0107-unified-audit-severity-vocabulary.md) — Supersedes 0013

### `/sai-8-accessibility`

- [0106 — Keep both report template families with pinned skeleton parity](./0106-keep-both-report-template-families-pinned-parity.md)
- [0107 — Unified audit severity vocabulary across the four report surfaces](./0107-unified-audit-severity-vocabulary.md) — Supersedes 0013

### `/sai-explore`

- [0038 — Shared unnumbered "Emission gate" subsection at the §4→§5 seam in `explore.md`](./0038-shared-unnumbered-emission-gate-subsection.md)
- [0039 — Align baseline `explore-*` spec emission-timing language via MODIFIED deltas](./0039-align-explore-spec-emission-timing-language.md) — Pair with 0038
- [0043 — Append crystallization language gate as item 8; do not renumber items 1–7 in `explore.md`](./0043-append-crystallization-gate-as-item-8.md) — Refs 0038
- [0054 — Reuse item 3's path-keyed Persistence rule for post-crystallization review-loop re-asks](./0054-reuse-item-3-persistence-rule-for-review-loop.md)
- [0058 — The explore/feedback gate UX tweaks are expressed as deltas against the existing capabilities, not a new combined capability](./0058-gate-ux-tweaks-as-deltas-against-existing-capabilities.md) — **Reframes** ddr:0053
- [0066 — Provenance as inline citations on existing Why / Decisions & Rationale fields — no new field](./0066-inline-provenance-no-new-field.md)
- [0116 — The idea progress list is expressed entirely in `sai/instructions/explore.md` — the sole edit target](./0116-idea-progress-list-expressed-in-explore-md.md)
- [0122 — The findings block is the loop's sole output and handoff payload](./0122-findings-block-is-the-loops-sole-output-and-handoff-payload.md) — Refs 0058, Refs ddr:0060
- [0123 — Handed-off findings route to the design worker; the loop never applies, forwards, or regenerates](./0123-handed-off-findings-route-to-the-design-worker.md) — Refs 0047, Refs ddr:0060
- [0127 — Keep one ordered edge-case list and partition it at sliced handoff](./0127-whole-idea-edge-cases-are-partitioned-at-sliced-handoff.md)
- [0137 — Put non-worker idea-list glue at the harness adapter seam](./0137-non-worker-idea-list-glue-at-harness-adapter-seam.md) — Refs 0077, Refs 0088, Refs 0116
- [0137 — The stage-advancement token is the literal next-step](./0137-stage-advancement-token-literal-next-step.md)
- [0140 — Active review-loop exit reuses the existing token matcher](./0140-active-review-loop-exit-reuses-existing-token-matcher.md)
- [0140 — Supervised rounds invoke the Review Engine in-session](./0140-supervised-rounds-invoke-review-engine-in-session.md) — Refs ddr:0137
- [0145 — Routed coordinators receive panel tools with non-blocking runtime degradation](./0145-routed-coordinators-receive-panel-tools-with-non-blocking-runtime-degradation.md) — Refs 0117, Refs 0144

### `/sai-backfill`

- [0007 — Diff Source for sai-backfill Selected Interactively](./0007-backfill-diff-source-interactive-selection.md) — Refs 0008

### `/sai-commit`

- [0005 — Verbatim Extraction of Commit Rules into commit-rules.md](./0005-verbatim-extraction-of-commit-rules.md) — Refs 0006
- [0040 — Session-scoped commit authorization lives in in-conversation working memory only](./0040-session-auth-in-memory-only.md)

### `/sai-status`

- [0065 — Fork `status-picker.md` from `change-picker.md` rather than parameterize the shared picker](./0065-fork-status-picker-from-change-picker.md)

### docker/orca

- [0117 — Orca AppImage is extracted at build time (no FUSE)](./0117-orca-appimage-build-time-extraction.md)
- [0118 — Dedicated non-root service user with a validate-and-fail ownership contract](./0118-orca-environment-nonroot-service-user.md)
- [0119 — Independent named volumes per state boundary with a common Orca parent](./0119-orca-environment-independent-state-volumes.md)
- [0120 — Concurrent three-child FIFO supervision for the headless Orca runtime](./0120-orca-headless-runtime-supervision.md)
- [0121 — Per-CLI launchers with a strict allowlist credential parser](./0121-orca-launcher-credential-boundary.md)

### `npx shared-ai` (install / setup / uninstall / doctor)

- [0010 — Raw readline for interactive checklist instead of npm library](./0010-readline-over-npm-for-interactive-checklist.md)
- [0011 — Regex line-level patch for config.yaml schema field instead of YAML library](./0011-regex-line-patch-over-yaml-library-for-config.md) — Refs 0010
- [0030 — Merge `opencode.json` over `opencode.jsonc` when both exist](./0030-opencode-json-over-jsonc-merge-precedence.md) — *Superseded in respect of agents; precedence continues to govern the SAI permission merge*
- [0031 — Permit declared npm dependencies in the installer (jsonc-parser)](./0031-permit-declared-npm-dependencies-in-installer.md) — **Amends** 0010, **Amends** 0011
- [0032 — Installer may execute an external installer](./0032-installer-may-execute-external-installer.md) — Refs 0031
- [0036 — Bundle CodeGraph CLI install and MCP wiring into a single boolean-returning runner](./0036-codegraph-install-bundled-runner-boolean.md)
- [0037 — `setup.js` imports the shared CodeGraph offer directly from `install-flow.js`](./0037-setup-imports-install-flow-directly.md)
- [0055 — Re-derive the uninstall deletion set and verify symmetry by test](./0055-re-derive-uninstall-deletion-set-verify-by-test.md)
- [0056 — The doctor's "fresh repo from main" is its own npx-bundled checkout](./0056-doctor-fresh-repo-is-npx-bundled-checkout.md) — Refs 0057
- [0057 — The doctor reuses uninstall-flow's enumeration as the install-graph source of truth](./0057-doctor-reuses-uninstall-enumeration-as-install-graph.md) — Refs 0055
- [0077 — Keep model and continuation mechanics in harness-specific worker bindings](./0077-harness-specific-worker-bindings.md) — Refs 0074, Refs 0075, Refs 0076
- [0084 — Use a hybrid declarative installation manifest](./0084-hybrid-declarative-installation-manifest.md) — Refs 0055, Refs 0057
- [0085 — Implement declared projection strategies with generic handlers](./0085-generic-handlers-for-declared-projection-strategies.md) — Pair with 0084, Refs 0029, Refs 0055, Refs 0057
- [0088 — Implementation harness projection boundaries](./0088-implementation-harness-projection-boundaries.md) — Refs 0084, Refs 0085, Refs 0074
- [0091 — Manifest hash evidence for retired managed destinations](./0091-manifest-hash-evidence-for-retired-managed-destinations.md) — Refs 0084, Refs 0085, Refs 0055, Refs 0057
- [0096 — Fail closed when dispatching owned worker sidecars](./0096-fail-closed-owned-worker-owner-dispatch.md) — Refs 0084, Refs 0085
- [0098 — Register the performance worker through managed projections](./0098-register-performance-worker-through-managed-projections.md) — Refs 0084, Refs 0085, Refs 0096
- [0100 — Neutral installed worker-binding destinations with harness-specific sources](./0100-neutral-installed-worker-binding-destinations.md) — Refs 0077, Refs 0084, Refs 0088
- [0101 — Exact Git-blob corpus for binding retirement ownership](./0101-exact-git-blob-corpus-for-binding-retirements.md) — Refs 0091
- [0102 — Consumer-scoped preflight for routed worker contract assets](./0102-consumer-scoped-preflight-for-routed-worker-contract-assets.md) — Refs 0100
- [0103 — Retire the inline harness model in favor of two routed harnesses](./0103-retire-inline-harness-model-in-favor-of-routed-harnesses.md)
- [0104 — Remove Copilot from the active installer inventory](./0104-remove-copilot-from-active-installer-inventory.md) — Pair with 0103
- [0110 — Additive-then-retire decomposition for the tunable-seed strategy switch](./0110-additive-then-retire-decomposition-tunable-seed.md)
- [0119 — Shared raw-readline navigator engine in `bin/install-flow.js`](./0119-shared-raw-readline-navigator-engine-in-install-flow.md) — Refs 0010
- [0124 — Resolve package resources separately from project destinations](./0124-separate-package-resources-from-project-destinations.md)
- [0125 — Preserve project-local agent content with a line-oriented frontmatter patch](./0125-line-preserving-frontmatter-patching-for-project-local-agents.md)
- [0126 — Replace project-local agent files through a same-directory temporary file](./0126-atomic-replacement-for-project-local-agent-files.md)
- [0128 — Keep generic OpenCode behavior in canonical SAI policies behind Fetch wrappers](./0128-canonical-generic-opencode-behavior-behind-fetch-wrappers.md)
- [0129 — Preserve OpenCode agent frontmatter and append-only local extensions](./0129-preserve-opencode-agent-frontmatter-and-local-extensions.md)
- [0130 — Reuse the recursive SAI policy projection for generic agents](./0130-reuse-recursive-sai-policy-projection-for-generic-agents.md)
- [0134 — Materialize Worker Matrix projections from the manifest and retire by hash](./0134-materialize-worker-projections-from-the-manifest-and-retire-by-hash.md)
- [0138 — Use manifest projections plus hash-gated retirement records](./0138-manifest-projections-and-hash-gated-retirement-records.md) — Refs 0091, Refs 0101, Refs 0134, Refs ddr:0123
### Harness wrappers & the shared instruction layer

- [0001 — Separate per-harness instruction files for the sai subagent resolver](./0001-sai-separate-harness-files.md)
- [0004 — Source Layout and Install Path Restructure for sai-* Commands and Skills](./0004-source-layout-and-install-path-restructure.md) — Supersedes 0002, Supersedes 0003, Refs 0001
- [0009 — Claude-Specific Fetch Skill at skills/claude/fetch/](./0009-claude-specific-fetch-skill.md) — Refs 0003
- [0033 — Echo line format and placement](./0033-echo-line-format-and-placement.md)
- [0034 — Resolution precedence — wrapper-echo check runs first](./0034-resolution-precedence-wrapper-echo-first.md) — Pair with 0033
- [0035 — Harness-specific adapter carve-out](./0035-harness-specific-adapter-carve-out.md) — Pair with 0033
- [0048 — Single-source the `--fast-track` parse in each command's body file](./0048-single-source-fast-track-parse-in-body-file.md)
- [0049 — Fast-track flag-strip precedes change-picker; cleaned change-name is authoritative](./0049-fast-track-flag-strip-before-change-picker.md)
- [0050 — Respect each harness's native argument-surface convention for `--fast-track`](./0050-respect-harness-native-argument-surface.md)
- [0051 — Model `--fast-track` as ephemeral in-conversation state only](./0051-ephemeral-in-conversation-fast-track-state.md) — Refs 0040
- [0074 — Harness wrappers select coordinator or inline implementation planning](./0074-harness-wrappers-select-coordinator-or-inline-implementation-planning.md) — Refs 0035
- [0077 — Keep model and continuation mechanics in harness-specific worker bindings](./0077-harness-specific-worker-bindings.md) — Refs 0074, Refs 0075, Refs 0076
- [0081 — Name shared orchestration contracts explicitly](./0081-name-shared-orchestration-contracts-explicitly.md) — Refs 0004, Refs 0075
- [0082 — Keep canonical phase workers and bindings in mirrored orchestration subtrees](./0082-canonical-phase-workers-and-mirrored-bindings.md) — Refs 0077, Refs 0078
- [0083 — Extract shared coordinator mechanics through phase adapters](./0083-shared-coordinator-mechanics-through-phase-adapters.md) — Refs 0075, Refs 0076, Refs 0079, Refs 0080
- [0089 — Share one routed SAI coordinator profile across planning phases](./0089-shared-sai-coordinator-profile.md) — Refs 0083, Refs 0074, Refs 0078
- [0090 — Centralize Copilot inline planning lifecycle in one adapter](./0090-centralize-copilot-inline-planning-lifecycle.md) — Refs 0089, Refs 0083, Refs 0078, Refs 0074
- [0092 — Group planning assets by phase without changing harness routing](./0092-group-planning-assets-by-phase-without-changing-harness-routing.md) — Refs 0082, Refs 0088, Refs 0090
- [0093 — Route spec through workers while Copilot remains inline](./0093-route-spec-through-workers-while-copilot-remains-inline.md) — Refs 0082, Refs 0083, Refs 0090, Refs 0092
- [0097 — Route performance by continuation capability](./0097-route-performance-by-continuation-capability.md) — Refs 0082, Refs 0083, Refs 0093
- [0098 — Register the performance worker through managed projections](./0098-register-performance-worker-through-managed-projections.md) — Refs 0084, Refs 0085, Refs 0096
- [0099 — Terminal routing failure and explicit fresh dispatch](./0099-terminal-routing-failure-and-explicit-fresh-dispatch.md) — Refs 0075, Refs 0076, Refs 0086
- [0100 — Neutral installed worker-binding destinations with harness-specific sources](./0100-neutral-installed-worker-binding-destinations.md) — Refs 0077, Refs 0084, Refs 0088
- [0106 — Keep both report template families with pinned skeleton parity](./0106-keep-both-report-template-families-pinned-parity.md)
- [0128 — Keep generic OpenCode behavior in canonical SAI policies behind Fetch wrappers](./0128-canonical-generic-opencode-behavior-behind-fetch-wrappers.md)
- [0130 — Reuse the recursive SAI policy projection for generic agents](./0130-reuse-recursive-sai-policy-projection-for-generic-agents.md)
- [0131 — Keep OpenCode budget skills behind canonical behavior policies](./0131-canonicalize-opencode-budget-skill-behavior.md)
- [0132 — Reconcile the executor capability at the canonical Fetch boundary](./0132-reconcile-executor-capability-at-fetch-boundary.md)
- [0133 — Keep harness-native worker templates over shared dispatch syntax](./0133-harness-native-worker-templates-over-shared-dispatch-syntax.md)
- [0134 — Materialize Worker Matrix projections from the manifest and retire by hash](./0134-materialize-worker-projections-from-the-manifest-and-retire-by-hash.md)
- [0135 — One harness boot seam per supported harness](./0135-one-harness-boot-seam-per-supported-harness.md)
- [0136 — Opaque boot request and card-selection contract](./0136-opaque-boot-request-and-card-selection-contract.md)
- [0137 — Put non-worker idea-list glue at the harness adapter seam](./0137-non-worker-idea-list-glue-at-harness-adapter-seam.md) — Refs 0077, Refs 0088, Refs 0116
- [0137 — Change Overview preserves the generation lifecycle and write boundary](./0137-change-overview-preserves-generation-lifecycle-and-write-boundary.md)
- [0141 — Use one shared launcher card per in-scope command](./0141-use-one-shared-launcher-card-per-in-scope-command.md)
- [0142 — Add near-empty launchers as extension points](./0142-add-near-empty-launchers-as-extension-points.md)
- [0143 — Load the boot adapter before the launcher](./0143-load-the-boot-adapter-before-the-launcher.md)

---

## Cross-cutting categories

- [0107 — Unified audit severity vocabulary across the four report surfaces](./0107-unified-audit-severity-vocabulary.md) — Supersedes 0013
- [0110 — Additive-then-retire decomposition for the tunable-seed strategy switch](./0110-additive-then-retire-decomposition-tunable-seed.md)
- [0124 — Resolve package resources separately from project destinations](./0124-separate-package-resources-from-project-destinations.md)
- [0125 — Preserve project-local agent content with a line-oriented frontmatter patch](./0125-line-preserving-frontmatter-patching-for-project-local-agents.md)
- [0126 — Replace project-local agent files through a same-directory temporary file](./0126-atomic-replacement-for-project-local-agent-files.md)
- [0128 — Keep generic OpenCode behavior in canonical SAI policies behind Fetch wrappers](./0128-canonical-generic-opencode-behavior-behind-fetch-wrappers.md)
- [0129 — Preserve OpenCode agent frontmatter and append-only local extensions](./0129-preserve-opencode-agent-frontmatter-and-local-extensions.md)
- [0130 — Reuse the recursive SAI policy projection for generic agents](./0130-reuse-recursive-sai-policy-projection-for-generic-agents.md)
- [0131 — Keep OpenCode budget skills behind canonical behavior policies](./0131-canonicalize-opencode-budget-skill-behavior.md)
- [0132 — Reconcile the executor capability at the canonical Fetch boundary](./0132-reconcile-executor-capability-at-fetch-boundary.md)
- [0137 — Change Overview preserves the generation lifecycle and write boundary](./0137-change-overview-preserves-generation-lifecycle-and-write-boundary.md)
- [0139 — Use a presence-only policy for bounded worker recovery](./0139-presence-only-bounded-recovery-policy.md)
- [0140 — Supervised rounds invoke the Review Engine in-session](./0140-supervised-rounds-invoke-review-engine-in-session.md) — Refs ddr:0137

### Fetch resolution & path conventions

- [0004 — Source Layout and Install Path Restructure for sai-* Commands and Skills](./0004-source-layout-and-install-path-restructure.md) — Supersedes 0002, Supersedes 0003, Refs 0001
- [0009 — Claude-Specific Fetch Skill at skills/claude/fetch/](./0009-claude-specific-fetch-skill.md) — Refs 0003
- [0081 — Name shared orchestration contracts explicitly](./0081-name-shared-orchestration-contracts-explicitly.md) — Refs 0004, Refs 0075
- [0082 — Keep canonical phase workers and bindings in mirrored orchestration subtrees](./0082-canonical-phase-workers-and-mirrored-bindings.md) — Refs 0077, Refs 0078
- [0089 — Share one routed SAI coordinator profile across planning phases](./0089-shared-sai-coordinator-profile.md) — Refs 0083, Refs 0074, Refs 0078
- [0097 — Route performance by continuation capability](./0097-route-performance-by-continuation-capability.md) — Refs 0082, Refs 0083, Refs 0093
- [0092 — Group planning assets by phase without changing harness routing](./0092-group-planning-assets-by-phase-without-changing-harness-routing.md) — Refs 0082, Refs 0088, Refs 0090
- [0099 — Terminal routing failure and explicit fresh dispatch](./0099-terminal-routing-failure-and-explicit-fresh-dispatch.md) — Refs 0075, Refs 0076, Refs 0086
- [0136 — Opaque boot request and card-selection contract](./0136-opaque-boot-request-and-card-selection-contract.md)
- [0100 — Neutral installed worker-binding destinations with harness-specific sources](./0100-neutral-installed-worker-binding-destinations.md) — Refs 0077, Refs 0084, Refs 0088
- [0128 — Keep generic OpenCode behavior in canonical SAI policies behind Fetch wrappers](./0128-canonical-generic-opencode-behavior-behind-fetch-wrappers.md)
- [0130 — Reuse the recursive SAI policy projection for generic agents](./0130-reuse-recursive-sai-policy-projection-for-generic-agents.md)
- [0131 — Keep OpenCode budget skills behind canonical behavior policies](./0131-canonicalize-opencode-budget-skill-behavior.md)
- [0132 — Reconcile the executor capability at the canonical Fetch boundary](./0132-reconcile-executor-capability-at-fetch-boundary.md)
- [0137 — Put non-worker idea-list glue at the harness adapter seam](./0137-non-worker-idea-list-glue-at-harness-adapter-seam.md) — Refs 0077, Refs 0088, Refs 0116
- [0138 — Use manifest projections plus hash-gated retirement records](./0138-manifest-projections-and-hash-gated-retirement-records.md) — Refs 0091, Refs 0101, Refs 0134, Refs ddr:0123
- [0141 — Use one shared launcher card per in-scope command](./0141-use-one-shared-launcher-card-per-in-scope-command.md)
- [0142 — Add near-empty launchers as extension points](./0142-add-near-empty-launchers-as-extension-points.md)
- [0143 — Load the boot adapter before the launcher](./0143-load-the-boot-adapter-before-the-launcher.md)

### Harness portability & mirror discipline

- [0001 — Separate per-harness instruction files for the sai subagent resolver](./0001-sai-separate-harness-files.md)
- [0035 — Harness-specific adapter carve-out](./0035-harness-specific-adapter-carve-out.md) — Pair with 0033
- [0050 — Respect each harness's native argument-surface convention for `--fast-track`](./0050-respect-harness-native-argument-surface.md)
- [0074 — Harness wrappers select coordinator or inline implementation planning](./0074-harness-wrappers-select-coordinator-or-inline-implementation-planning.md) — Refs 0035
- [0077 — Keep model and continuation mechanics in harness-specific worker bindings](./0077-harness-specific-worker-bindings.md) — Refs 0074, Refs 0075, Refs 0076
- [0078 — Design workflow selects routed or inline entry](./0078-design-workflow-selects-routed-or-inline-entry.md) — Refs 0074, Refs 0035
- [0082 — Keep canonical phase workers and bindings in mirrored orchestration subtrees](./0082-canonical-phase-workers-and-mirrored-bindings.md) — Refs 0077, Refs 0078
- [0090 — Centralize Copilot inline planning lifecycle in one adapter](./0090-centralize-copilot-inline-planning-lifecycle.md) — Refs 0089, Refs 0083, Refs 0078, Refs 0074
- [0091 — Manifest hash evidence for retired managed destinations](./0091-manifest-hash-evidence-for-retired-managed-destinations.md) — Refs 0084, Refs 0085, Refs 0055, Refs 0057
- [0092 — Group planning assets by phase without changing harness routing](./0092-group-planning-assets-by-phase-without-changing-harness-routing.md) — Refs 0082, Refs 0088, Refs 0090
- [0093 — Route spec through workers while Copilot remains inline](./0093-route-spec-through-workers-while-copilot-remains-inline.md) — Refs 0082, Refs 0083, Refs 0090, Refs 0092
- [0096 — Fail closed when dispatching owned worker sidecars](./0096-fail-closed-owned-worker-owner-dispatch.md) — Refs 0084, Refs 0085
- [0098 — Register the performance worker through managed projections](./0098-register-performance-worker-through-managed-projections.md) — Refs 0084, Refs 0085, Refs 0096
- [0099 — Terminal routing failure and explicit fresh dispatch](./0099-terminal-routing-failure-and-explicit-fresh-dispatch.md) — Refs 0075, Refs 0076, Refs 0086
- [0100 — Neutral installed worker-binding destinations with harness-specific sources](./0100-neutral-installed-worker-binding-destinations.md) — Refs 0077, Refs 0084, Refs 0088
- [0101 — Exact Git-blob corpus for binding retirement ownership](./0101-exact-git-blob-corpus-for-binding-retirements.md) — Refs 0091
- [0102 — Consumer-scoped preflight for routed worker contract assets](./0102-consumer-scoped-preflight-for-routed-worker-contract-assets.md) — Refs 0100
- [0103 — Retire the inline harness model in favor of two routed harnesses](./0103-retire-inline-harness-model-in-favor-of-routed-harnesses.md)
- [0104 — Remove Copilot from the active installer inventory](./0104-remove-copilot-from-active-installer-inventory.md) — Pair with 0103
- [0144 — The three planning-phase coordinators drop the scoped `Bash(date:*)` entry](./0144-planning-coordinators-drop-the-scoped-date-shell-entry.md) — Supersedes 0117, Refs 0118, Refs ddr:0141
- [0133 — Keep harness-native worker templates over shared dispatch syntax](./0133-harness-native-worker-templates-over-shared-dispatch-syntax.md)
- [0134 — Materialize Worker Matrix projections from the manifest and retire by hash](./0134-materialize-worker-projections-from-the-manifest-and-retire-by-hash.md)
- [0137 — Put non-worker idea-list glue at the harness adapter seam](./0137-non-worker-idea-list-glue-at-harness-adapter-seam.md) — Refs 0077, Refs 0088, Refs 0116
- [0138 — Use manifest projections plus hash-gated retirement records](./0138-manifest-projections-and-hash-gated-retirement-records.md) — Refs 0091, Refs 0101, Refs 0134, Refs ddr:0123
- [0141 — Use one shared launcher card per in-scope command](./0141-use-one-shared-launcher-card-per-in-scope-command.md)
- [0142 — Add near-empty launchers as extension points](./0142-add-near-empty-launchers-as-extension-points.md)
- [0143 — Load the boot adapter before the launcher](./0143-load-the-boot-adapter-before-the-launcher.md)

### Argument passing & change-name resolution

- [0033 — Echo line format and placement](./0033-echo-line-format-and-placement.md)
- [0034 — Resolution precedence — wrapper-echo check runs first](./0034-resolution-precedence-wrapper-echo-first.md) — Pair with 0033
- [0049 — Fast-track flag-strip precedes change-picker; cleaned change-name is authoritative](./0049-fast-track-flag-strip-before-change-picker.md)
- [0065 — Fork `status-picker.md` from `change-picker.md` rather than parameterize the shared picker](./0065-fork-status-picker-from-change-picker.md)
- [0075 — Normalize coordinator-worker exchange around an invocation envelope and lifecycle payload](./0075-normalized-invocation-envelope-and-lifecycle-payload.md) — Pair with 0076
- [0080 — Design-to-implementation lifecycle boundary](./0080-design-to-implementation-lifecycle-boundary.md) — Refs 0075, Refs 0076
- [0099 — Terminal routing failure and explicit fresh dispatch](./0099-terminal-routing-failure-and-explicit-fresh-dispatch.md) — Refs 0075, Refs 0076, Refs 0086

### Fast-track mode

- [0048 — Single-source the `--fast-track` parse in each command's body file](./0048-single-source-fast-track-parse-in-body-file.md)
- [0049 — Fast-track flag-strip precedes change-picker; cleaned change-name is authoritative](./0049-fast-track-flag-strip-before-change-picker.md)
- [0050 — Respect each harness's native argument-surface convention for `--fast-track`](./0050-respect-harness-native-argument-surface.md)
- [0051 — Model `--fast-track` as ephemeral in-conversation state only](./0051-ephemeral-in-conversation-fast-track-state.md) — Refs 0040
- [0059 — The fast-track branch auto-stay rule lives in `apply.md`, not in the `implement.md` Prerequisites template](./0059-fast-track-auto-stay-branch-rule-in-apply.md) — Pair with 0052

### Commit authorization, staging & message rules

- [0005 — Verbatim Extraction of Commit Rules into commit-rules.md](./0005-verbatim-extraction-of-commit-rules.md) — Refs 0006
- [0006 — Load commit-rules at Git Operations Section Header in apply.md](./0006-commit-rules-fetch-placement-in-apply.md) — Refs 0005
- [0040 — Session-scoped commit authorization lives in in-conversation working memory only](./0040-session-auth-in-memory-only.md)
- [0044 — Preview committed-files block from intended add-list instead of git index](./0044-preview-committed-block-from-add-list-not-index.md)
- [0045 — Pin staged file set to previewed add-list with deferred timing preserved](./0045-pin-staged-set-to-previewed-add-list.md) — Pair with 0044

### Subagent dispatch & report contract

- [0017 — Same-model Step-execution dispatch via omitted `model:` parameter](./0017-same-model-dispatch-via-omitted-model-param.md)
- [0019 — Fixed gate ordering after a Step-execution subagent's report](./0019-coordinator-gate-ordering-after-subagent-report.md)
- [0020 — Ephemeral in-context technical-learnings memory for the apply coordinator](./0020-ephemeral-in-context-technical-learnings-memory.md) — Refs 0019
- [0025 — Blind test-writer receives injected context; implementation dispatch is barred from test files](./0025-blind-test-writer-impl-test-prohibition.md)
- [0075 — Normalize coordinator-worker exchange around an invocation envelope and lifecycle payload](./0075-normalized-invocation-envelope-and-lifecycle-payload.md) — Pair with 0076
- [0076 — Resume the current planning worker before reconstructing from durable artifacts](./0076-resume-worker-before-durable-reconstruction.md) — Pair with 0075
- [0077 — Keep model and continuation mechanics in harness-specific worker bindings](./0077-harness-specific-worker-bindings.md) — Refs 0074, Refs 0075, Refs 0076
- [0079 — Design worker notices and reconstruction metadata](./0079-design-worker-notices-and-reconstruction-metadata.md) — Refs 0075, Refs 0076
- [0083 — Extract shared coordinator mechanics through phase adapters](./0083-shared-coordinator-mechanics-through-phase-adapters.md) — Refs 0075, Refs 0076, Refs 0079, Refs 0080
- [0086 — Separate worker write journals from the coordinator changed-file union](./0086-worker-journals-and-coordinator-union.md) — Refs 0075, Refs 0076
- [0087 — Implementation phase adapter and durable verification](./0087-implementation-phase-adapter-and-durable-verification.md) — Refs 0083, Refs 0086
- [0089 — Share one routed SAI coordinator profile across planning phases](./0089-shared-sai-coordinator-profile.md) — Refs 0083, Refs 0074, Refs 0078
- [0099 — Terminal routing failure and explicit fresh dispatch](./0099-terminal-routing-failure-and-explicit-fresh-dispatch.md) — Refs 0075, Refs 0076, Refs 0086
- [0105 — Two-stage verification for the audit-derived-step append](./0105-two-stage-audit-append-verification.md) — Refs ddr:0021, Refs 0087

### Testability routing & RED → GREEN

- [0025 — Blind test-writer receives injected context; implementation dispatch is barred from test files](./0025-blind-test-writer-impl-test-prohibition.md)
- [0064 — Instruction-file-only Steps are classified non-testable](./0064-instruction-only-steps-classified-non-testable.md)
- [0070 — Test Command carries the project's parameterised scoping idiom, not a bare suite command](./0070-test-command-carries-parameterised-scoping-idiom.md)
- [0115 — Three-part dispatch-routing condition (RED block, Step Contract, AND production surface)](./0115-three-part-dispatch-routing-condition.md) — Supersedes 0071

### The `interfaces.md` contract

- [0022 — interfaces.md is a standalone, step-keyed artifact rather than a section of tasks.md](./0022-interfaces-artifact-standalone-file.md)
- [0023 — interfaces.md is an optional soft dependency, not a schema hard requirement](./0023-interfaces-soft-dependency.md)
- [0115 — Three-part dispatch-routing condition (RED block, Step Contract, AND production surface)](./0115-three-part-dispatch-routing-condition.md) — Supersedes 0071

### Gates, decision summaries & feedback loops

- [0015 — Decision summary precedes the completion sentinel](./0015-decision-summary-precedes-completion-sentinel.md) — **Amends** ddr:0014
- [0028 — The feedback gate takes three named parameters supplied inline at the fetch site](./0028-gate-parameters-inline-at-fetch-site.md)
- [0046 — Single-object amendment audit with overwrite-latest semantics](./0046-single-object-amendment-audit.md)
- [0047 — Keep the amendment path distinct from the artifact-feedback-gate](./0047-amendment-path-distinct-from-feedback-gate.md) — Refs 0028
- [0058 — The explore/feedback gate UX tweaks are expressed as deltas against the existing capabilities, not a new combined capability](./0058-gate-ux-tweaks-as-deltas-against-existing-capabilities.md) — **Reframes** ddr:0053
- [0090 — Centralize Copilot inline planning lifecycle in one adapter](./0090-centralize-copilot-inline-planning-lifecycle.md) — Refs 0089, Refs 0083, Refs 0078, Refs 0074

### Explore crystallization & the review loop

- [0038 — Shared unnumbered "Emission gate" subsection at the §4→§5 seam in `explore.md`](./0038-shared-unnumbered-emission-gate-subsection.md)
- [0039 — Align baseline `explore-*` spec emission-timing language via MODIFIED deltas](./0039-align-explore-spec-emission-timing-language.md) — Pair with 0038
- [0043 — Append crystallization language gate as item 8; do not renumber items 1–7 in `explore.md`](./0043-append-crystallization-gate-as-item-8.md) — Refs 0038
- [0054 — Reuse item 3's path-keyed Persistence rule for post-crystallization review-loop re-asks](./0054-reuse-item-3-persistence-rule-for-review-loop.md)
- [0066 — Provenance as inline citations on existing Why / Decisions & Rationale fields — no new field](./0066-inline-provenance-no-new-field.md)
- [0116 — The idea progress list is expressed entirely in `sai/instructions/explore.md` — the sole edit target](./0116-idea-progress-list-expressed-in-explore-md.md)
- [0122 — The findings block is the loop's sole output and handoff payload](./0122-findings-block-is-the-loops-sole-output-and-handoff-payload.md) — Refs 0058, Refs ddr:0060
- [0123 — Handed-off findings route to the design worker; the loop never applies, forwards, or regenerates](./0123-handed-off-findings-route-to-the-design-worker.md) — Refs 0047, Refs ddr:0060
- [0127 — Keep one ordered edge-case list and partition it at sliced handoff](./0127-whole-idea-edge-cases-are-partitioned-at-sliced-handoff.md)
- [0137 — Put non-worker idea-list glue at the harness adapter seam](./0137-non-worker-idea-list-glue-at-harness-adapter-seam.md) — Refs 0077, Refs 0088, Refs 0116
- [0137 — The stage-advancement token is the literal next-step](./0137-stage-advancement-token-literal-next-step.md)
- [0140 — Active review-loop exit reuses the existing token matcher](./0140-active-review-loop-exit-reuses-existing-token-matcher.md)

### Artifact metadata & routing tokens

- [0066 — Provenance as inline citations on existing Why / Decisions & Rationale fields — no new field](./0066-inline-provenance-no-new-field.md)
- [0069 — Test Command is a sibling field of Implementation Context, outside the Conventions bullet quota](./0069-test-command-sibling-field-outside-conventions-quota.md)
- [0070 — Test Command carries the project's parameterised scoping idiom, not a bare suite command](./0070-test-command-carries-parameterised-scoping-idiom.md)
- [0108 — Tasks files-affected entries carry a closed four-letter change-type vocabulary](./0108-tasks-files-affected-change-type-vocabulary.md)
- [0109 — R change-type entry is a single move entry, never a delete-plus-add pair](./0109-r-change-type-single-move-entry.md) — Refs 0108

### Installer dependency policy & external tooling

- [0010 — Raw readline for interactive checklist instead of npm library](./0010-readline-over-npm-for-interactive-checklist.md)
- [0011 — Regex line-level patch for config.yaml schema field instead of YAML library](./0011-regex-line-patch-over-yaml-library-for-config.md) — Refs 0010
- [0030 — Merge `opencode.json` over `opencode.jsonc` when both exist](./0030-opencode-json-over-jsonc-merge-precedence.md) — *Superseded in respect of agents; precedence continues to govern the SAI permission merge*
- [0031 — Permit declared npm dependencies in the installer (jsonc-parser)](./0031-permit-declared-npm-dependencies-in-installer.md) — **Amends** 0010, **Amends** 0011
- [0032 — Installer may execute an external installer](./0032-installer-may-execute-external-installer.md) — Refs 0031
- [0036 — Bundle CodeGraph CLI install and MCP wiring into a single boolean-returning runner](./0036-codegraph-install-bundled-runner-boolean.md)
- [0037 — `setup.js` imports the shared CodeGraph offer directly from `install-flow.js`](./0037-setup-imports-install-flow-directly.md)
- [0055 — Re-derive the uninstall deletion set and verify symmetry by test](./0055-re-derive-uninstall-deletion-set-verify-by-test.md)
- [0056 — The doctor's "fresh repo from main" is its own npx-bundled checkout](./0056-doctor-fresh-repo-is-npx-bundled-checkout.md) — Refs 0057
- [0057 — The doctor reuses uninstall-flow's enumeration as the install-graph source of truth](./0057-doctor-reuses-uninstall-enumeration-as-install-graph.md) — Refs 0055
- [0084 — Use a hybrid declarative installation manifest](./0084-hybrid-declarative-installation-manifest.md) — Refs 0055, Refs 0057
- [0085 — Implement declared projection strategies with generic handlers](./0085-generic-handlers-for-declared-projection-strategies.md) — Pair with 0084, Refs 0029, Refs 0055, Refs 0057
- [0088 — Implementation harness projection boundaries](./0088-implementation-harness-projection-boundaries.md) — Refs 0084, Refs 0085, Refs 0074
- [0096 — Fail closed when dispatching owned worker sidecars](./0096-fail-closed-owned-worker-owner-dispatch.md) — Refs 0084, Refs 0085
- [0119 — Shared raw-readline navigator engine in `bin/install-flow.js`](./0119-shared-raw-readline-navigator-engine-in-install-flow.md) — Refs 0010
- [0134 — Materialize Worker Matrix projections from the manifest and retire by hash](./0134-materialize-worker-projections-from-the-manifest-and-retire-by-hash.md)
- [0138 — Use manifest projections plus hash-gated retirement records](./0138-manifest-projections-and-hash-gated-retirement-records.md) — Refs 0091, Refs 0101, Refs 0134, Refs ddr:0123

---

## ADRs that extend or correct prior ones

| ADR | Action | Over |
|---|---|---|
| [0004](./0004-source-layout-and-install-path-restructure.md) | supersedes | [0002](./0002-sai-harness-files-under-claude-instructions.md) |
| [0004](./0004-source-layout-and-install-path-restructure.md) | supersedes | [0003](./0003-fetch-path-convention-commands-sai.md) |
| [0015](./0015-decision-summary-precedes-completion-sentinel.md) | amends | [0014](../ddr/0014-decision-summary-derived-from-artifacts-only.md) |
| [0013](./0013-mmut-n-finding-namespace-for-mutation-analysis.md) | amends | [0012](./0012-mutation-analysis-as-dedicated-protocol-section.md) |
| [0031](./0031-permit-declared-npm-dependencies-in-installer.md) | amends | [0010](./0010-readline-over-npm-for-interactive-checklist.md) |
| [0031](./0031-permit-declared-npm-dependencies-in-installer.md) | amends | [0011](./0011-regex-line-patch-over-yaml-library-for-config.md) |
| [0058](./0058-gate-ux-tweaks-as-deltas-against-existing-capabilities.md) | reframes | [0053](../ddr/0053-post-crystallization-review-once-per-turn.md) |
| [0071](./0071-two-part-dispatch-routing-condition.md) | supersedes | [0024](./0024-split-only-testable-steps.md) |
| [0073](./0073-durable-channel-is-the-deviations-appendix.md) | reframes | [0020](./0020-ephemeral-in-context-technical-learnings-memory.md) |
| [0107](./0107-unified-audit-severity-vocabulary.md) | supersedes | [0013](./0013-mmut-n-finding-namespace-for-mutation-analysis.md) |
| [0115](./0115-three-part-dispatch-routing-condition.md) | supersedes | [0071](./0071-two-part-dispatch-routing-condition.md) |
| [0144](./0144-planning-coordinators-drop-the-scoped-date-shell-entry.md) | supersedes | [0117](./0117-planning-coordinators-scoped-shell-entry.md) |

## Superseded ADRs (historical)

- [0002 — Both harness resolver files live under ~/.claude/instructions/sai/](./0002-sai-harness-files-under-claude-instructions.md) — *Superseded by [0004](./0004-source-layout-and-install-path-restructure.md)*
- [0003 — Fetch Path Convention for Shared Command Bodies](./0003-fetch-path-convention-commands-sai.md) — *Superseded by [0004](./0004-source-layout-and-install-path-restructure.md)*
- [0024 — Split into two dispatches ONLY for testable Steps, keyed by the already-authored RED block](./0024-split-only-testable-steps.md) — *Superseded by [0071](./0071-two-part-dispatch-routing-condition.md)*
- [0071 — Two-part dispatch-routing condition (RED block AND Step Contract)](./0071-two-part-dispatch-routing-condition.md) — Supersedes 0024, Refs 0064 — *Superseded by [0115](./0115-three-part-dispatch-routing-condition.md)*
- [0080 — Design-to-implementation lifecycle boundary](./0080-design-to-implementation-lifecycle-boundary.md) — Refs 0075, Refs 0076 — *Superseded by simplify-routed-phase-coordination*
- [0089 — Share one routed SAI coordinator profile across planning phases](./0089-shared-sai-coordinator-profile.md) — Refs 0083, Refs 0074, Refs 0078 — *Superseded by simplify-routed-phase-coordination*
- [0013 — Dedicated mMUT-N finding namespace and Mutation Analysis output section](./0013-mmut-n-finding-namespace-for-mutation-analysis.md) — *Superseded by [0107](./0107-unified-audit-severity-vocabulary.md)*
- [0117 — The three planning-phase coordinators receive the scoped `Bash(date:*)` entry as the sole allowed-tools exception](./0117-planning-coordinators-scoped-shell-entry.md) — *Superseded by [0144](./0144-planning-coordinators-drop-the-scoped-date-shell-entry.md)*
- [0118 — Per-harness wall-clock commands live in the harness bindings, never in the neutral policy](./0118-per-harness-wall-clock-commands-in-bindings.md) — Refs 0077 — *Superseded by [ddr:0141](../ddr/0141-milestone-stamp-is-closure-only-and-derived-from-emitted-on.md)*
- [0029 — Surgical merge of the opencode `agent` block via jsonc-parser](./0029-jsonc-parser-surgical-merge-for-opencode-agent-block.md) — Refs 0031 — *Historical: the agent-block merge is retired*
