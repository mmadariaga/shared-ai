# explore-crystallization-on-demand Specification

## Purpose

Define the on-demand emission mechanism for `sai-explore`'s `Ready to Propose` block: a one-line readiness signal replaces state-triggered auto-emission, the full block is printed only on explicit user request, the signal fires at most once per stable idea, and the `§7` inline-proposal path is fixed for coherence under on-demand emission.

## Requirements

### Requirement: Pre-crystallization closure is distinct from readiness signaling

The readiness statement SHALL remain a once-per-stable-idea emission carried inside the closure reminder line, while the actionable closure for an `active-uncrystallized` idea SHALL be evaluated on every successful qualifying turn. When no genuine unresolved question remains, the stage-aware closure reminder SHALL be emitted and SHALL repeat on each later qualifying turn; when a genuine unresolved question remains, that question takes precedence. The closure reminder SHALL NOT emit the `Ready to Propose` block or weaken the `Crystallize`-stage gate for that block.

#### Scenario: Repeated closure does not repeat readiness

- **WHEN** a stable idea has already emitted its once-per-stable-idea readiness statement and a later successful turn has no genuine unresolved question
- **THEN** `sai-explore` SHALL repeat the actionable closure reminder for the current stage
- **AND** it does not re-emit the readiness statement
- **AND** it does not emit a `Ready to Propose` block outside the `Crystallize` stage

#### Scenario: A question takes precedence over the reminder

- **WHEN** a later successful active-uncrystallized turn has a genuine unresolved question
- **THEN** the response ends with that question
- **AND** it does not manufacture or append a fallback reminder solely because readiness tracking suppresses the readiness statement

### Requirement: Readiness signal replaces state-triggered auto-emission

When the explored idea becomes solid, `sai-explore` (`sai/commands/explore/instructions.md`) SHALL NOT auto-print the `Ready to Propose` block. Instead, the first closure reminder emitted after solidification SHALL carry the readiness statement — the one-line maturity judgment that the idea is solid enough to enter `Crystallize` — inside the reminder line, never as a separate closing line and never by itself ending a turn. When the idea crystallizes before any closure reminder has fired (for example, a solidification turn that ended with a genuine question followed by `next-step` into `Crystallize`), the readiness statement SHALL NOT be emitted: entering `Crystallize` itself conveys the trigger action. "Solid" is judged at the same qualitative threshold as today's "idea is clear" wording in §5/§6; only the reaction changes (a statement inside the reminder instead of the block). This gate applies to both the single-change protocol (§5) and the sliced protocol (§6).

#### Scenario: solid idea produces the reminder with the statement, not the block

- **WHEN** the idea under discussion becomes solid enough that today's `sai-explore` would have printed the `Ready to Propose` block
- **THEN** `sai-explore` emits the closure reminder carrying the readiness statement and does NOT print the `Ready to Propose` block

#### Scenario: crystallization before any reminder drops the statement

- **WHEN** the idea solidifies on a turn that ends with a genuine question and the progression then enters `Crystallize` before any closure reminder fires
- **THEN** the readiness statement is not emitted and entering `Crystallize` itself is the trigger action

#### Scenario: continued refinement does not re-print the block

- **WHEN** the user keeps refining the idea across subsequent turns after it was judged solid
- **THEN** `sai-explore` does not print or re-print the `Ready to Propose` block on any of those turns

### Requirement: Readiness signal is actionable

The closure reminder carrying the readiness statement SHALL communicate how the user can advance toward the block: it names the token that advances from the user's current stage of the pre-crystallization progression, so that under full on-demand emission the mechanism is discoverable and the user does not wait for a block that will never auto-appear. The verbatim reminder wording remains unpinned by this change; only the requirement that the reminder convey the advancement action is normative.

#### Scenario: the reminder names how to advance

- **WHEN** `sai-explore` emits the closure reminder carrying the readiness statement
- **THEN** the reminder communicates how the user can advance toward the `Ready to Propose` block, without pinning a specific verbatim wording

