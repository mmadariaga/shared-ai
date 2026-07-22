# apply-telemetry-containment Specification

## ADDED Requirements

### Requirement: Field 9 is never re-injected into a dispatch prompt

The `/sai-4-apply` coordinator SHALL NOT include any field-9 content — an entry, an `attempts` count, a `first_failure` token, a `note`, or a rendered telemetry row — in any subsequent dispatch prompt, for the same Step or any later Step. This prohibition holds for the non-testable single dispatch, the blind test-writer dispatch, and the implementation dispatch alike.

Field 6 (technical learnings) and field 9 (attempts per phase) are deliberately separated by destination:

- Field 6 is **prospective** — facts the next dispatch needs in order to do its work, and is therefore injected under the technical-learnings memory rules.
- Field 9 is **retrospective** — a diagnosis of the run just executed, written for the human tuning the workflow, and is therefore persisted to the appendix and never injected.

A fact that a subagent expressed as a field-9 `note` and that a later dispatch genuinely needs SHALL reach that dispatch only via field 6, authored as a technical learning by the subagent — not by the coordinator lifting the note out of field 9.

#### Scenario: Test-writer telemetry is not handed to the implementation dispatch

- **WHEN** the test-writer dispatch of a testable Step reports `attempts` = `4` with a `note`, and the coordinator then issues the implementation dispatch for the same Step
- **THEN** the implementation dispatch prompt contains the Step text, the verbatim rules, and the relevant technical learnings only — no field-9 entry, count, or note

#### Scenario: Telemetry from an earlier Step is not carried forward

- **WHEN** the coordinator dispatches a subagent for Step N+1 after recording telemetry rows for Step N
- **THEN** the Step N+1 prompt contains no field-9 content and no reference to the `## Appendix: Execution Telemetry` table

#### Scenario: A needed fact travels via field 6, not field 9

- **WHEN** a subagent discovers during a retry that a planned symbol does not exist, and records it both as a field-6 technical learning and as a field-9 `note`
- **THEN** the coordinator MAY inject the field-6 learning into a later dispatch under the technical-learnings memory rules, and SHALL NOT inject the field-9 note

### Requirement: Telemetry adds no new pathway for execution noise

The bound on execution noise SHALL be the **subagent-side note contract**, not a coordinator-side scrub. Because the report is returned to the coordinator, a subagent that violates the note contract has already placed the offending text in the coordinator's context, and nothing downstream can undo that. This requirement therefore states only what the mechanism can actually guarantee:

- The telemetry mechanism SHALL NOT introduce any pathway for raw file contents, tracebacks, or iteration logs beyond what the report already carries. It adds no request for failing output, no follow-up prompt, and no free-text retry-explanation field to the report contract.
- The `note` is bounded by contract to a short statement of what changed between attempts — never what error appeared, the error class being carried by `first_failure`.
- The fixed-column table is a second bound on what is *persisted*: a row's cells are a phase token, an integer, a closed-vocabulary error-class token, and a bounded note. A fixed-column row cannot degenerate into an iteration log the way a prose field can.
- A `note` that violates its contract SHALL NOT be persisted **at all**. The coordinator SHALL write the row with the `note` cell empty rather than attempting to edit, trim, or sanitise the offending text — partial cleaning of prose the coordinator had to read is not a containment guarantee and SHALL NOT be treated as one.

The coordinator SHALL NOT ask a subagent to expand, explain, or justify a field-9 entry.

#### Scenario: Coordinator does not request retry detail

- **WHEN** a report shows a high `attempts` count for a phase
- **THEN** the coordinator records the row as reported and continues the workflow; it does not re-dispatch, prompt, or otherwise ask the subagent for the failing output

#### Scenario: Note violating its contract is dropped, not cleaned

- **WHEN** a subagent returns a field-9 `note` containing a traceback or a raw file excerpt, in violation of the note's contract
- **THEN** the coordinator SHALL write the row with an empty `note` cell — dropping the note entirely rather than editing it down — and continue without blocking the workflow

#### Scenario: Containment is not claimed for the report itself

- **WHEN** a subagent violates the note contract
- **THEN** the offending text is already in the coordinator's context and the spec claims no mechanism that removes it; the guarantee is limited to what is persisted to `implementation.md` and to adding no further pathway
