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

The explore instruction SHALL state that the command MUST NOT create, modify, or delete repository files and SHALL otherwise limit exploration to read, search, and discuss. Delegated implementation writes SHALL remain scoped to an explicitly selected crystallization-close route. Explicit acceptance of the optional backlog action SHALL count as a request for `to-backlog` under its existing scoped exception, without replacing that skill's publication confirmation. An explicit acceptance of the branch action or user request for that workflow SHALL permit only local branch creation and switching through the installed `new-change-branch` skill in the current conversation. That skill SHALL own naming, base selection, authorization, safety checks, errors, and cancellation handling. The branch exception SHALL NOT permit production code edits or other repository-file writes. These boundaries SHALL apply in Claude Code and opencode.

#### Scenario: boot states read-only rule without duplicated detail

- **WHEN** an explore session starts
- **THEN** the boot presents the read-only rule and scoped workflow exceptions while deferring optional question details to the selector and delegated implementation detail to crystallization-close owned scopes

#### Scenario: User authorizes local branch preparation

- **WHEN** the user explicitly accepts the optional branch action or requests the branch workflow during Explore
- **THEN** Explore permits only the installed skill's local branch creation and switching workflow without authorizing production code edits or other repository-file writes

#### Scenario: User accepts backlog capture

- **WHEN** the user accepts the optional backlog action
- **THEN** Explore invokes the existing scoped `to-backlog` workflow without treating acceptance as its publication confirmation

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

### Requirement: Deliver optional preparation and route selection together through next follow

Both optional pre-route questions and the existing native implementation route picker SHALL reside in `sai/commands/explore/steps/route-selector.md` and SHALL be delivered together when the existing state-machine `next.follow` names that file. Explore SHALL NOT preload those questions or either optional workflow skill at startup. It SHALL load each skill only after Yes or a clear free-text request for its action. Loaded sibling instructions and orientation guidance SHALL defer to the authoritative shared crystallization close and selector completion gate rather than requiring an immediate same-turn route picker. Claude Code and opencode SHALL follow the same delivery and ordering contract.

#### Scenario: Successful inventory recording delivers the complete sequence

- **WHEN** a successful inventory emit with no active slice returns `next.follow: sai/commands/explore/steps/route-selector.md`
- **THEN** the loaded file supplies the backlog question, branch question, and native route picker together in that order, with picker presentation waiting for optional action completion

#### Scenario: Explore starts before crystallization

- **WHEN** Explore loads its startup instruction pack
- **THEN** the optional questions and their skills are not preloaded and remain deferred to selector delivery and action acceptance

#### Scenario: Loaded sibling guidance is consulted

- **WHEN** selector-loaded sibling instructions or project orientation describe the post-crystallization close
- **THEN** they defer to the shared close and selector completion gate without restoring an immediate same-turn route-picker requirement
