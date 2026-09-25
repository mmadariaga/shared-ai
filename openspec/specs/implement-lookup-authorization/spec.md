# implement-lookup-authorization Specification

## Purpose
TBD - created by archiving change coordinator-owned-fast-track-gates. Update Purpose after archive.

## Requirements

### Requirement: Coordinator Validates Typed Lookup Requests Before Any Decision

The implementation coordinator SHALL validate the entire `needs_input` payload with `worker-report-validator.js` before any lookup decision and SHALL never classify a request by question wording. An invalid or broader request SHALL stop safely under the malformed-payload route with no general-question fallback and no silent authorization.

#### Scenario: Validated typed request gates the decision

- **WHEN** the implementation worker returns a permission asking for project lookups
- **THEN** the coordinator validates the typed `lookup_request` shape first and decides only on a valid `bounded-project-lookup` with 1–5 ordered matching yes/no questions

### Requirement: Coordinator Auto-Approves Valid Bounded Lookups Under Fast-Track

The coordinator SHALL approve every valid item with `answer_value: yes` without presenting the picker when `fast_track_active=true` on standalone `/sai-3-implement --fast-track` or the injected `/sai-build` implement segment, within the existing area, citation, line, project-root, and read-only limits.

#### Scenario: Fast-track build approves a valid bounded batch

- **WHEN** a validated bounded lookup request arrives with fast-track active
- **THEN** the coordinator approves all items without the picker and sends one ordered `lookup_decisions` continuation to the same worker

### Requirement: Coordinator Presents Per-Item Lookup Decisions Otherwise

The coordinator SHALL present each question and its ordered yes/no options through the active harness native picker and collect one decision per item when fast-track is inactive, recording the complete typed request and decisions as `lookup_request_history` before sending. A `no` SHALL trigger the worker convention-question fallback.

#### Scenario: Ordinary implement collects per-item authorization

- **WHEN** a validated bounded lookup request arrives without fast-track
- **THEN** the coordinator presents each yes/no question in order, forwards the exact per-item decisions, and records them in typed history

### Requirement: Worker Requests Bounded Lookups Without Self-Approval

The implementation worker SHALL request scoped project lookups only as one `needs_input` carrying `lookup_request: {type: bounded-project-lookup, items: [{id, area, reason, step}]}` with 1–5 ordered items (`lookup-1` through `lookup-5`) and matching ordered `questions` offering `yes` then `no`, where each `area` and `reason` is a single-line functional concept and never an exact path, glob, or repo-wide request, and SHALL await the coordinator's ordered explicit `lookup_decisions` before any lookup, never auto-approving even under fast-track.

#### Scenario: Worker awaits explicit typed decisions

- **WHEN** the worker identifies one or more convention gaps requiring project evidence
- **THEN** the worker returns the typed batch in the canonical `Request lookup of <area> in the project for <reason> (Step N)` form and performs no lookup until matching yes/no decisions arrive

### Requirement: Lookup History Preserved Across Replacement Without Scope Widening

The coordinator SHALL keep `lookup_request_history` separate from opaque input history, recording each validated request with its ordered exact decisions and original area, reason, Step, and limits, and a replacement SHALL resume a decided request without presenting it again or widening any area while an undecided request remains pending and authorizes nothing.

#### Scenario: Replacement resumes a decided lookup

- **WHEN** a worker is replaced after a typed lookup was decided
- **THEN** the replacement reconstructs the pending request and decisions from typed history without a second approval and without expanding scope
