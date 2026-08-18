# explore-agent-scope-escalation Specification

## Purpose
TBD.

## Requirements

### Requirement: Self-discovered out-of-root needs SHALL be returned as declared escalations

The budget-explorer agent SHALL return self-discovered filesystem needs outside the project root in the canonical `out_of_root_requests` field of its structured response, as an array of records with a concrete `path` and an independently legible `reason`; the field is always present, including when empty, regardless of the caller's declared response-field set, and a caller declaration neither suppresses it nor is required to enumerate it. When the agent discovers a filesystem need outside the project root that is not directed by the task or by a public or well-known location of a relevant tool, it SHALL NOT access the path and SHALL return the need in that field for the main agent. An escalation path SHALL be a named concrete path, not a glob, wildcard, or pattern, and its reason SHALL explain the purpose without repeating, deriving from, or otherwise depending on the path text. The agent SHALL report not found without an escalation when no concrete candidate exists. A continuation may access an escalated path only when the main agent explicitly carries forward that concrete path and its purpose as directed context; a generic continuation acknowledgement does not authorize access. If the main agent declines or does not carry forward an escalation, the agent SHALL end searching rather than probe another out-of-root candidate.

The field's mandatory presence is independent of the caller's declared response fields: the caller cannot suppress it and need not enumerate it.

#### Scenario: A self-discovered external need is escalated without access

- **WHEN** the agent determines that a named external file is needed but the task did not supply that path and it is not a public or well-known relevant tool location
- **THEN** the agent does not access the file
- **AND** it returns the concrete path and an independently legible purpose in `out_of_root_requests`

#### Scenario: No candidate produces no escalation

- **WHEN** the root search finds no result and the agent has no concrete external path to name
- **THEN** it reports that the requested candidate was not found
- **AND** `out_of_root_requests` contains no fabricated entry

#### Scenario: Caller omits the escalation field from its declared contract

- **WHEN** a spawn's caller-declared response fields do not include `out_of_root_requests`
- **THEN** the agent still returns `out_of_root_requests` in its structured response
- **AND** the caller's omission does not suppress the field or require the agent to discard an escalation

#### Scenario: A pattern-shaped candidate is invalid

- **WHEN** the only external candidate is a glob, wildcard, directory pattern, or other non-concrete expression
- **THEN** the agent does not access or escalate that expression as a path
- **AND** it reports the bounded search limitation or not-found result

#### Scenario: A circular motive is invalid

- **WHEN** an escalation record's reason merely says to inspect, search, or access the path named in that same record
- **THEN** the record is not a valid escalation
- **AND** the agent must provide a purpose that remains understandable when the path value is removed

#### Scenario: Declined escalation ends external searching

- **WHEN** the main agent declines a returned out-of-root request
- **THEN** the explorer does not ask for or probe another external path
- **AND** it closes the research with the limitation recorded in its bounded summary

#### Scenario: An approved escalation is handed to a continuation

- **WHEN** the main agent resumes the explorer and explicitly carries forward a concrete escalated path together with its purpose
- **THEN** the resumed segment may access that path as directed access
- **AND** it does not broaden the authorization to neighboring paths or unrelated destinations
