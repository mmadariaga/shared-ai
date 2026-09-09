# lightweight-probe Specification

## Purpose
TBD - created by archiving change explore-own-maturation. Update Purpose after archive.
## Requirements
### Requirement: Lightweight probe SHALL NOT replace the formal edge-case list

The probe SHALL NOT replace the formal `E1` through `En` list; it SHALL run as a post-list sub-step between the drafted list and the agreement question, and the formal agreement gate SHALL still run before crystallization. When the empty-set rule emits exactly `- None`, no probes run.

#### Scenario: Formal list still gates crystallization

- **WHEN** the lightweight probe has completed
- **THEN** explore still runs the formal edge-case list and its agreement gate before crystallization

### Requirement: Lightweight probe SHALL exercise material probe scenarios after the formal edge-case list

After the formal edge-case list has been drafted and before the agreement question, explore SHALL systematically probe candidate scenarios against the proposed list. Explore SHALL exercise at least 2 scenarios before anything is shown. Explore SHALL show only material probes: a probe is material when its outcome adds, removes, or modifies an `E` item, or clarifies a non-obvious consequence of an existing one. The search SHALL stop when no remaining scenario is material; the floor is a search duty, not a quota to pad with noise. Holes a probe uncovers SHALL be fixed in the list privately, so the list is published already coherent, with no change marks and no explanations. Each shown probe SHALL be a plain direct question with no fixed formula, immediately followed by a self-sufficient prose answer whose `E(N)` citations trail at the end as reference. Probes SHALL serve only this change's edge-case list and SHALL NOT open Implementation details or crystallization decisions.

#### Scenario: Probes run after the drafted list

- **WHEN** explore has drafted the formal edge-case list and before the agreement question
- **THEN** explore exercises at least 2 candidate scenarios against the proposed list before anything is shown

#### Scenario: Only material probes are shown

- **WHEN** a probe's outcome adds, removes, or modifies an `E` item, or clarifies a non-obvious consequence of an existing one
- **THEN** explore shows that probe after the formal list as a plain direct question followed by a self-sufficient prose answer whose `E(N)` citations trail at the end as reference

#### Scenario: Probe-discovered holes are corrected privately

- **WHEN** a probe uncovers a hole in the drafted list
- **THEN** explore fixes the hole privately and publishes the list already coherent, with no change marks and no explanations

#### Scenario: Non-material scenarios are not padded

- **WHEN** no remaining scenario is material
- **THEN** the probe search stops and explore does not pad the emission with non-material probes

