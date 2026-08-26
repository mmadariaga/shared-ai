## MODIFIED Requirements

### Requirement: Identify the direct build selector route

The direct code-first selector route SHALL be named Build (unattended) with identity `build-unattended`. It SHALL preserve its existing worker order, per-slice authorization, bounded review behavior, and local commit boundary.

#### Scenario: direct route is selected

- **WHEN** Build (unattended) is selected
- **THEN** the existing direct code-first flow starts under `build-unattended` without changing its execution order.
