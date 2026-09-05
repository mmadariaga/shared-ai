# explore-agent-segment-tool-cap Specification

## Purpose
TBD.
## Requirements
### Requirement: The existing tool-call ceiling SHALL apply independently per execution segment

The per-spawn ceiling SHALL be 40 calls per execution segment and SHALL apply independently to the initial spawn and to each continuation. Every tool call SHALL count toward the ceiling, including file reads. Calls from an earlier segment SHALL not spend or authorize calls in a later segment. When the harness binding supports continuation, the main agent SHALL resume the same explorer for the next segment; when it does not, the main agent SHALL re-dispatch a fresh bounded explorer segment.

#### Scenario: Initial segment reaches its ceiling before escalation
- **WHEN** root research exhausts the initial segment 40-call ceiling including file reads before resolving an out-of-root need
- **THEN** the agent stops that segment without widening and awaits explicit carry-forward for any continuation

#### Scenario: A continuation receives an independent ceiling
- **WHEN** the same explorer is resumed after a nonterminal result
- **THEN** the continuation has its own 40-call ceiling with prior segment calls not reused

#### Scenario: A non-continuation binding preserves the cap
- **WHEN** the harness cannot continue the prior explorer session
- **THEN** the main agent starts a fresh explorer segment with the 40-call ceiling and bounded task context

#### Scenario: Harness dispatch differences remain unchanged
- **WHEN** the policy is mounted by either supported harness
- **THEN** the per-segment 40-call ceiling and root direct-access escalation rules stay identical with only continuation mechanics differing

