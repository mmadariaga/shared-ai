# pipeline-convergence-loop Specification

## Purpose

Define severity-driven repetition of independent review for supervised spec artifacts.

## Requirements

### Requirement: Pipeline review repeats until the severity stop condition is met

After supervised spec artifacts are generated, the pipeline SHALL run a fresh isolated review pass and process every returned finding through the artifact feedback gate's machine-feedback adapter. If that pass contains any `High` finding and another review pass remains within the iteration bound, the pipeline SHALL run another fresh isolated review over the resulting artifacts. It SHALL stop repeating when a completed pass contains no `High` findings or when the iteration bound is exhausted.

#### Scenario: accepted correction requires validation
- **WHEN** a review pass returns a `High` finding and feedback processing changes an artifact
- **THEN** the pipeline runs a fresh isolated review pass when the iteration bound permits
- **AND** it does not claim convergence from the worker's correction alone

#### Scenario: discarded High finding is reported again
- **WHEN** feedback processing legitimately discards a `High` finding and a later fresh reviewer returns an equivalent `High` finding
- **THEN** the later finding still prevents convergence
- **AND** its feedback disposition is evaluated and reported as a finding of that pass

### Requirement: Each review pass preserves independent review and feedback ownership

Every pass in the convergence loop SHALL use a fresh independently isolated reviewer under the pipeline-independent-review context contract. The spec-proposal worker SHALL retain exclusive ownership of artifact edits, per-item legitimacy evaluation, and specific discard reasons through the existing machine-feedback adapter; pipeline supervision SHALL NOT edit artifacts or silently suppress findings.

#### Scenario: pipeline starts a re-review
- **WHEN** another review pass is required after feedback processing
- **THEN** the pipeline dispatches a fresh reviewer without prior reviewer state or worker reasoning history
- **AND** all edits remain owned by the same spec-proposal worker continuation

### Requirement: Non-blocking findings do not trigger another pass

When a completed review pass contains no `High` findings, the pipeline SHALL process and report any `Medium` and `Low` findings through the existing feedback behavior, then SHALL declare convergence without scheduling another review pass. If that processing accepts artifact edits, supervision SHALL state that the last completed review found no `High` findings before those non-blocking edits and that the resulting artifact state was not re-reviewed; it SHALL NOT claim that the edited state contains no `High` findings.

#### Scenario: final pass contains Medium and Low findings
- **WHEN** a completed pass returns `Medium` or `Low` findings but no `High` finding
- **THEN** those findings receive normal per-item feedback processing
- **AND** the pipeline declares convergence after that processing
- **AND** it schedules no additional review pass

#### Scenario: final non-blocking finding changes an artifact
- **WHEN** a pass with no `High` findings accepts an artifact edit for a `Medium` or `Low` finding
- **THEN** the pipeline does not schedule another review pass on account of that non-blocking edit
- **AND** supervision reports that the edit was not re-reviewed
- **AND** it describes the stop condition as no `High` findings in the last reviewed state rather than the resulting edited state
