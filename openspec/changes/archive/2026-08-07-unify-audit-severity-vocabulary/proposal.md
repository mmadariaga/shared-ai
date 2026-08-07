**Complexity**: high (6 modified capabilities, 26 affected paths, no breaking change)

## Why

Four review/audit surfaces ship four different severity vocabularies — `Blocker`/`Major`/`Minor`/`Question` in `sai/instructions/review.md:176-179`, a four-level `Critical`/`High`/`Medium`/`Low` table in `security.md:37-42`, and five-level tables with numeric ranks in `performance.md:37-43` and `accessibility.md:39-45` — so the same finding is called "Major" in one report and "High" in another. Only `sai-5` numbers its findings at all, and no audit report carries a closing severity tally, so cross-report comparison and machine grep of severities is impossible today. This change adopts one severity vocabulary and identifier scheme across all four surfaces, adds per-finding identifiers where they are missing, and appends a closing `Summary:` tally line to every report.

## What Changes

- **Unified severity vocabulary.** The four surfaces adopt the shared levels `Critical`, `High`, `Medium`, `Low` — `Blocker` maps to `Critical`, `Major` to `High`, `Minor` to `Low`, and `Medium` becomes newly available in `sai-5` (defined between `High` and `Low`). `Question` stays a review-only category. The legacy words `Blocker`/`Major`/`Minor` are retired from all four phase instructions, worker contracts, report templates, schema scaffolds, and capability specs.
- **Per-phase subsets.** Each phase declares the subset it uses: `sai-5` uses `Critical`/`High`/`Medium`/`Low` plus `Question`; `sai-6` keeps its four levels; `sai-7` and `sai-8` keep five levels including `Informational`. No phase gains levels it does not use.
- **Per-finding identifiers.** Every finding in every report carries a severity-prefixed identifier — the severity's initial followed by its sequence within the report (`C1`, `H1`, `M1`, `L1`, plus `Q` for review Questions and `I` for `Informational`), restarting per report. `sai-5` renames `B1`/`M1`/`m1`/`Q1` to `C1`/`H1`/`M1`/`L1`/`Q1`; `sai-6`/`sai-7`/`sai-8` gain identifiers where the templates currently use bare `### [SEVERITY]` headings. The `M1` versus `m1` case-only collision in `_templates/review-report.md:70,78` disappears as a side effect of retiring `Minor`.
- **Closing summary line.** Every report closes with a `Summary:` tally line (`Summary: Critical=<n> High=<n> Medium=<n> Low=<n> [Informational=<n>] [Questions=<n>]` per the phase's subset), mirroring the base form already used by the artifact-review contract.
- **Mutation-analysis remap.** Mutation outcomes roll up into the new vocabulary — `survived` and `pre-check-failed` count as `High`, `revert-failed` counts as `Critical` — while the `mMUT-N` namespace and the seven-field mutation row stay untouched (docs/adr/0013).
- **Both template families edited together.** The four write-time contracts under `sai/instructions/_templates/` and the four schema scaffolds under `openspec/schemas/sai-workflow/templates/` receive the matching content changes in the same commit, preserving the skeleton parity pinned by `test/report-template-parity.test.js` (top-level `##` headings, header metadata labels, and the review pair's Mutation Analysis bold labels).
- **Consistency re-pointing (no behavior change).** References to the retired vocabulary in `sai/instructions/implement.md:71` (rubric severity criterion), `openspec/specs/audit-artifact-ingestion/spec.md:30,50` (rubric wording and example identifiers), and `sai/policies/artifact-review-contract.md:7` (parenthetical citing `review.md`'s `B`/`M`/`m`/`Q`) are re-pointed to the shared vocabulary.
- **Glossary resolution updated.** The `Finding across surfaces` flagged ambiguity in `GLOSSARY.md` is re-resolved: artifact reviews keep their own `High`/`Medium`/`Low` contract (closed set, no `Critical`), while all four audit commands share the `Critical`-based vocabulary and identifier scheme.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `review-phase-worker`: severity vocabulary in the review instruction and worker contract; per-finding identifiers; closing summary line; mutation severity remap.
- `review-phase-coordinator`: terminal-summary contract text re-pointed from "top three Blockers" to "top three Critical findings".
- `security-phase-worker`: phase contract adopts the shared identifier scheme and closing summary line (vocabulary already `Critical`/`High`/`Medium`/`Low`).
- `accessibility-phase-worker`: phase contract drops the legacy `Major` framing and adopts the shared identifier scheme and closing summary line (vocabulary already `Critical`/`High`/`Medium`/`Low`/`Informational`).
- `mutation-analysis`: outcome-to-severity mapping remapped to the shared vocabulary while preserving the `mMUT-N` namespace and seven-field row.
- `instruction-output-templates`: the four report contracts and their schema scaffolds updated together under the parity invariant.

## Impact

- `sai/instructions/review.md` — severity taxonomy (176-179), triage references (75, 84, 89), glossary-consistency flag (93), mutation outcome severities (155), Step 4 summary reference (188).
- `sai/instructions/security.md` — report contract gains identifiers and closing summary line; taxonomy (37-42) unchanged.
- `sai/instructions/performance.md` — report contract gains identifiers and closing summary line; taxonomy (37-43) unchanged.
- `sai/instructions/accessibility.md` — report contract gains identifiers and closing summary line; taxonomy (39-45) unchanged; no `Major` remains in the instruction.
- `sai/instructions/_templates/review-report.md` — verdict line, findings count line, `###` severity sections and identifiers, mutation roll-up lines (16-19, 58-86, 120-132), closing `Summary:` line.
- `sai/instructions/_templates/security-report.md` — finding headings gain identifiers (49, 74); closing `Summary:` line.
- `sai/instructions/_templates/performance-report.md` — finding headings gain identifiers (50); closing `Summary:` line.
- `sai/instructions/_templates/accessibility-report.md` — finding headings gain identifiers (43); closing `Summary:` line.
- `openspec/schemas/sai-workflow/templates/review.md` — mirror of the review contract changes (14, 16, 55-93, 104-105).
- `openspec/schemas/sai-workflow/templates/security.md` — mirror of the security contract changes (47, 72); closing `Summary:` line.
- `openspec/schemas/sai-workflow/templates/performance.md` — mirror of the performance contract changes; closing `Summary:` line.
- `openspec/schemas/sai-workflow/templates/accessibility.md` — mirror of the accessibility contract changes; closing `Summary:` line.
- `sai/orchestration/workers/sai-5-review-worker.md` — completion verification and summary contract (32).
- `sai/orchestration/workers/sai-6-security-worker.md` — report verification gains severity-prefixed identifiers and the closing `Summary:` tally (30).
- `sai/orchestration/workers/sai-7-performance-worker.md` — report verification gains severity-prefixed identifiers and the closing `Summary:` tally (34); the five-level taxonomy itself is unchanged.
- `sai/orchestration/workers/sai-8-accessibility-worker.md` — the legacy-`Major` regression-floor phrasing at 32 is replaced by the shared-vocabulary floor ("High at minimum, or Critical when Critical criteria apply"), and the report verification gains identifiers and the closing `Summary:` tally (52).
- `openspec/specs/review-phase-worker/spec.md` — main spec synced from the delta.
- `openspec/specs/review-phase-coordinator/spec.md` — main spec synced from the delta.
- `openspec/specs/security-phase-worker/spec.md` — main spec synced from the delta.
- `openspec/specs/accessibility-phase-worker/spec.md` — main spec synced from the delta.
- `openspec/specs/mutation-analysis/spec.md` — main spec synced from the delta.
- `openspec/specs/instruction-output-templates/spec.md` — main spec synced from the delta.
- `GLOSSARY.md` — `Finding across surfaces` flagged-ambiguity resolution updated during the spec phase.
- Consistency references re-pointed during implementation (no behavior change): `sai/instructions/implement.md:71`, `openspec/specs/audit-artifact-ingestion/spec.md:30,50`, `sai/policies/artifact-review-contract.md:7`.

Explicitly not touched: the artifact-review contract's own severity vocabulary and identifiers for artifact reviews (`High`/`Medium`/`Low`, `H1`/`M1`/`L1` — its closed set deliberately excludes `Critical`); `docs/adr/0013`'s `mMUT-N` namespace and seven-field row; the review worker bindings (no severity vocabulary or report-shape verification text); and the four severity taxonomies themselves — every phase's level set is unchanged, only per-finding identifiers and the closing tally are added on top.

## Proposal Research Documentation

**Local files**:

- `sai/instructions/review.md` (severity taxonomy and mutation protocol)
- `sai/instructions/security.md` (four-level taxonomy, CVSSv3 mapping, severity floor)
- `sai/instructions/performance.md` (five-level taxonomy with numeric ranks)
- `sai/instructions/accessibility.md` (five-level taxonomy with numeric ranks)
- `sai/instructions/implement.md` (Judgment Rubric severity criterion)
- `sai/instructions/_templates/review-report.md` (B1/M1/m1/Q1 identifiers, findings count line, mMUT-N roll-up)
- `sai/instructions/_templates/security-report.md`, `performance-report.md`, `accessibility-report.md` (finding heading shapes)
- `sai/orchestration/workers/sai-5-review-worker.md`, `sai-6-security-worker.md`, `sai-7-performance-worker.md`, `sai-8-accessibility-worker.md` (phase contracts)
- `sai/orchestration/workers/bindings/claude/review-worker.md`, `bindings/opencode/review-worker.md` (no severity vocabulary)
- `sai/commands/review/coordinator.md` (terminal-only coordinator; summary printed verbatim)
- `sai/policies/artifact-review-contract.md` (artifact-review finding contract; scope exclusion of audit commands)
- `openspec/specs/review-phase-worker/spec.md`, `review-phase-coordinator/spec.md`, `security-phase-worker/spec.md`, `accessibility-phase-worker/spec.md`, `mutation-analysis/spec.md`, `instruction-output-templates/spec.md`, `audit-artifact-ingestion/spec.md` (normative baselines for delta specs)
- `openspec/schemas/sai-workflow/templates/review.md`, `security.md`, `performance.md`, `accessibility.md` (schema scaffolds under the parity invariant)
- `test/report-template-parity.test.js` (parity pin dimensions)
- `GLOSSARY.md` (`Finding across surfaces` flagged ambiguity)
- `docs/adr/0013-mmut-n-finding-namespace-for-mutation-analysis.md` (mMUT-N preservation constraint)
- `docs/adr/0000-INDEX.md` (next free ADR number)

**External URLs**: None.

## Additional Notes

- **Mapping.** `Blocker`→`Critical`, `Major`→`High`, `Minor`→`Low`; `Question` unchanged (review-only, auto-discarded by `/sai-4-apply` per the audit-artifact-ingestion contract). `Medium` is newly available in `sai-5`; its definition sits between `High` and `Low` (moderate concern not threatening merge-readiness) and may be refined at design time. `Informational` stays in `sai-7`/`sai-8` only.
- **Identifier scheme.** Severity initial + 1-based sequence per severity per report: `C1`/`H1`/`M1`/`L1` everywhere, `Q1` in `sai-5`, `I1` in `sai-7`/`sai-8`. Identifiers are report-scoped and never imply identity across reports. `mMUT-N` remains a separate namespace per ADR 0013 and is NOT renumbered into the C/H/M/L/Q sequences.
- **Summary line formats (closing line of each report body).** review: `Summary: Critical=<n> High=<n> Medium=<n> Low=<n> Questions=<n>`; security: `Summary: Critical=<n> High=<n> Medium=<n> Low=<n>`; performance and accessibility: `Summary: Critical=<n> High=<n> Medium=<n> Low=<n> Informational=<n>`. The line lists every level of the phase's subset with its count (zeros included) and matches the report's findings; mutation findings fold in via their remapped severities. Format mirrors the artifact-review contract's base form but uses each phase's subset.
- **Findings count and summary agree.** The review report keeps both the header `**Findings count:**` line (updated to the new vocabulary, mutation fold note included) and the closing `Summary:` line; they must agree.
- **Parity mechanics.** `test/report-template-parity.test.js` pins per pair: top-level `##` heading sequence, header metadata bold-label sequence, and (review only) the Mutation Analysis bold field set. The `###` severity subsections, finding headings, count lines, and summary line are body content and free to change, but both families are still edited together in the same commit per the `Report Template Parity` pin.
- **Parity-guard extension considered and replaced by a normative same-commit rule.** The crystallized plan for this change considered extending `test/report-template-parity.test.js` from `##`-granularity to the severity subsection headings (`### Critical` / `High` / `Medium` / `Low` / `Questions`) this change edits — on the grounds that the one edit this change makes to those headings is the one the guard cannot see — and rejected leaving the guard at `##` granularity. This proposal reverses that decision: the guard stays at `##` granularity, and the same-commit requirement is instead pinned normatively in the instruction-output-templates delta (`Report template severity content changes preserve the pinned parity`). Reason for the reversal: the parity test's documented asserted-vs-allowed boundary pins skeleton (top-level headings, header labels, Mutation bold fields), not vocabulary-bearing body content; extending it to `###` severity headings would couple the automated pin to the exact text of the severity subsections for all future edits, a new dimension its design deliberately left to the same-commit discipline. Residual gap accepted: a future `###` severity-heading desync between a contract and its scaffold passes `node --test` silently — the precise failure mode the pinned parity exists to eliminate — mitigated only by the normative same-commit requirement and by review.
- **ADR recommendation for design.** The vocabulary change is hard to reverse once reports are written against it and should be recorded as a new ADR — `docs/adr/0107` is the next free number. The ADR supersedes the severity-mapping portion of ADR 0013 (`survived`/`pre-check-failed` → `High`, `revert-failed` → `Critical`) while reaffirming the `mMUT-N` namespace and seven-field row; ADR 0013 itself stays as the historical record (a status note may be added at implementation time).
- **Consistency re-pointing targets (mechanical, no behavior change):** `sai/instructions/implement.md:71` rubric criterion `Blocker/Major (review.md) or Critical/High (security/performance/accessibility)` collapses to the shared vocabulary; `openspec/specs/audit-artifact-ingestion/spec.md:30` rubric wording and `:50` example identifiers (`M3`, `review.md § Major M3`) re-point to the new scheme (`Question (Q)` handling is unaffected); `sai/policies/artifact-review-contract.md:7` parenthetical citing `review.md`'s `B`/`M`/`m`/`Q` sections updates to the shared vocabulary and keeps the scope exclusion (audits never emit this contract's tally).
- **Glossary.** `GLOSSARY.md` `Finding across surfaces` resolution is updated during the spec phase (permitted glossary update): artifact reviews keep `H1`/`M1`/`L1` on the closed `High`/`Medium`/`Low` set; audit findings share the `Critical`-based vocabulary with `C`/`H`/`M`/`L` (`Q`, `I`) identifiers and a closing `Summary:` line; `Review Finding` still names artifact-review items only.
