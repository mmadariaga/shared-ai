# panel-stamp Specification

## Purpose
TBD - created by archiving change replace-emitted-on-with-validated-at. Update Purpose after archive.
## Requirements
### Requirement: Stamps come from the observation verdict only
A progress step SHALL carry exactly one Milestone Stamp only when it renders completed. The stamp value SHALL be the validated_at of the verdict that marked the step, rendered as HH:mm with no conversion.

#### Scenario: Closure stamps from verdicts
- **WHEN** a progress verdict marks steps or a terminal completed verdict closes remaining steps
- **THEN** each newly completed step receives one stamp from that verdict's validated_at

### Requirement: Stamping needs no coordinator clock
The coordinator SHALL issue no wall-clock call for stamps and prompt and panel SHALL share one validator-observed clock. Needs_input, failed, and cancelled SHALL leave stamps unchanged.

#### Scenario: Panel shares the prompt clock without new reads
- **WHEN** the coordinator renders any stamped list
- **THEN** every stamp comes from validator-observed values with no new time call

