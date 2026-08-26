## MODIFIED Requirements

### Requirement: Forward Plan envelopes unchanged

Plan (unattended) SHALL preserve the existing supervised worker envelopes, including their markers, selected block content, flag ordering, and phase transition forwarding rules.

#### Scenario: Plan forwards a worker request

- **WHEN** Plan dispatches a supervised worker
- **THEN** the existing one-string envelope is forwarded with only the route terminology changed outside the worker protocol.
