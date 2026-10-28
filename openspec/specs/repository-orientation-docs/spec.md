# repository-orientation-docs Specification

## Purpose
TBD - created by archiving change review-docs-and-cleanup. Update Purpose after archive.

## Requirements

### Requirement: AGENTS.md states the live explorer lifetime

`AGENTS.md` SHALL describe explorer lifetime as one live explorer per coordinator, matching `sai/policies/cache-warming.md`, and SHALL cite ADR 0202 beside ADR 0188 where it states subagent lifetime. It SHALL NOT state that a new explorer is started for each search.

#### Scenario: Reader checks subagent lifetime
- **WHEN** an agent reads the subagent-lifetime sentence in the budget-subagent hang containment section of `AGENTS.md`
- **THEN** it reads "one live explorer per coordinator" and a citation of ADR 0188 and ADR 0202

### Requirement: AGENTS.md coordinator load lists include cache-warming

Wherever `AGENTS.md` enumerates the policies loaded by the implement, review, build, deep-review, spec, design, plan, or shared audit coordinators, the enumeration SHALL include `cache-warming`, because each of those coordinator cards fetches `sai/policies/cache-warming.md`.

#### Scenario: Implement-family boundary list
- **WHEN** an agent reads the Boundary bullet of the implement, review, build, and deep-review section of `AGENTS.md`
- **THEN** `cache-warming` appears in the list of cross-cutting policies those contracts load

#### Scenario: Deep-review coordinator list
- **WHEN** an agent reads the `/sai-deep-review` bullet of `AGENTS.md`
- **THEN** the list of policies the coordinator loads includes `cache-warming`

#### Scenario: Plan-family boundary list
- **WHEN** an agent reads the Boundary bullet of the plan, spec, and design section of `AGENTS.md`
- **THEN** both the spec and design coordinator list and the `/sai-plan` list include `cache-warming`

#### Scenario: Audit coordinator list
- **WHEN** an agent reads the audit coordinators section of `AGENTS.md`
- **THEN** the list of policies `sai/commands/audit/coordinator.md` loads includes `cache-warming`
