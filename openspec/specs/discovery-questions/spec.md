# discovery-questions Specification

## Purpose
TBD - created by archiving change explore-own-maturation. Update Purpose after archive.

## Requirements

### Requirement: Explore change stage SHALL own open discovery questions

While the stage is Explore change, explore SHALL ask the open questions that shape the idea. The stage SHALL NOT advance on explore's own judgment that the idea is solid.

#### Scenario: Open questions stay in Explore change
- **WHEN** the current stage is Explore change and the idea is still taking shape
- **THEN** explore asks open discovery questions and keeps the stage in Explore change

### Requirement: Solid idea SHALL trigger a direct ask to move to Review edge cases

Once the idea is solid, explore SHALL apply conditional approach comparison at the existing idea-maturity point before offering movement to Review edge cases. When comparison is skipped or resolved, explore SHALL restore the usual maturity offer and ask directly whether to move to Review edge cases. A declining answer SHALL stay in Explore change and later advancement SHALL use the existing next-step path. Explore SHALL NOT advance on its own judgment that the idea is solid.

#### Scenario: Comparison precedes the maturity offer
- **WHEN** the idea is solid and multiple defensible approaches have meaningful trade-offs
- **THEN** explore compares approaches before offering Review edge cases and does not advance the stage on its own

#### Scenario: Direct ask with decline staying put
- **WHEN** comparison is skipped or resolved and the user declines the move to Review edge cases
- **THEN** the stage stays in Explore change and a later recognized next-step request advances it

### Requirement: Approach comparison SHALL be conditional on defensible alternatives

At the existing idea-maturity point, explore SHALL assess viable approaches against the known goal and constraints. It SHALL compare multiple defensible approaches with meaningful trade-offs, skip comparison when only one is defensible, and continue investigating when none is viable. Comparison SHALL remain discovery within Explore change rather than a separate stage.

#### Scenario: Several defensible approaches exist
- **WHEN** multiple approaches meet the known goal and constraints and have meaningful trade-offs at idea maturity
- **THEN** explore compares them before offering edge-case review

#### Scenario: Only one approach is defensible
- **WHEN** only one approach is defensible at idea maturity
- **THEN** explore skips comparison rather than inventing alternatives

#### Scenario: No approach is viable
- **WHEN** no viable approach meets the known goal and constraints
- **THEN** explore continues investigating instead of fabricating a comparison or offering advancement based on maturity

### Requirement: Approach presentation SHALL clarify priorities and lead with a grounded recommendation

If an unstated user priority could change the recommendation, explore SHALL ask about that priority before recommending. It SHALL present the current recommendation and its grounded rationale first, followed by alternatives and their meaningful trade-offs. It SHALL present two or three approaches without inventing options to fill a quota or excluding a clearly superior option.

#### Scenario: Missing priority could change the recommendation
- **WHEN** an unstated user priority could change which approach is recommended
- **THEN** explore asks about that priority before recommending an approach

#### Scenario: Grounded alternatives are available
- **WHEN** explore has enough information to compare defensible approaches
- **THEN** it presents the recommendation and rationale first, followed by alternatives and meaningful trade-offs, without fabricated quota-filling options or exclusion of a clearly superior option

### Requirement: Resolved or fixed approaches SHALL be respected during refinements

Explore SHALL keep a resolved comparison closed and respect an approach the user has already fixed unless new information affects viability or justifies reconsideration. For refinements of the same idea, it SHALL explain only what changes and why. A material change SHALL use the existing reset and reassess approaches for the new idea.

#### Scenario: Stable choice remains resolved
- **WHEN** the user has selected or fixed an approach and no new information affects viability or justifies reconsideration
- **THEN** explore respects that choice without reopening comparison

#### Scenario: New evidence warrants reconsideration
- **WHEN** new information affects the selected approach's viability or justifies reconsideration
- **THEN** explore may revisit the choice based on that information

#### Scenario: Same idea is refined
- **WHEN** a refinement leaves the idea materially unchanged
- **THEN** explore explains only what changes and why instead of repeating the full comparison

#### Scenario: Idea materially changes
- **WHEN** the idea materially changes
- **THEN** explore applies the existing reset and reassesses approaches for the new idea
