# explore-agent-segment-tool-cap Specification

## Purpose
TBD.

## Requirements

### Requirement: The existing tool-call ceiling SHALL apply independently per execution segment

The existing per-spawn `≤30` tool-call ceiling SHALL be restated as a per-segment limit. It applies independently to the initial spawn and to each continuation, without raising the maximum or introducing a separate numeric cap. When the harness binding supports continuation, the main agent SHALL resume the same explorer for the next segment; when it does not, the main agent SHALL re-dispatch a fresh bounded explorer segment.

#### Scenario: Initial segment reaches its ceiling before escalation

- **WHEN** root research exhausts the initial segment's existing `≤30` tool-call ceiling before resolving an out-of-root need
- **THEN** the agent stops that segment without widening its search
- **AND** a continuation-capable binding resumes the same agent with the out-of-root need still represented by the escalation field only when the main agent explicitly carries forward the concrete path and purpose
- **AND** without that explicit carry-forward, the resumed agent does not access the out-of-root path

#### Scenario: A continuation receives an independent ceiling

- **WHEN** the same explorer is resumed after a nonterminal result
- **THEN** the continuation has its own existing `≤30` tool-call ceiling
- **AND** calls from the prior segment are not spent again or used to authorize extra calls in the continuation

#### Scenario: A non-continuation binding preserves the cap

- **WHEN** the harness cannot continue the prior explorer session
- **THEN** the main agent starts a fresh explorer segment with the existing `≤30` ceiling
- **AND** the fresh segment receives the required bounded task context rather than inheriting unrestricted search authority

#### Scenario: Harness dispatch differences remain unchanged

- **WHEN** the policy is mounted by either supported harness
- **THEN** the per-segment ceiling and root/direct-access/escalation rules are identical
- **AND** only the binding-specific continuation or fresh-dispatch behavior differs
