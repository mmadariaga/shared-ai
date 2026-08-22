**Complexity**: high

## Why

The OpenSpec schema templates duplicate write-time SAI contracts that the pipeline does not read, so parity maintenance creates drift instead of preserving an authoritative source. This change makes the schema files descriptive, points them to the command-owned contracts, and tests the authority boundary directly.

## What Changes

- Reduce the review, security, performance, accessibility, and implementation schema templates to descriptive skeletons; the four report templates retain their discoverable titles, metadata, headings, and closing tally descriptions, while implementation mirrors the real Goal/Prerequisites/Step-by-Step plan shape with conditional RED/GREEN sections.
- Add a final HTML-comment write-time authority pointer to each schema template, using `sai/commands/implement/implementation-plan.template.md` for the implementation artifact and naming the delegated contract areas beside each pointer.
- Replace the five detailed schema instruction blocks with the exact two-sentence informative-pointer formula, while leaving schema graph keys and apply behavior unchanged.
- Replace the report-template parity test with an authority-pointer test that verifies pointer scope, target existence, fenced-payload heading correspondence for all five templates, the real conditional implementation step shape, and the absence of duplicated body field labels.
- Retire the active report-template-parity capability through a REMOVED delta, preserve ADR 0106b as historical content, add a superseding ADR, and change only the five index references that currently point to the report-template parity decision.
- Preserve setup's recursive schema-copy behavior and avoid modifying command-owned SAI contracts, existing rendered changes, archived artifacts, or design-phase artifacts.

## Capabilities

### New Capabilities

- `schema-template-authority`: schema-side artifact templates are descriptive skeletons whose command-owned write-time contracts are authoritative and discoverable through tested pointers.

### Modified Capabilities

- `report-template-parity`: remove the obsolete parity requirements and migrate consumers to the schema-template-authority pointer contract.

## Impact

- `openspec/schemas/sai-workflow/templates/review.md`
- `openspec/schemas/sai-workflow/templates/security.md`
- `openspec/schemas/sai-workflow/templates/performance.md`
- `openspec/schemas/sai-workflow/templates/accessibility.md`
- `openspec/schemas/sai-workflow/templates/implementation.md`
- `openspec/schemas/sai-workflow/schema.yaml`
- `test/report-template-authority.test.js` (replaces `test/report-template-parity.test.js`)
- `docs/adr/0158-schema-report-templates-point-to-write-time-authority.md`
- `docs/adr/0000-INDEX.md` (five report-template references only)
- `openspec/specs/report-template-parity/spec.md` (capability retired through a REMOVED delta)
- `GLOSSARY.md` (replace the retired parity term with the authority terminology)

The matching `sai/commands/**` write-time owners are read-only references. `bin/setup.js`, `openspec/specs/schema-copy/spec.md`, `openspec/specs/instruction-output-templates/spec.md`, the existing ADR 0106b, `0106a-run-path-baseline-predicate`, existing `openspec/changes/**`, and archive artifacts are not modified by this change.

## Proposal Research Documentation

**Local files**:

- `openspec/schemas/sai-workflow/templates/change-overview.md`
- `openspec/schemas/sai-workflow/schema.yaml`
- `test/change-overview-contract.test.js`
- `test/report-template-parity.test.js`
- `docs/adr/0106b-keep-both-report-template-families-pinned-parity.md`
- `docs/adr/0106a-run-path-baseline-predicate.md`
- `docs/adr/0000-INDEX.md`
- `bin/setup.js`
- `openspec/specs/schema-copy/spec.md`
- `openspec/specs/instruction-output-templates/spec.md`
- `openspec/specs/report-template-parity/spec.md`
- `sai/commands/review/review-report.template.md`
- `sai/commands/security/security-report.template.md`
- `sai/commands/performance/performance-report.template.md`
- `sai/commands/accessibility/accessibility-report.template.md`
- `sai/commands/implement/implementation-plan.template.md` (implementation authority)
- `sai/commands/apply/invocation.md` (per-Step STOP & COMMIT and terminal documentation commit-authorization gates)
- `GLOSSARY.md`

**External URLs**: None

## Additional Notes

- No file under `sai/` is changed; the command-owned contracts remain the write-time sources of truth.
- The five schema artifact graph keys (`generates`, `requires`, `description`, `apply.requires`, and `apply.tracks`) and the separate top-level `apply.instruction` block remain byte-for-byte unchanged; only the five artifact-level `instruction` blocks become pointers.
- The implementation authority points to `sai/commands/implement/implementation-plan.template.md`; any retained STOP & COMMIT cross-reference points to `sai/commands/apply/invocation.md` and names the per-Step STOP & COMMIT and terminal documentation commit-authorization gates, rather than the dissolved `sai/commands/apply/instructions.md` path.
- Each report authority pointer names the delegated severity vocabulary, evidence rules, finding shape, and tally line; the implementation pointer names its planning, RED/GREEN, and STOP & COMMIT areas plus the commit-authorization checklist.
- The implementation pointer deliberately uses the exact implementation-specific delegated areas `planning`, `conditional RED/GREEN`, `verification`, `STOP & COMMIT`, and `commit-authorization checklist` instead of the report-only severity vocabulary, evidence rules, finding shape, and tally line labels.
- `openspec/specs/instruction-output-templates/spec.md` needs no amendment because the command-owned instruction output contracts remain untouched; this change only retires the schema-side parity relationship and adds pointers to those unchanged contracts.
- Consumer projects that do not rerun setup retain their already-copied full templates; no migration or version marker is added, and that compatibility outcome is deliberate.
- Only `proposal.md` and `specs/**` are generated in this spec phase; `design.md`, `tasks.md`, and `interfaces.md` are intentionally excluded.