### Requirement: Readiness signal fires once per stable idea

The readiness statement SHALL be carried by the closure reminder at most once per stable idea, reusing the in-conversation Persistence pattern of the §3 language gate: the agent tracks the current idea in-conversation, does NOT re-emit the statement on later reminder repetitions while the idea remains substantially the same, and re-fires the statement only when the idea materially changes into a new stable idea. This tracking state is held in-conversation only and SHALL NOT be written to any file or configuration.

#### Scenario: the statement does not repeat while the idea is stable

- **WHEN** the idea was already judged solid and the readiness statement already fired inside a closure reminder, and the user continues discussing the same idea
- **THEN** later closure reminders repeat the stage's token guidance without re-emitting the readiness statement

#### Scenario: the statement re-fires for a materially different idea

- **WHEN** the discussion shifts to a materially different idea that then becomes solid
- **THEN** `sai-explore` may emit the readiness statement once for the new stable idea, inside its first closure reminder

#### Scenario: tracking state is never persisted

- **WHEN** the readiness statement fires and its per-idea tracking is recorded
- **THEN** that tracking is held in-conversation only and is not written to any artifact, configuration file, or other on-disk state

### Requirement: Readiness judgment stays qualitative

The judgment of whether the idea is "solid" SHALL remain a qualitative judgment at the same threshold as today's "idea is clear" language. This change SHALL NOT introduce a numeric threshold, score, or count-based metric for readiness.

#### Scenario: no numeric threshold is introduced

- **WHEN** `sai-explore` decides whether the idea is solid enough to emit the readiness signal
- **THEN** the decision is a qualitative judgment and is not gated on any numeric threshold, score, or count

### Requirement: Block content and slicing routing are unchanged

This change SHALL alter only *when* the `Ready to Propose` block is emitted, not its content or the slicing routing that decides how many blocks exist. When a block is printed on request, its sections continue to follow the existing format (the `explore-crystallization-block` capability), and the single-vs-sliced routing and per-slice composition of §4/§6 (`explore-vertical-slicing`, `explore-refactor-first-slicing`) are unchanged.

#### Scenario: emitted block keeps its existing format

- **WHEN** `sai-explore` prints a `Ready to Propose` block in response to an explicit request
- **THEN** the block's sections match the existing format defined for the single-change or sliced protocol, with no section added, removed, or reordered by this change

### Requirement: Full block is emitted only inside the Crystallize stage

`sai-explore` SHALL print or re-print the full `Ready to Propose` block or blocks only inside the `Crystallize` stage, which `next-step` (or semantic list confirmation or deterministic empty-set advancement) reaches after the agreed edge-case and implementation-details lists. Entering `Crystallize` SHALL be the only start of the crystallization sequence: open decisions when any exist, then the slicing assessment, then the crystallization language gate, then block printing. A `crystallize` token or a natural-language request to crystallize, to print the paste-ready block, to create a proposal, or to run `/sai-1-spec` SHALL carry no prescribed response and SHALL NOT be retained as a pending request; the agent interprets it in context. Crystallization SHALL NOT enter, resume, or wait on a POC pause. This gate applies to both the single-change and sliced protocols.

#### Scenario: entering Crystallize prints the single-change block

- **WHEN** the idea fits one change and the progression enters the `Crystallize` stage
- **THEN** `sai-explore` runs the slicing assessment and the crystallization language gate and prints the single-change `Ready to Propose` block

#### Scenario: entering Crystallize prints the full sliced set

- **WHEN** the idea was sliced and the progression enters the `Crystallize` stage
- **THEN** `sai-explore` prints the full ordered set of per-slice `Ready to Propose` blocks

#### Scenario: no block outside the Crystallize stage

- **WHEN** the user asks for the paste-ready block, to crystallize, or to create a proposal before the progression has entered `Crystallize`
- **THEN** `sai-explore` prints no `Ready to Propose` block on a prescribed path and records no pending crystallization request
