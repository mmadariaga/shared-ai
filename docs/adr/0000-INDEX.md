# ADR Index

This index groups the ADRs in `docs/adr/` by **command** and by **cross-cutting category**. An ADR may appear in more than one category: the filesystem already lists them alphabetically; the value here is the relational map (amends, supersedes, sibling pairs, refs).

## Conventions

- Each entry references the ADR by its original title (as it appears in the file).
- *Note* indicates a relationship: `Pair with NNNN`, `Refs NNNN`, `Amends NNNN`, `Supersedes NNNN`, etc.
- *Superseded* marks ADRs whose decision was replaced; the content remains historically accurate.

---

## By command

### `/sai-1-spec` / `/sai-2-design`

- [0005 — Verbatim Extraction of Commit Rules](./0005-verbatim-extraction-of-commit-rules.md)
- [0006 — Load commit-rules at Git Operations Section Header in apply.md](./0006-commit-rules-fetch-placement-in-apply.md) — Refs 0005
- [0014 — Decision summary derived exclusively from written artifacts](./0014-decision-summary-derived-from-artifacts-only.md) — Pair with 0015
- [0015 — Decision summary precedes the completion sentinel](./0015-decision-summary-precedes-completion-sentinel.md) — Pair with 0014
- [0028 — The feedback gate takes three named parameters supplied inline at the fetch site](./0028-gate-parameters-inline-at-fetch-site.md)
- [0046 — Single-object amendment audit with overwrite-latest semantics](./0046-single-object-amendment-audit.md) — Pair with 0047
- [0047 — Keep the amendment path distinct from the artifact-feedback-gate](./0047-amendment-path-distinct-from-feedback-gate.md) — Pair with 0046
- [0066 — Provenance as inline citations on existing Why / Decisions & Rationale fields](./0066-inline-provenance-no-new-field.md) — Consumed by sai-1-spec; Pair with 0067/0068
- [0067 — Handoff provenance consumption as "premise to confirm and extend"](./0067-confirm-extend-consumption-framing.md) — Pair with 0066/0068
- [0068 — Scope provenance to item-5 single-change block; defer item-6 sliced blocks](./0068-scope-item-5-defer-sliced.md) — Pair with 0066/0067

### `/sai-3-implement`

