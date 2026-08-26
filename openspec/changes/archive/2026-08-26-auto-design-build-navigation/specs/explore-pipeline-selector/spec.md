## MODIFIED Requirements

### Requirement: Authorize Auto dispatch

Selecting `Auto` SHALL authorize the existing supervised `sai-1` and `sai-2` lifecycle using `last_crystallization_set` while preserving worker-owned writes, review rounds, chaining, retries, and the existing worker boundaries. Successful Auto completion SHALL emit exactly one composition-aware next-step line, `Next step: run /sai-build {name}.`, and SHALL NOT dispatch a later implementation phase. Successful Auto completion SHALL NOT emit the obsolete `sai-3 was not run.` text. When a selected Auto run returns `failed` or `cancelled`, explore SHALL emit exactly one localized user-facing guidance line naming the phase at which the run stopped: `/sai-1-spec` when the selected name was routed to the spec phase because it was absent from `specs_converged_changes`, or `/sai-2-design` when it was routed to a design-phase retry because it was present in `specs_converged_changes` and absent from `completed_changes`. The phase-specific line SHALL not dispatch a later implementation phase, change the retry state, or introduce another state key.

#### Scenario: Auto is selected

- **WHEN** the user selects Auto from the crystallization-close selector
- **THEN** the supervisor selects at most one eligible latest-turn change and dispatches the existing phase machinery without expanding write scope

#### Scenario: Auto reaches a successful terminal state

- **WHEN** the selected Auto run completes its applicable supervised `sai-1` and `sai-2` lifecycle successfully
- **THEN** explore reports the completed supervised run, emits exactly one `Next step: run /sai-build {name}.` line, emits no `sai-3 was not run.` text, and does not dispatch a later implementation phase

#### Scenario: Auto fails or is cancelled

- **WHEN** the selected Auto run returns `failed` or `cancelled`
- **THEN** explore does not facilitate a later implementation phase, emits exactly one localized guidance line naming the applicable stopped phase, and the change remains retryable under the existing Auto state rules
