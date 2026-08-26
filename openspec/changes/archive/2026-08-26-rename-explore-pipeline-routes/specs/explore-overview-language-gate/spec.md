## MODIFIED Requirements

### Requirement: Apply overview-language routing to Plan

The overview-language value SHALL remain conversation-only and SHALL be forwarded through the supervised Plan route only. Build SHALL retain its documented no-op treatment for overview-language selection.

#### Scenario: overview routing remains bounded

- **WHEN** a crystallization route is selected with an overview-language value
- **THEN** only the Plan route forwards that value to supervised design processing.