- [0016 — Accept double branch-selection prompt with the sibling spec](./0016-accept-double-prompt-with-sibling-spec.md)
- [0048 — Single-source the `--fast-track` parse in each command's body file](./0048-single-source-fast-track-parse-in-body-file.md) — Shared with sai-explore, sai-2, sai-4
- [0059 — The fast-track branch auto-stay rule lives in `apply.md`](./0059-fast-track-auto-stay-branch-rule-in-apply.md) — Sibling pair with 0052

### `/sai-4-apply`

*Dispatch, subagent reports, RED→GREEN and commit-staging in this command.*

- [0005](./0005-verbatim-extraction-of-commit-rules.md) / [0006](./0006-commit-rules-fetch-placement-in-apply.md)
- [0014](./0014-decision-summary-derived-from-artifacts-only.md) / [0015](./0015-decision-summary-precedes-completion-sentinel.md)
- [0016 — Accept double branch-selection prompt](./0016-accept-double-prompt-with-sibling-spec.md)
- [0017 — Same-model Step-execution dispatch via omitted `model:` parameter](./0017-same-model-dispatch-via-omitted-model-param.md)
- [0018 — Per-Step checkbox override scoped locally to apply.md](./0018-checkbox-override-scoped-to-apply-not-remember.md) — Local supersede of `remember.md` for this phase
- [0019 — Fixed gate ordering after a Step-execution subagent's report](./0019-coordinator-gate-ordering-after-subagent-report.md)
- [0020 — Ephemeral in-context technical-learnings memory](./0020-ephemeral-in-context-technical-learnings-memory.md) — Refs 0019
- [0021 — Preserve the no-dedup re-run contract](./0021-preserve-rerun-no-dedup-contract.md)
- [0022 — interfaces.md is a standalone, step-keyed artifact](./0022-interfaces-artifact-standalone-file.md)
- [0023 — interfaces.md is an optional soft dependency](./0023-interfaces-soft-dependency.md)
- [0024 — Split into two dispatches ONLY for testable Steps](./0024-split-only-testable-steps.md)
- [0025 — Blind test-writer receives injected context](./0025-blind-test-writer-impl-test-prohibition.md)
- [0026 — Stable 8-field report shape](./0026-stable-eight-field-report.md)
- [0027 — A failing GREEN is a human decision](./0027-failing-green-human-decision.md)
- [0028 — Feedback gate takes three named parameters inline](./0028-gate-parameters-inline-at-fetch-site.md)
- [0044 — Preview committed-files block from intended add-list](./0044-preview-committed-block-from-add-list-not-index.md) — Pair with 0045
- [0045 — Pin staged file set to previewed add-list](./0045-pin-staged-set-to-previewed-add-list.md) — Pair with 0044
- [0048](./0048-single-source-fast-track-parse-in-body-file.md) / [0052](./0052-human-verification-deferral-under-fast-track.md) / [0059](./0059-fast-track-auto-stay-branch-rule-in-apply.md)
- [0062 — Field 9's soft-degradation exemption stated at two sites](./0062-field-9-soft-degradation-stated-at-two-sites.md) — **Amends** 0026
- [0063 — A contract-violating telemetry note is dropped whole](./0063-violating-telemetry-note-dropped-not-cleaned.md)
- [0064 — Instruction-file-only Steps are classified non-testable](./0064-instruction-only-steps-classified-non-testable.md)
- [0069 — Test Command is a sibling field of Implementation Context](./0069-test-command-sibling-field-outside-conventions-quota.md) — Pair with 0070
- [0070 — Test Command carries the project's parameterised scoping idiom](./0070-test-command-carries-parameterised-scoping-idiom.md) — Pair with 0069

### `/sai-5-review`

- [0012 — Mutation Analysis (pass 11) as a dedicated protocol section](./0012-mutation-analysis-as-dedicated-protocol-section.md)
- [0013 — Dedicated mMUT-N finding namespace](./0013-mmut-n-finding-namespace-for-mutation-analysis.md) — Refs 0012

### `/sai-backfill`

- [0007 — Diff Source selected interactively](./0007-backfill-diff-source-interactive-selection.md) — Pair with 0008
- [0008 — Does not generate design.md, tasks.md, or implementation.md](./0008-backfill-prohibited-design-artifacts.md) — Pair with 0007

### `/sai-commit`

- [0005 — Verbatim extraction of commit rules](./0005-verbatim-extraction-of-commit-rules.md)
- [0006 — Load commit-rules at Git Operations Section Header in apply.md](./0006-commit-rules-fetch-placement-in-apply.md)
- [0040 — Session-scoped commit authorization in-memory only](./0040-session-auth-in-memory-only.md)
- [0041 — Uniform three-option commit gate](./0041-uniform-three-option-gate.md)
- [0042 — Reconcile the "ask every time" authorization principle atomically](./0042-reconcile-authorization-principle-atomically.md) — **Amends** the CRITICAL block of `apply.md` and `commit-rules.md`; integrates 0040

### `/sai-status`

- [0065 — Fork `status-picker.md` from `change-picker.md`](./0065-fork-status-picker-from-change-picker.md)

### `/sai-explore`

*Crystallization, post-crystallization review loop, and handoff to `sai-1-spec`.*

- [0038 — Shared unnumbered "Emission gate" subsection at the §4→§5 seam in explore.md](./0038-shared-unnumbered-emission-gate-subsection.md)
- [0039 — Align baseline `explore-*` spec emission-timing language via MODIFIED deltas](./0039-align-explore-spec-emission-timing-language.md)
- [0043 — Append crystallization language gate as item 8; do not renumber items 1–7 in explore.md](./0043-append-crystallization-gate-as-item-8.md)
- [0053 — Post-crystallization review loop fires once per turn](./0053-post-crystallization-review-once-per-turn.md)
- [0054 — Reuse item 3's path-keyed Persistence rule for post-crystallization review-loop re-asks](./0054-reuse-item-3-persistence-rule-for-review-loop.md) — Pair with 0061
- [0058 — The explore/feedback gate UX tweaks are expressed as deltas against the existing capabilities](./0058-gate-ux-tweaks-as-deltas-against-existing-capabilities.md) — **Reframes** 0053
- [0060 — The post-crystallization review loop's explicit trigger is the hyphenated literal token `review-loop`](./0060-review-loop-is-a-hyphenated-literal-token.md) — Pair with 0061
- [0061 — An artifact-review turn naming a tracked crystallized change is served first and then offered the loop, never rerouted into it](./0061-item-3-precedence-is-additive-not-a-reroute.md) — Pair with 0060
- [0066 — Provenance as inline citations on existing Why / Decisions & Rationale fields](./0066-inline-provenance-no-new-field.md) — Pair with 0067/0068
- [0067 — Handoff provenance consumption as "premise to confirm and extend"](./0067-confirm-extend-consumption-framing.md) — Pair with 0066/0068
- [0068 — Scope provenance to item-5 single-change block; defer item-6 sliced blocks](./0068-scope-item-5-defer-sliced.md) — Pair with 0066/0067

---

## Cross-cutting categories

### Repo layout, fetch paths and skill installation

- [0001 — Separate per-harness instruction files for the sai subagent resolver](./0001-sai-separate-harness-files.md) — *Still valid; separate file now lives as `skills/{claude,opencode}/`*
- [0004 — Source Layout and Install Path Restructure](./0004-source-layout-and-install-path-restructure.md) — Supersedes 0002; amends 0003; 0001 remains valid via `skills/`
- [0009 — Claude-Specific Fetch Skill at skills/claude/fetch/](./0009-claude-specific-fetch-skill.md) — Refs 0003

### `bin/`, installer and npm dependencies

- [0010 — Raw readline for interactive checklist instead of npm library](./0010-readline-over-npm-for-interactive-checklist.md)
- [0011 — Regex line-level patch for config.yaml schema field instead of YAML library](./0011-regex-line-patch-over-yaml-library-for-config.md) — Refs 0010 constraint (zero-dep)
- [0031 — Permit declared npm dependencies in the installer (jsonc-parser)](./0031-permit-declared-npm-dependencies-in-installer.md) — **Reverses** the zero-dep stance of 0010/0011
- [0032 — Installer may execute an external installer](./0032-installer-may-execute-external-installer.md) — Refs 0031 precedent
- [0036 — Bundle CodeGraph CLI install and MCP wiring into a single boolean runner](./0036-codegraph-install-bundled-runner-boolean.md)
- [0037 — `setup.js` imports the shared CodeGraph offer from `install-flow.js`](./0037-setup-imports-install-flow-directly.md) — Refs 0036
- [0055 — Re-derive the uninstall deletion set and verify symmetry by test](./0055-re-derive-uninstall-deletion-set-verify-by-test.md)
- [0056 — The doctor's "fresh repo from main" is its own npx-bundled checkout](./0056-doctor-fresh-repo-is-npx-bundled-checkout.md) — Refs 0057
- [0057 — The doctor reuses uninstall-flow's enumeration as the install-graph source of truth](./0057-doctor-reuses-uninstall-enumeration-as-install-graph.md) — Pair/sibling with 0056

### Cross-harness / wrapper mechanism

- [0001 — Separate per-harness instruction files](./0001-sai-separate-harness-files.md)
- [0004 — Source Layout and Install Path Restructure](./0004-source-layout-and-install-path-restructure.md)
- [0009 — Claude-Specific Fetch Skill](./0009-claude-specific-fetch-skill.md)
- [0033 — Echo line format and placement](./0033-echo-line-format-and-placement.md) — Only meaningful in opencode (wrapper-echo)
- [0034 — Resolution precedence — wrapper-echo check runs first](./0034-resolution-precedence-wrapper-echo-first.md) — Builds on 0033
- [0035 — Harness-specific adapter carve-out](./0035-harness-specific-adapter-carve-out.md) — Justifies that 0033/0034 are not mirrored to Claude/Copilot
- [0050 — Respect each harness's native argument-surface convention for `--fast-track`](./0050-respect-harness-native-argument-surface.md)

### opencode config merging

- [0029 — Surgical merge of the opencode `agent` block via jsonc-parser](./0029-jsonc-parser-surgical-merge-for-opencode-agent-block.md) — Introduces `jsonc-parser`; depends on 0031
- [0030 — Merge `opencode.json` over `opencode.jsonc` when both exist](./0030-opencode-json-over-jsonc-merge-precedence.md) — Sibling pair with 0029

### Flag `--fast-track`

- [0048 — Single-source the parse in each command's body file](./0048-single-source-fast-track-parse-in-body-file.md)
- [0049 — Fast-track flag-strip precedes change-picker](./0049-fast-track-flag-strip-before-change-picker.md)
- [0050 — Respect each harness's native argument-surface convention](./0050-respect-harness-native-argument-surface.md)
- [0051 — Model `--fast-track` as ephemeral in-conversation state only](./0051-ephemeral-in-conversation-fast-track-state.md)
- [0052 — Human-Verification deferral under `--fast-track`](./0052-human-verification-deferral-under-fast-track.md) — Sibling pair with 0059
- [0059 — Fast-track branch auto-stay rule lives in `apply.md`](./0059-fast-track-auto-stay-branch-rule-in-apply.md) — Sibling pair with 0052

### Commit authorization & audit (sai-4-apply / sai-commit)

- [0040 — Session-scoped commit authorization in-memory only](./0040-session-auth-in-memory-only.md)
- [0041 — Uniform three-option commit gate across apply.md and commit.md](./0041-uniform-three-option-gate.md)
- [0042 — Reconcile the "ask every time" authorization principle atomically](./0042-reconcile-authorization-principle-atomically.md) — **Amends** the CRITICAL principle + `commit-rules.md`; integrates 0040
- [0044 — Preview committed-files block from intended add-list](./0044-preview-committed-block-from-add-list-not-index.md)
- [0045 — Pin staged file set to previewed add-list](./0045-pin-staged-set-to-previewed-add-list.md) — Pair with 0044
- [0046 — Single-object amendment audit with overwrite-latest semantics](./0046-single-object-amendment-audit.md)
- [0047 — Keep the amendment path distinct from the artifact-feedback-gate](./0047-amendment-path-distinct-from-feedback-gate.md) — Pair with 0046

### Subagent report contract (8 → 9 fields)

- [0026 — Stable 8-field report shape with per-dispatch n/a for the unowned field](./0026-stable-eight-field-report.md)
- [0062 — Field 9's soft-degradation exemption stated at two sites](./0062-field-9-soft-degradation-stated-at-two-sites.md) — **Amends** 0026 (field count 8→9; stability principle intact)

### RED→GREEN, blind test-writer & interfaces.md (test isolation)

- [0022 — interfaces.md is a standalone, step-keyed artifact](./0022-interfaces-artifact-standalone-file.md)
- [0023 — interfaces.md is an optional soft dependency, not a schema hard requirement](./0023-interfaces-soft-dependency.md)
- [0024 — Split into two dispatches ONLY for testable Steps](./0024-split-only-testable-steps.md)
- [0025 — Blind test-writer receives injected context; implementation dispatch is barred from test files](./0025-blind-test-writer-impl-test-prohibition.md)
- [0027 — A failing GREEN is a human decision](./0027-failing-green-human-decision.md)
- [0069 — Test Command is a sibling field of Implementation Context](./0069-test-command-sibling-field-outside-conventions-quota.md)
- [0070 — Test Command carries the project's parameterised scoping idiom](./0070-test-command-carries-parameterised-scoping-idiom.md) — Pair with 0069

### Decision summary (governance of the emitted summary)

- [0014 — Decision summary derived exclusively from written artifacts](./0014-decision-summary-derived-from-artifacts-only.md)
- [0015 — Decision summary precedes the completion sentinel](./0015-decision-summary-precedes-completion-sentinel.md) — Pair with 0014

### Change-picker / status-picker

- [0033 — Echo line format and placement](./0033-echo-line-format-and-placement.md) — Enables the picker in opencode
- [0034 — Resolution precedence — wrapper-echo check runs first](./0034-resolution-precedence-wrapper-echo-first.md)
- [0065 — Fork `status-picker.md` from `change-picker.md`](./0065-fork-status-picker-from-change-picker.md)

### Doctor

- [0056 — Fresh repo bundled npx checkout](./0056-doctor-fresh-repo-is-npx-bundled-checkout.md)
- [0057 — Doctor reuses uninstall enumeration as install-graph source](./0057-doctor-reuses-uninstall-enumeration-as-install-graph.md)

---

## ADRs that extend or correct prior ones

| ADR | Action | Over |
|---|---|---|
| [0004](./0004-source-layout-and-install-path-restructure.md) | supersedes | [0002](./0002-sai-harness-files-under-claude-instructions.md), [0003](./0003-fetch-path-convention-commands-sai.md) (amend) |
| [0018](./0018-checkbox-override-scoped-to-apply-not-remember.md) | local supersede | `remember.md` default, for `sai-4-apply` only |
| [0031](./0031-permit-declared-npm-dependencies-in-installer.md) | reverses stance | [0010](./0010-readline-over-npm-for-interactive-checklist.md), [0011](./0011-regex-line-patch-over-yaml-library-for-config.md) zero-dep policy |
| [0042](./0042-reconcile-authorization-principle-atomically.md) | amends | CRITICAL "ask every time" block + `commit-rules.md` hard rules |
| [0058](./0058-gate-ux-tweaks-as-deltas-against-existing-capabilities.md) | reframes | [0053](./0053-post-crystallization-review-once-per-turn.md) |
| [0062](./0062-field-9-soft-degradation-stated-at-two-sites.md) | amends | [0026](./0026-stable-eight-field-report.md) (field count 8→9; stability intact) |

## Superseded ADRs (historical)

- [0002 — Both harness resolver files live under ~/.claude/instructions/sai/](./0002-sai-harness-files-under-claude-instructions.md) — *Superseded by [0004](./0004-source-layout-and-install-path-restructure.md)*
- [0003 — Fetch Path Convention for Shared Command Bodies](./0003-fetch-path-convention-commands-sai.md) — *Superseded (amended) by [0004](./0004-source-layout-and-install-path-restructure.md)*
