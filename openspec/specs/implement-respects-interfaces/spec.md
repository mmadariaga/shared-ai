# implement-respects-interfaces Specification

## ADDED Requirements

### Requirement: Implementation plan conforms to interfaces.md signatures

When `interfaces.md` exists for the change, `sai-3-implement` SHALL treat its per-step `**Interfaces**` block as the authoritative declaration of public signatures for that Step. Every function/method signature, exported type, and public surface it generates into `implementation.md` for Step N SHALL match the signature declared under the matching `## Step N` in `interfaces.md`. The generated plan SHALL NOT introduce a public signature that contradicts the one declared in `interfaces.md`.

#### Scenario: Step declares a public signature in interfaces.md

- **WHEN** `sai-3-implement` generates the GREEN block for a Step whose `## Step N` in `interfaces.md` declares a function signature
- **THEN** the signature in the generated `implementation.md` code matches the declared signature (name, parameters, return/exported type) exactly

#### Scenario: interfaces.md is absent

- **WHEN** no `interfaces.md` exists for the change
- **THEN** `sai-3-implement` generates `implementation.md` from `tasks.md`/`design.md` as before, with no interface-conformance gating

### Requirement: Unsatisfiable signature halts for a coordinator/human amendment

When `sai-3-implement` determines that a signature declared in `interfaces.md` cannot be honored (for example it is inconsistent with the stack, an existing API, or another Step's contract), it SHALL STOP and surface the conflict as an interface amendment request to the coordinator/human. It SHALL NOT amend the interface autonomously, and SHALL NOT silently generate a divergent signature to work around the conflict.

#### Scenario: Declared signature conflicts with a real API

- **WHEN** honoring a signature declared in `interfaces.md` is not possible because it conflicts with the actual stack or an existing API
- **THEN** `sai-3-implement` STOPs, reports the specific conflict and the signature involved, and requests a human/coordinator-mediated interface amendment rather than editing `interfaces.md` itself or emitting a divergent signature

### Requirement: Concrete assertions are single-sourced in interfaces.md

When `interfaces.md` exists, `sai-3-implement` SHALL NOT emit concrete test scenarios or exact assertion values (expected input → expected output) into `implementation.md`. The exact assertions live only in `interfaces.md`; `implementation.md`'s RED block references the step's scenarios at the high level the plan template already uses (a scenario bullet list) without restating the concrete assertion values.

#### Scenario: Testable step with assertions in interfaces.md

- **WHEN** `sai-3-implement` generates a testable Step whose exact assertions are declared under `## Step N` in `interfaces.md`
- **THEN** the generated RED block lists the scenarios to cover but does not restate the concrete expected-value assertions, which remain single-sourced in `interfaces.md`
