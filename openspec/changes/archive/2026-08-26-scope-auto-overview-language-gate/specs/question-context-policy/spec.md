## MODIFIED Requirements

### Requirement: Register the renamed crystallization selector

The centralized pinned-anatomy exemption registry SHALL identify the crystallization-close selector as `Auto (sai-1 + sai-2)` / `Auto (fast implementation)` / `Manual` and SHALL keep the exact wording and option order owned by the shared explore selector contract.

#### Scenario: Question policy names the current selector

- **WHEN** the question-context policy lists the crystallization-close selector exemption
- **THEN** it names the three current displayed labels and does not restore the generic Auto label
