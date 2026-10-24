# direct-build-report-recovery Specification

## Purpose
Recover full Direct Build report delivery and validation within existing authority and attempt limits while preserving evidence of completed operations.

## Requirements

### Requirement: Report recovery is autonomous and bounded

The full Direct Build coordinator SHALL recover an accepted report of work actually performed, with ordinary step checks satisfied, using existing per-step attempts and replacement limits. It SHALL choose an evidence-supported approach rather than repeat a known failed mechanism. Recoverable delivery or validity problems SHALL require no user instructions. Missing authority or facts necessary for safe continuation SHALL require intervention. Report corrections SHALL come from their author, never coordinator transcription. This recovery SHALL grant no new mutation authority or validation timeout.

#### Scenario: Recoverable report problem needs no user instructions
- **WHEN** a safe report-delivery recovery or author correction is available within the existing budget
- **THEN** the coordinator pursues that recovery autonomously using an approach supported by the evidence

#### Scenario: Safe continuation lacks authority or facts
- **WHEN** the pending report check cannot continue safely without missing authorization or necessary information
- **THEN** the coordinator requests intervention rather than inferring additional authority

### Requirement: Confirmed effects are independent of report checks

The coordinator SHALL track report delivery, report validity, and independently confirmed repository effects as separate facts. A confirmed archive move or commit SHALL remain confirmed and consume its original authorization even if its report is invalid or the validation call is interrupted. Fresh-result requests SHALL recover the report of existing work without repeating effects. Report-only correction or revalidation SHALL NOT resend an execute order. No-effect recovery SHALL apply only when execution itself failed or remains uncertain.

#### Scenario: Invalid report follows a confirmed commit
- **WHEN** independent evidence confirms archive or commit completion but its report check fails
- **THEN** recovery addresses only the pending report check and neither repeats the operation nor restores its consumed authorization

#### Scenario: Interrupted validation does not erase effects
- **WHEN** validation returns no response after independently confirmed operations
- **THEN** those operations remain confirmed while report acceptance remains unresolved

#### Scenario: Fresh result reports existing work
- **WHEN** a worker receives a fresh-result request after performing work
- **THEN** it reports the existing effects without performing them again

### Requirement: Unresolved closure preserves evidence and reports limits

At the existing exhausted recovery budget, the coordinator SHALL stop and report completed effects and unresolved checks without extending closing checks indefinitely or restarting completed operations. Reports, draft evidence, returned references, and validation evidence SHALL remain available through validation, recovery, interruption, and exhausted or otherwise unresolved closure for same-conversation resumption. Report and draft directories SHALL be closed only after accepted route closure when no continuation or recovery needs them.

#### Scenario: Recovery budget is exhausted
- **WHEN** report verification remains unresolved at the existing attempt limit
- **THEN** the route closes with completed operations and unchecked work identified and retains the evidence instead of repeating execution

#### Scenario: Accepted closure permits cleanup
- **WHEN** route closure is accepted and no continuation or recovery needs the evidence
- **THEN** the coordinator may close the report directory through the transfer helper and apply the same retention condition to draft cleanup

#### Scenario: Interruption preserves references
- **WHEN** validation or recovery is interrupted
- **THEN** reports, drafts, references, and verification evidence remain retained for same-conversation continuation
