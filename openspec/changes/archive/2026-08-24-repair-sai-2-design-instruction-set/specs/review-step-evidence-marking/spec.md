## MODIFIED Requirements

### Requirement: review-step-marked-only-by-a-no-high-pass
The `review` progress step of the spec plan (`spec-progress-plan`) and of the design plan (`design-coordinator`) SHALL be marked from valid review evidence, including an explicit external no-findings result for the design review path, while preserving the rule that a completed worker-owned review pass over that phase's reviewed artifact set reports `High=0`, and never otherwise. `Medium` and `Low` findings SHALL NOT block marking.

Marking SHALL be performed by the phase worker through an ordinary progress event carrying the id `review`, exactly as every other step is marked. The coordinator SHALL NOT become a second marking source, and the deterministic state derivation of `sai/policies/todo-structure.md` SHALL remain untouched.

The evidence SHALL come from the pass itself, never from artifact existence, artifact contents, repository state, plan progression, or the completion of any command. A pass whose reviewer failed, was cancelled, or violated the severity contract produces no evidence and SHALL leave the step unmarked.

#### Scenario: a no-High pass marks the step
- **WHEN** a completed worker-owned review pass reports `High=0`
- **THEN** the worker SHALL emit a progress event carrying `review` and the coordinator SHALL mark that step `completed`

#### Scenario: a pass with High findings does not mark
- **WHEN** a completed pass reports at least one `High` finding
- **THEN** no progress event carrying `review` SHALL be emitted and the step SHALL remain unmarked

#### Scenario: Medium and Low findings do not block marking
- **WHEN** a completed pass reports only `Medium` and/or `Low` findings
- **THEN** the step SHALL be marked, because `High=0`

#### Scenario: an empty completed pass marks
- **WHEN** a completed pass returns no findings at all
- **THEN** the step SHALL be marked, because `High=0`

#### Scenario: external design review reports no findings
- **WHEN** the design review step receives valid external evidence reporting no findings
- **THEN** the worker SHALL emit the ordinary review completion evidence and the coordinator SHALL mark `review` completed

#### Scenario: a failed, cancelled, or contract-violating attempt does not mark
- **WHEN** a reviewer fails, is cancelled, or returns a finding whose severity violates the closed vocabulary
- **THEN** the step SHALL remain unmarked and the outcome SHALL be reported distinctly from outstanding `High` findings

#### Scenario: marking is worker-owned
- **WHEN** the `review` step becomes `completed`
- **THEN** the transition SHALL have originated from a worker progress event, not from coordinator reasoning, artifact reads, or a terminal payload

#### Scenario: a user-requested pass carries the same evidence value
- **WHEN** a pass requested by the user from the feedback gate reports `High=0` while the step is unmarked
- **THEN** the step SHALL be marked, exactly as an automatic pass would have marked it

#### Scenario: a user-requested pass always marks before reconciliation
- **WHEN** a user-requested pass reports `High=0` during a feedback turn
- **THEN** its progress event SHALL be received, marked, and rendered while the gate is still open — that is, strictly before the phase's reconciliation trigger fires
- **AND** the coordinator SHALL handle that event as an ordinary progress-event update, marking the step, re-rendering the list, and stamping it exactly as it stamps any other progress-event update

#### Scenario: no-findings-branch-marks-review
- **WHEN** the design review step receives valid external evidence reporting no findings
- **THEN** the worker emits the ordinary review completion evidence and the coordinator marks the review step completed.

changed_files: []
resolved_change_name: repair-sai-2-design-instruction-set
</task_result>
</task>
