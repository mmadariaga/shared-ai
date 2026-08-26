## MODIFIED Requirements

### Requirement: Name the Plan recovery exception

The Explore item-10 cancellation and diagnosis exception SHALL apply to selector-dispatched Plan (unattended) supervision, retain its existing one-round and same-worker limits, and leave the change retryable when recovery does not complete.

#### Scenario: Plan cancellation enters bounded diagnosis

- **WHEN** a post-resolution Plan worker is cancelled and the diagnosis counter is unused
- **THEN** the existing bounded diagnosis behavior applies without spending the shared recovery ledger.
