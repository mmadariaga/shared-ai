**Complexity**: high (12 instruction/template files, no workflow behavior change)

## Why

Six large generated-artifact templates are embedded in phase instructions, making those prompts harder to review and maintain independently. Extracting each contract into `sai/instructions/_templates/` reduces parent-instruction size while preserving the existing generated artifacts and their validation behavior.

## What Changes

- Extract the implementation plan template from `sai/instructions/implement.md` into `sai/instructions/_templates/implementation-plan.md`.
- Extract the code review report template from `sai/instructions/review.md` into `sai/instructions/_templates/review-report.md`.
- Extract the security report template from `sai/instructions/security.md` into `sai/instructions/_templates/security-report.md`.
- Extract the performance report template from `sai/instructions/performance.md` into `sai/instructions/_templates/performance-report.md`.
- Extract the accessibility report template from `sai/instructions/accessibility.md` into `sai/instructions/_templates/accessibility-report.md`.
- Extract the pull request body template from `sai/instructions/pr.md` into `sai/instructions/_templates/pr-body.md`.
- Replace each inline template body and every residual `<plan_template>` or `<output_template>` reference with an exact-path load or stable reference to its dedicated template while retaining the surrounding phase instructions.
- Require content-equivalence, no-dangling-marker, and per-harness projection verification for the extracted templates.
- Preserve recursive installation through the existing `sai-instructions` manifest projection for Claude Code, opencode, and GitHub Copilot.
- Keep `sai/compat/_templates/adr-index.md` and its explicit compatibility projection unchanged.

## Capabilities

### New Capabilities

- `instruction-output-templates`: Dedicated, independently loadable output templates for the six SAI instruction phases, with unchanged generated-artifact contracts.

### Modified Capabilities

- None.

## Impact

Affected instruction and template paths:

- `sai/instructions/implement.md`
- `sai/instructions/review.md`
- `sai/instructions/security.md`
- `sai/instructions/performance.md`
- `sai/instructions/accessibility.md`
- `sai/instructions/pr.md`
- `sai/instructions/_templates/implementation-plan.md`
- `sai/instructions/_templates/review-report.md`
- `sai/instructions/_templates/security-report.md`
- `sai/instructions/_templates/performance-report.md`
- `sai/instructions/_templates/accessibility-report.md`
- `sai/instructions/_templates/pr-body.md`

The existing recursive `sai-instructions` projection in `sai/install-manifest.json` is relied upon and does not need to change. No production code, OpenSpec-owned skill, generated artifact schema, compatibility template, dependency, API, or workflow phase changes.

## Proposal Research Documentation

**Local files**: `sai/instructions/implement.md` (inline `<plan_template>`), `sai/instructions/review.md`, `sai/instructions/security.md`, `sai/instructions/performance.md`, `sai/instructions/accessibility.md`, `sai/instructions/pr.md` (inline `<output_template>` blocks); `sai/install-manifest.json` (`sai-instructions` recursive projection and explicit ADR compatibility projection); `openspec/specs/spec-quality/spec.md`; `GLOSSARY.md`.

**External URLs**: None.

## Additional Notes

- Each extracted template remains independent because its headings, severity model, optional sections, placeholders, and validation rules differ materially.
- Parent instructions retain their save, presentation, feedback, rerun, audit, and stop behavior; only the source location of the template text changes.
- The generated artifacts remain `implementation.md`, `review.md`, `security.md`, `performance.md`, `accessibility.md`, and `pr.md` under `openspec/changes/{change-name}/`.
- The stale `openspec/specs/adr-index-maintenance/spec.md` reference to `sai/instructions/_templates/adr-index.md` remains outside this change. Resolving that pre-existing ADR-template path discrepancy is a separate compatibility-spec change; this change keeps the active `sai/compat/_templates/adr-index.md` source and its manifest projection unchanged.
