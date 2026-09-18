# explore-instruction-delivery Specification

## Purpose
Define the lazy, trigger-point delivery structure for the read-only `sai-explore` instruction contract.

## Requirements

### Requirement: Split the explore contract into a startup nucleus and reachable steps
`sai-explore` SHALL retain its read-only restrictions in `sai/commands/explore/instructions.md` without any literal-print rule; it SHALL carry the ladder-discard logging rule as item 2 with items renumbered accordingly. Probe execution SHALL NOT be owned by `sai/commands/explore/body.md`; that file SHALL carry the normative delegation line instead. Boot SHALL preload only that explore instruction pack plus stage-machine policy as before.

#### Scenario: all ten steps are reachable
- **WHEN** the explore instruction source, its transitive Fetch directives, and the stage machine store's `next.follow` pointers are evaluated
- **THEN** the reachable step set contains no research-tooling literal-print step and delegation governs research

#### Scenario: boot pack excludes follow-loaded step files
- **WHEN** a `sai-explore` session starts
- **THEN** the boot pack still excludes the follow-loaded files and includes no probe literal

#### Scenario: research-tooling check prints the script literal
- **WHEN** `sai-explore` reaches the research-tooling check instruction
- **THEN** no such instruction exists, no literal is printed, and the delegation line governs instead

### Requirement: Fetch deferred content at its trigger point

Each deferred explore step SHALL be fetched only after the complete sentence or contract paragraph that invokes it. Conditional Plan and Direct Build route files SHALL NOT be fetched at selector presentation; they SHALL load only when a returned `next.follow` names that exact file after invoking `sai-state emit`. `crystallization-protocol.md`, `slice.md`, `pipeline-direct-build.md`, and `pipeline-plan-unattended.md` SHALL load only when a returned `next.follow` names that exact file after invoking `sai-state emit`; if the chat never reaches that stage they SHALL NOT be fetched. After each emit invocation, if this chat's conversation loaded-set already contains that `next.follow` path from a successful prior load, explore SHALL skip the fetch and follow the already-loaded instructions; otherwise explore SHALL fetch whatever `next.follow` names with no file whitelist. Explore SHALL NOT parse `next.hint` to decide whether to fetch. Nested crystallization Fetches of `slicing-assessment.md`, `artifact-review-language-gate.md`, and `crystallization-language-gates.md` SHALL live in `crystallization-protocol.md` and SHALL NOT be fetched from `steps/common.md`. The split SHALL preserve the complete normative contract text rather than paraphrasing or truncating it.

#### Scenario: a trigger loads its complete step contract

- **WHEN** a user reaches a deferred explore trigger such as slicing, artifact review, crystallization, review-loop, or pipeline selection
- **THEN** the corresponding step contract is fetched at that trigger and remains available through transitive Fetch closure without changing the behavior it defines (unchanged principle, CLI-based emit invocation)

#### Scenario: follow-loaded steps wait for next.follow

- **WHEN** invoking `sai-state emit` returns `next.follow` naming `crystallization-protocol.md`, `slice.md`, `pipeline-direct-build.md`, or `pipeline-plan-unattended.md`
- **THEN** that exact file is fetched only if this chat's conversation loaded-set does not already contain that path, and it is not loaded earlier from the boot pack (updated from HTTP POST /emit to CLI invocation)

#### Scenario: nested crystallization files load with the protocol

- **WHEN** `crystallization-protocol.md` is fetched
- **THEN** it fetches `slicing-assessment.md`, `artifact-review-language-gate.md`, and `crystallization-language-gates.md`, and `steps/common.md` does not fetch those files (unchanged from prior behavior)

#### Scenario: skip-fetch uses this chat loaded-set

- **WHEN** invoking `sai-state emit` returns a `next.follow` path this chat already loaded successfully
- **THEN** explore skips the fetch and follows the already-loaded instructions without parsing `next.hint` (updated terminology from HTTP /emit to CLI emit invocation)

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

### Requirement: Boot keeps minimal guard with deferred exception detail

The explore boot in `sai/commands/explore/instructions.md` SHALL keep only the minimal resident guard and pointer lines for B1-partial, B5, B6, B7, and B8, and SHALL defer full exception and pipeline detail to `steps/pipeline-plan-unattended.md`, `steps/pipeline-direct-build.md`, and the owning step files with no restatement in boot.

#### Scenario: Boot loads without pipeline detail

- **WHEN** an explore session starts
- **THEN** the boot presents minimal guard pointers and pipeline detail loads only through its owning step file

### Requirement: Simplify explore write prohibition to a single delegated-write rule
The explore instruction SHALL state that the command MUST NOT create, modify, or delete files and SHALL limit sessions to read, search, and discuss only, with delegated writes existing solely via the crystallization-close choice under its owned scopes.

#### Scenario: boot states read-only rule without duplicated detail
- **WHEN** an explore session starts
- **THEN** the boot presents the single read-only rule and defers all delegated-write detail to the crystallization-close owned scopes

### Requirement: Generalize boot preload to instruction pack plus stage machine with generic follow loading
The explore boot SHALL preload only the explore instruction pack and sai/policies/stage-machine.md and SHALL load every other step file only when a returned next.follow names that exact file.

#### Scenario: deferred step loads only on follow pointer
- **WHEN** an emit returns a next.follow naming a step file not in the boot pack
- **THEN** that exact file is fetched then and is not fetched at session start

### Requirement: Defer post-crystallization review loop to literal token trigger
The explore instruction SHALL NOT fetch the review-loop step at boot and SHALL trigger the user-invited review loop only when the literal token review-loop fires, loading via next.follow only then.

#### Scenario: review loop waits for token
- **WHEN** a session runs without the literal review-loop trigger
- **THEN** the review-loop step is not loaded and boot carries only the trigger line
