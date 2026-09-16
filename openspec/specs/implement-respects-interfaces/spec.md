# implement-respects-interfaces Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements

### Requirement: Implementation plan conforms to interfaces.md signatures

When `interfaces.md` exists for the change, `sai-3-implement` SHALL treat its per-step `**Interfaces**` block as the authoritative declaration of public signatures for that Step. Every function/method signature, exported type, and public surface it generates into `implementation.md` for Step N SHALL match the signature declared under the matching `## Step N` in `interfaces.md`. The generated plan SHALL NOT introduce a public signature that contradicts the one declared in `interfaces.md`.

#### Scenario: Step declares a public signature in interfaces.md

- **WHEN** `sai-3-implement` generates the GREEN block for a Step whose `## Step N` in `interfaces.md` declares a function signature
- **THEN** the signature in the generated `implementation.md` code matches the declared signature (name, parameters, return/exported type) exactly

#### Scenario: interfaces.md is absent

- **WHEN** no `interfaces.md` exists for the change
- **THEN** `sai-3-implement` generates `implementation.md` from `tasks.md`/`design.md` as before, with no interface-conformance gating

### Requirement: Unsatisfiable signature halts for a coordinator/human amendment
When sai-3-implement determines that a signature declared in interfaces.md cannot be honored or any other sai-2 input blocks planning with a defective artifact, it SHALL resolve by fast-track state. Without fast-track it SHALL STOP and surface the conflict as an interface amendment request without amending autonomously and without generating a divergent signature. With fast-track it SHALL escalate sai-1 defects always, escalate sai-2 defects with no correction path as today, escalate sai-2 defects with multiple preserving paths for ambiguity, and auto-correct only a sai-2 defect with exactly one preserving path as amend before regenerating implementation.md.

#### Scenario: Declared signature conflicts with a real API
- **WHEN** honoring a signature declared in interfaces.md is not possible because it conflicts with the actual stack or an existing API
- **THEN** sai-3-implement STOPs, reports the specific conflict and the signature involved, and requests a human/coordinator-mediated interface amendment rather than editing interfaces.md itself or emitting a divergent signature

#### Scenario: Single preserving sai-2 defect auto-corrects under fast-track
- **WHEN** fast-track implement encounters a defective sai-2 artifact with exactly one preserving correction
- **THEN** it corrects the sai-2 artifacts in place and regenerates implementation.md as if amend was chosen

### Requirement: Concrete assertions are single-sourced in interfaces.md

When `interfaces.md` exists, `sai-3-implement` SHALL NOT emit concrete test scenarios or exact assertion values (expected input → expected output) into `implementation.md`. The exact assertions live only in `interfaces.md`; `implementation.md`'s RED block references the step's scenarios at the high level the plan template already uses (a scenario bullet list) without restating the concrete assertion values.

#### Scenario: Testable step with assertions in interfaces.md

- **WHEN** `sai-3-implement` generates a testable Step whose exact assertions are declared under `## Step N` in `interfaces.md`
- **THEN** the generated RED block lists the scenarios to cover but does not restate the concrete expected-value assertions, which remain single-sourced in `interfaces.md`

### Requirement: Fast-track auto-correction audit and overview regeneration boundary
Every fast-track auto-correction SHALL be recorded in the worker summary with corrected sai-2 paths plus the single preserving rationale and in implementation.md as a fast-track correction note with the corrected paths. The worker SHALL never write fast_track_active to any file, dotfile, or configuration, and SHALL never correct change-overview.md directly since it regenerates through the design overview lifecycle.

#### Scenario: Auto-correction leaves audit trail without state writes
- **WHEN** fast-track implement auto-corrects a single preserving sai-2 defect
- **THEN** the summary carries corrected paths plus rationale and implementation.md carries the correction note with no state value written
