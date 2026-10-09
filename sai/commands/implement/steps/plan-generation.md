# Implement Step — Plan Generation

Active step: plan-generation. Generate the full `implementation.md` plan, then report the `plan-generation` progress event per the worker contract.

### Generate the full implementation

**Re-run preamble.** Before generating, check whether `openspec/changes/{change-name}/implementation.md` existed at the start of this run (equivalently: whether the collapse step ran). The check keys on **file presence**, not on the count of steps the collapse step collapsed — a file where every step is VERIFY-PENDING (code applied, verification pending) has zero collapsed steps but MUST still be preserved.

- **If the file does NOT exist (first run):** take the **first-run generation path** below.
- **If the file exists (re-run):** take the **re-run preservation path** below. Do NOT fall through into implementation-plan-template regeneration on a re-run.

<research_task>

Run this research before generating. Confirm conventions from the supplied material and gap-driven research per the Planning Evidence rule in `steps/common.md`; `tasks.md`'s `## Required Documentation`
and `## Implementation Context` are the primary source of truth.

1. Codebase Verification
   - Use the files from `## Required Documentation` that your Steps need, and the files `tasks.md` or `interfaces.md` name as affected, to confirm existing conventions (layout, naming, error handling, logging, testing patterns, permission boundaries).
   - If a convention needed for code generation is not nailed down by the supplied material, it is a gap: resolve it as `steps/common.md` Planning Evidence prescribes.
   - Build/test/run commands come from the Expertise Profile or AGENTS.md if listed.

2. Domain Language
   - Read the project-root `GLOSSARY.md` (`./GLOSSARY.md`) if it exists — this is its single canonical location; do not fall back to `openspec/changes/{name}/`. Interpret its structure (Language, Relationships, Example dialogue, Flagged ambiguities) per `@sai/policies/glossary-format.md`, fetched by `steps/common.md`.
   - Use its canonical terms for all new identifiers (classes, functions, files, variables) in the generated plan.
   - If the spec introduces a term not in `GLOSSARY.md`, use the exact term from the spec and do not invent synonyms.

</research_task>

#### First-run generation path

- Create one full markdown file using the implementation plan template, including:
  - Complete code for each step
  - Precise file locations
  - Checkboxes for every action
  - In each RED test checkbox, the scenarios to cover at a high level. When `interfaces.md` exists, its concrete expected values stay single-sourced there; otherwise sai-4-apply expands the scenarios into assertions during RED.
  - Concrete Step-scoped verification instructions (common Hard Rules, **Verification commands**)
  - STOP & COMMIT markers after each step
  - No placeholders, no TODOs, no ambiguity
- All code MUST strictly follow the Expertise Profile from `tasks.md`
- **Interface conformance**: When `interfaces.md` exists for this change, treat its per-step `**Interfaces**` block as the authoritative declaration of public signatures for that Step. Every function/method signature, exported type, and public surface generated into `implementation.md` for Step N SHALL match the signature declared under the matching `## Step N` in `interfaces.md`. The generated plan SHALL NOT introduce a public signature that contradicts the one declared in `interfaces.md`.
- **Absent-`interfaces.md` fallback**: If no `interfaces.md` exists for the change, generate `implementation.md` from `tasks.md`/`design.md` as before, with no interface-conformance gating.
- **Unsatisfiable signature / defective sai-2 artifact**: If a signature declared in `interfaces.md` cannot be honored (for example it is inconsistent with the stack, an existing API, or another Step's contract), or any other `sai-2` input (`design.md`, `tasks.md`, `interfaces.md`) blocks planning with a defective artifact, resolve as follows:
  - Without fast-track (`fast_track_active=false`, outside `sai-build`): return `needs_input` presenting the conflict as an interface amendment request. Do NOT amend the interface autonomously, and do NOT silently generate a divergent signature to work around the conflict.
  - With fast-track (`fast_track_active=true`): apply the single-preserving-fix rule. A defect in `sai-1` (`proposal.md`, `specs/**`) always escalates, never auto-corrects. A defect in `sai-2` with no correction path escalates. A defect in `sai-2` with multiple preserving correction paths escalates for ambiguity without auto-picking. Only a defect in `sai-2` with exactly one correction path that preserves the proposal objective auto-corrects directly — same effect as if the user had chosen `amend` — by writing the `sai-2` artifacts in place and then regenerating `implementation.md`. Never write `fast_track_active` to any file and never correct `change-overview.md` directly — it regenerates through the design overview lifecycle. Record every auto-correction in `implementation.md` as a fast-track correction note with the corrected paths, and in the worker `summary`.
- Before writing any Verification Checklist, determine whether the step's output is observable in the browser at this point (i.e., the component or change is already rendered in the app). Apply the following rules:
  - **Automated checks** (lint, build, typecheck, Step-scoped unit tests): include in the step where they apply. The agent runs these before stopping.
  - **Functional checks** (observable browser/UI behavior): only include them in the step where the behavior is first observable. If a step creates a component not yet integrated into any page or layout, defer all its Functional checks to the integration step.
  - **Deferred checks**: at the integration step, group all deferred Functional checks before the step's own Functional checks, using labeled blocks per origin step (see the implementation plan template).
  - **Service-side / non-UI steps** (no observable browser behavior anywhere — config, migration, scaffolding, or service-side logic): omit the `**Functional (...)**` header entirely and emit a single italic parenthetical note explaining why no functional check applies (e.g. `*(No Functional checks — service-side step with no observable browser behavior.)*`). Do NOT invent a `- [ ] No functional check required` (or any equivalent placeholder) checkbox. This differs from a deferred check: a deferred check's functional verification lands at a later integration step, whereas a service-side step has no functional check anywhere.
- **Design carry-through:** apply the `Existing tests to update`, `Manual Verification`, and `Migration Plan` hard rules in `steps/common.md`, reading `Existing Tests Broken` from `tasks.md` and the other two from `design.md`.
- **RED → GREEN and test retirements:** apply the RED → GREEN, Valid RED failure, RED phase code contract, and Test retirements hard rules in `steps/common.md`.
- **Audit artifacts on a first run (rare):** If any of `review.md`, `security.md`, `performance.md`, `accessibility.md` exists in `openspec/changes/{change-name}/`, use the Apply/Discard classification from `artifact-analysis` and append one audit step per existing artifact after the last template-derived step, emitting the Apply code actions + Discarded findings sub-block. Each audit step heading is exactly `#### Step N: Address <kind> findings`, with `<kind>` one of `review`, `security`, `performance`, `accessibility`. No slot is added to the implementation plan template — audit steps are generated dynamically. Number the first audit step strictly after the highest `#### Step N:` number in the generated plan; continue N+2, N+3, … for subsequent artifacts. For each appended audit step, also manage `interfaces.md` contracts per the **Audit-step interface contracts** rule in `steps/audit-ingestion.md`, already loaded by `artifact-analysis`.

#### Re-run preservation path

When `implementation.md` already exists at run start, Fetch @sai/commands/implement/steps/rerun-preservation.md and follow it instead of regenerating from the template. Only in this case; on a first run, skip it silently.

---

The template below applies to the first-run generation path only.

Fetch @sai/commands/implement/implementation-plan.template.md
