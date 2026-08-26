## MODIFIED Requirements

### Requirement: Gate supervised Auto before phase dispatch

The supervised pipeline SHALL resolve gate 9 immediately after dispatchable deterministic selection and before `active_change` is set or the first spec worker is dispatched. The displayed `Auto (sai-1 + sai-2)` option SHALL map to internal route `Auto`, and the route SHALL never dispatch implementation.

#### Scenario: Supervised Auto starts only after gate resolution

- **WHEN** the displayed supervised option confirms a dispatchable change
- **THEN** gate 9 resolves before the first spec worker and the route remains limited to `sai-1` and `sai-2`

### Requirement: Preserve conversation-only retry state

A resolved overview language SHALL remain available for a retry over the same crystallized set, including after failure or cancellation, and SHALL reset for a materially new idea without being persisted.

#### Scenario: Design retry reuses the prior resolution

- **WHEN** a later Auto attempt selects the same crystallized set after a failed supervised attempt
- **THEN** the retry reuses the prior language without asking gate 9 again
