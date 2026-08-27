# explore-instruction-delivery Specification

## Purpose
Define the lazy, trigger-point delivery structure for the read-only `sai-explore` instruction contract.

## Requirements

### Requirement: Split the explore contract into a startup nucleus and reachable steps

`sai-explore` SHALL retain its read-only restrictions and research-tooling check in `sai/commands/explore/instructions.md`, SHALL fetch `steps/common.md` directly before shared staged-progression and closure rules are evaluated, and SHALL provide exactly ten named Markdown step files under `sai/commands/explore/steps/`. Each step file SHALL be reachable from the nucleus through direct or transitive `Fetch @sai/commands/explore/steps/...` directives.

#### Scenario: all ten steps are reachable

- **WHEN** the explore instruction source and its transitive Fetch directives are evaluated
- **THEN** exactly ten step files exist and every one is reachable from `instructions.md` without an unreachable step or missing fetched file

### Requirement: Fetch deferred content at its trigger point

Each deferred explore step SHALL be fetched only after the complete sentence or contract paragraph that invokes it, and conditional route files SHALL be fetched at their selector trigger before the selected route is dispatched. The split SHALL preserve the complete normative contract text rather than paraphrasing or truncating it.

#### Scenario: a trigger loads its complete step contract

- **WHEN** a user reaches a deferred explore trigger such as slicing, artifact review, crystallization, review-loop, or pipeline selection
- **THEN** the corresponding step contract is fetched at that trigger and remains available through transitive Fetch closure without changing the behavior it defines

### Requirement: Preserve startup and deferred byte figures

The startup delivery SHALL total 26,506 bytes, consisting of the 11,415-byte nucleus and the 15,091-byte `steps/common.md`; the remaining 130,780 bytes SHALL remain deferred.

#### Scenario: byte figures match the implemented split

- **WHEN** the split instruction files are measured
- **THEN** startup delivery measures 26,506 bytes and deferred delivery measures 130,780 bytes

### Requirement: Update harness renderer references with harness-specific carriers

The source instruction structure SHALL remain harness-neutral. The Claude Code and opencode idea-list renderers SHALL each reference the split instruction surfaces while preserving their respective harness-specific machine-readable panel carriers.

#### Scenario: both renderers reference the split surfaces

- **WHEN** the Claude Code and opencode idea-list renderers are inspected
- **THEN** each renderer references the split surfaces and retains its own machine-readable carrier without asserting identical Phase A and Phase B ownership behavior
