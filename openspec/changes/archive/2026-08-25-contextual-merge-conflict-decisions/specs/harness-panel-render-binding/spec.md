# harness-panel-render-binding Specification

## MODIFIED Requirements

### Requirement: Merge adaptive TODO includes contextual analysis

The coordinator-owned merge panel SHALL include `contextual-analysis` between conflict scope selection and resolution. The panel SHALL remain exclusively coordinator-rendered and SHALL not be emitted or controlled by the worker.

#### Scenario: Contextual analysis owns the pending route

- **WHEN** a conflicted merge reaches contextual analysis
- **THEN** the coordinator renders the contextual TODO item and keeps the resolution item pending until the worker returns complete selected alternatives
