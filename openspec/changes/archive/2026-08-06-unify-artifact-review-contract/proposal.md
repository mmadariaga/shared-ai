**Complexity**: high (10 files, 1 new policy, no breaking change)

## Why

The artifact review contract — severity criteria, finding shape, identifier scheme, and summary line — is maintained in parallel: the criteria and finding shape are restated inline in `sai/instructions/explore.md:225` and duplicated normatively in `openspec/specs/pipeline-review-severity/spec.md:57-59` and `openspec/specs/pipeline-independent-review/spec.md:35`, while the manual review loop (`sai/instructions/explore.md:156-157`) defines no review output format at all. The parallel copies have already drifted — the boundary list in `pipeline-review-severity/spec.md:75` omits `sai-8-accessibility` while the instruction at `explore.md:225` names it, and the two criteria wordings differ — so one shared contract removes the parallel maintenance and gives the manual loop a defined format.

## What Changes

- Introduce `sai/policies/artifact-review-contract.md`, the single shared source of the artifact review finding contract: the `High` / `Medium` / `Low` severity vocabulary with assignment criteria, the five-field finding shape (identifier, severity, artifact location, issue statement, recommended correction), the severity-prefixed identifier scheme (`H1`, `M1`, `L1`), and the closing `Summary:` tally line.
- Have the manual review loop and both pipeline review phases (spec and design) reference the shared contract instead of redefining it; `sai/instructions/explore.md` drops its inline criteria restatement.
- Give the manual review loop a defined review output format — findings with severity-prefixed identifiers and severities per the shared criteria, closing with a `Summary:` tally line. The loop stays strictly read-only and its silent-close rule is unchanged.
- Constrain the previously free-form pipeline finding identifier (currently just "an identifier" at `pipeline-independent-review/spec.md:35`) to the severity-prefixed scheme; the `Severity` field remains the source of truth and the identifier is a derived label.
- Lift the "locally scoped" prohibition (`pipeline-review-severity/spec.md:73-79`) so the vocabulary also applies to the manual review loop, while keeping the audit-command severities (`sai-5`, `sai-6`, `sai-7`, `sai-8`) untouched and aligning the spec's boundary list with the instruction's (which already names `sai-8`).
- Align the machine-feedback adapter's finding shape reference (`artifact-feedback-gate` capability, spec.md:327-331 and `sai/policies/artifact-feedback-gate.md:39-41`) to the shared contract.

## Capabilities

### New Capabilities
- `review-finding-format`: owns the shared artifact review finding contract — the closed severity vocabulary and assignment criteria, the finding shape, the severity-prefixed identifier scheme, and the closing `Summary:` tally line — single-sourced in `sai/policies/artifact-review-contract.md` and referenced by every artifact review surface.

### Modified Capabilities
- `pipeline-review-severity`: severity criteria single-sourced in the shared contract; the "locally scoped" prohibition lifted so the vocabulary also applies to the manual review loop; audit severities still untouched, with the boundary list aligned to `sai-8`.
- `pipeline-independent-review`: the reviewer's finding identifier constrained to the severity-prefixed scheme per the shared contract.
- `explore-post-crystallization-review-loop`: the manual loop's review output format defined per the shared contract (currently undefined).
- `artifact-feedback-gate`: the machine-feedback adapter's finding shape aligned to the shared contract.

## Impact

- `sai/policies/artifact-review-contract.md` — new shared policy. Auto-installed by the existing recursive `sai-policies` projection (`sai/install-manifest.json:9`); no manifest entry, no harness binding, no agent file.
- `sai/instructions/explore.md` — inline criteria and finding shape replaced by a reference to the shared contract; manual-loop output format; deterministic pass-reporting identifiers.
- `sai/policies/artifact-feedback-gate.md` — machine-feedback adapter finding shape reference aligned.
- `openspec/specs/review-finding-format/spec.md` — new capability spec.
- `openspec/specs/pipeline-review-severity/spec.md`, `openspec/specs/pipeline-independent-review/spec.md`, `openspec/specs/explore-post-crystallization-review-loop/spec.md`, `openspec/specs/artifact-feedback-gate/spec.md` — modified delta specs.
- `test/explore-pipeline-supervision.test.js` — asserts the inline finding shape and the pass-reporting identifiers in `explore.md` (finding-field list, `Finding.*pass-local identifier`, severity-set wording, deterministic summary); updated when the inline restatement becomes a reference and identifiers become severity-prefixed.
- `AGENTS.md` — the `sai/policies/` row of the repo-structure table enumerates the policy files; the new `artifact-review-contract.md` is added to that enumeration.
- Not touched: the `sai-5`/`sai-6`/`sai-7`/`sai-8` audit severities and finding formats (incl. `review.md`'s `B`/`M`/`m`/`Q` and `mMUT-N` identifiers), the three-pass bound, and the convergence stop condition.

## Proposal Research Documentation

**Local files**: sai/instructions/explore.md; sai/policies/artifact-feedback-gate.md; sai/install-manifest.json; openspec/specs/pipeline-review-severity/spec.md; openspec/specs/pipeline-independent-review/spec.md; openspec/specs/explore-post-crystallization-review-loop/spec.md; openspec/specs/artifact-feedback-gate/spec.md; openspec/specs/spec-quality/spec.md; openspec/specs/orchestration-source-layout/spec.md; docs/adr/0013-mmut-n-finding-namespace-for-mutation-analysis.md; GLOSSARY.md

**External URLs**: - None

## Additional Notes

- The design-phase pipeline review (`explore.md:284-286`) already defers to "the exact `High`/`Medium`/`Low` finding shape"; this change turns that deferral into an explicit reference to the shared contract.
- Handoff correction: `pipeline-review-severity/spec.md:59` holds the severity criteria, not a "High is the ceiling" statement. The ceiling property is expressed by the convergence stop condition (`spec.md:44-46`), which names `High` as the only blocking tier. The no-Critical decision stands on that anchor: a tier above `High` would make "no `High` findings" an incoherent convergence condition (a pass with only `Critical` findings would satisfy it).
- The criteria wording preserved as canonical is the normative one from `pipeline-review-severity/spec.md:59` ("would allow a materially incorrect..."); `explore.md:225`'s divergent wording ("could materially authorize...") is dropped.
- The pipeline pass-reporting summary already exists (`explore.md:259`: `Summary: Pass <n> High=<count> Medium=<count> Low=<count> Contract-violations=<count>`); the shared contract defines its canonical base form and the pipeline extends it per its deterministic reporting rules.
- `review.md`'s mutation identifiers (`mMUT-N`, ADR 0013) and the audit commands' own severity vocabularies are deliberately out of scope: the `H1`/`M1`/`L1` scheme applies to artifact reviews only.
- Incidental fix: `pipeline-independent-review`'s "Review findings pass through the artifact feedback gate" requirement carried a pre-existing duplicate "reviewer returns no actionable findings" scenario (the second copy dropped the convergence-termination clause). Because this change rewrites that requirement's full body, the duplicate is dropped; the fuller scenario is authoritative.
- Contract-violation identifiers: a finding whose severity is missing or out-of-set cannot have a derived identifier, so the rejection evidence preserves the reviewer-supplied identifier verbatim (unchanged rendering, now normative).
