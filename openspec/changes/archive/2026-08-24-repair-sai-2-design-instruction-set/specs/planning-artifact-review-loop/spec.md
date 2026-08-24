## MODIFIED Requirements

### Requirement: worker-owned-review-pass
The spec-proposal worker SHALL own an automated artifact review of the artifacts its phase just wrote, subject to `supervised-marker-suppresses-automatic-loop`. The design review path SHALL instead consume externally supplied findings through the canonical feedback and artifact-review contracts and SHALL support a no-findings completion branch without creating a duplicate automatic reviewer loop. A **review pass** on the spec path is one complete unit: exactly one reviewer run plus the worker's processing of every finding that run returns. Per-finding processing SHALL NOT increment the pass count.

The spec pass's **reviewed set** — the artifacts it judges and the only artifacts its findings may target — SHALL be `proposal.md` and every `specs/**/*.md` of the resolved change. The design review's externally supplied findings may target only `design.md`, `tasks.md`, and `interfaces.md` of the resolved change. A spec reviewer additionally receives a read-only **reference set** as defined by `reviewer-isolation-and-read-only-input`.

When the supervision marker is absent, the spec worker's first automatic pass SHALL run only after its pre-completion verification and decision-summary derivation have finished, and before it returns its terminal `completed` payload. The design worker SHALL not dispatch an automatic reviewer; its review step completes only from a valid externally supplied findings block under the worker card's external-findings contract. The design review remains before the coordinator's feedback gate and before overview generation.

Concretely: when not suppressed, the spec worker SHALL run its first pass only after `proposal.md` is non-empty, at least one non-empty `specs/**/*.md` exists, and artifact verification, the self-consistency and source-grounding checks, and decision-summary derivation are complete — that is, after the `validation` progress event. The design worker SHALL verify `design.md`, `tasks.md`, and `interfaces.md`, derive its decision summary, and then consume any externally supplied review evidence without dispatching reviewer machinery.

When the supervision marker is present, the spec automatic first pass SHALL NOT run; the spec phase still completes its verification and decision-summary derivation and proceeds to the ordinary pre-gate terminal without automatic reviewer dispatch. The design path remains external-findings-only in either mode.

Every completed spec pass SHALL close with the base-form severity tally single-sourced in `sai/policies/artifact-review-contract.md`.

#### Scenario: spec worker runs a pass before completing when not supervised
- **WHEN** the spec worker has written a non-empty `proposal.md` and at least one non-empty `specs/**/*.md` and the invocation does not carry `--supervised`
- **THEN** it SHALL run a review pass over exactly that artifact set before returning `completed`

#### Scenario: validation precedes review in the spec phase when not supervised
- **WHEN** the spec worker runs its first automatic review pass
- **THEN** artifact verification, the self-consistency and source-grounding checks, and decision-summary derivation SHALL already be complete
- **AND** the `validation` progress event SHALL already have been emitted, so any `review` event necessarily follows it

#### Scenario: external design findings complete the review path
- **WHEN** valid external design-review evidence is supplied for `design.md`, `tasks.md`, or `interfaces.md`
- **THEN** the design worker SHALL process it through the canonical feedback and artifact-review contracts
- **AND** it SHALL dispatch no automatic reviewer or duplicate review loop

#### Scenario: external design review reports no findings
- **WHEN** valid external design-review evidence reports no findings
- **THEN** the design review SHALL complete through the no-findings branch without dispatching reviewer machinery

#### Scenario: per-finding processing does not count as a pass
- **WHEN** a single spec reviewer run returns several findings and the worker processes them one at a time
- **THEN** the whole reviewer run plus all of that processing SHALL count as exactly one pass

#### Scenario: supervised invocation skips the automatic spec pass
- **WHEN** the spec worker finishes pre-completion verification under a `--supervised` invocation
- **THEN** it SHALL NOT run an automatic review pass before returning `completed`
- **AND** the `review` step SHALL remain unmarked by the automatic path

#### Scenario: external-no-findings-completes-review
- **WHEN** valid external design-review evidence reports no findings
- **THEN** the design review completes through the no-findings branch without dispatching reviewer machinery.

