# coordinator-self-correction Specification

## Purpose
TBD - created by archiving change generalize-unattended-recovery. Update Purpose after archive.

## Requirements

### Requirement: The coordinator corrects input it authored and re-dispatches

In an unattended lane, when the cause of a failure lies in input the coordinator authored (a non-agreed part of the block, the envelope, or continuation text), the coordinator SHALL correct that input and re-dispatch the worker, within the limits of the resilience rule. Whoever owns the cause SHALL correct it: the coordinator for input it authored, otherwise the worker through a continuation its contract accepts.

#### Scenario: A coordinator-authored envelope defect

- **WHEN** a worker fails because of a defect in an envelope or continuation text the coordinator wrote
- **THEN** the coordinator corrects that text and re-dispatches the worker

### Requirement: Agreed content is never altered by a correction

A correction SHALL pass agreed content (What, Why, Edge Cases, Implementation Details, scope, and Key constraints) through unchanged. A correction that needs a change to agreed content SHALL be treated as a contradiction for the user to decide.

#### Scenario: The cause lies in agreed content

- **WHEN** a failure can only be resolved by changing agreed content
- **THEN** the coordinator stops and explains the contradiction instead of editing the content
