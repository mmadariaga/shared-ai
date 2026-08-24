## MODIFIED Requirements

### Requirement: Metadata-only validation warnings

The sai-1 worker SHALL return validation warnings as an ordered metadata-only `validation_report.warnings` extension with `spec_assertion`, `other_side`, and `disagreement` fields, and SHALL return an empty warning list when no warning applies.

#### Scenario: Validation finds an ambiguity

- **WHEN** proposal/spec consistency or source-grounding validation finds an unresolved warning
- **THEN** the worker SHALL return the warning metadata without returning formatted warning text or artifact contents.

### Requirement: Coordinator-owned warning rendering

The standalone coordinator and Explore supervisor SHALL render validation warnings after the worker summary and before the artifact feedback gate using the canonical warning format.

#### Scenario: A completed worker result includes warnings

- **WHEN** a completed sai-1 result carries `validation_report.warnings`
- **THEN** the receiving coordinator or supervisor SHALL render each ordered warning before presenting the applicable gate.
