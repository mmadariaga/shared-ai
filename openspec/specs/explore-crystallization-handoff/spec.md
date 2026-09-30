# explore-crystallization-handoff Specification

## Purpose
TBD - created by archiving change explore-crystallization-handoff-cue. Update Purpose after archive.

## Requirements

### Requirement: Explore Ready to Propose emission cues the same-turn crystallization close

When `/sai-explore` emits a `Ready to Propose` block through ordinary single-change or sliced crystallization, the agent-facing guidance SHALL direct continuation in the same turn to `Crystallization-turn close (shared, owns B6)` in `sai/commands/explore/steps/crystallization-protocol.md`. That close SHALL record the complete ordered set and end the block-emission turn; it SHALL not present or execute a route. The route selector SHALL run only after a later user reply. The cue SHALL remain outside the emitted block and SHALL apply only to `/sai-explore`.

#### Scenario: Explore continues after block emission

- **WHEN** `/sai-explore` emits a complete `Ready to Propose` block
- **THEN** the guidance directs same-turn continuation through the shared close, records the inventory, ends the turn, and waits for a later route reply

#### Scenario: The emitted block remains copy-safe

- **WHEN** the `Ready to Propose` block is copied to a downstream consumer
- **THEN** the close cue and deferred route guidance remain outside the copied block, while the block structure remains unchanged

#### Scenario: Other format consumers are not routed by the cue

- **WHEN** another producer or consumer uses the `Ready to Propose` format without `/sai-explore` emitting the block
- **THEN** the Explore-only cue does not direct that producer or consumer to present route choices
