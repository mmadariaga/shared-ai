# explore-crystallization-on-demand Specification

## Purpose

Define the on-demand emission mechanism for `sai-explore`'s `Ready to Propose` block: a one-line readiness signal replaces state-triggered auto-emission, the full block is printed only on explicit user request, the signal fires at most once per stable idea, and the `§7` inline-proposal path is fixed for coherence under on-demand emission.

## Requirements

### Requirement: Readiness signal replaces state-triggered auto-emission

When the explored idea becomes solid, `sai-explore` (`sai/instructions/explore.md`) SHALL NOT auto-print the `Ready to Propose` block. Instead it SHALL emit a single one-line readiness signal indicating the idea is solid enough to crystallize on request. "Solid" is judged at the same qualitative threshold as today's "idea is clear" wording in §5/§6; only the reaction changes (a signal instead of the block). This gate applies to both the single-change protocol (§5) and the sliced protocol (§6).

#### Scenario: solid idea produces a signal, not the block

- **WHEN** the idea under discussion becomes solid enough that today's `sai-explore` would have printed the `Ready to Propose` block
- **THEN** `sai-explore` emits a single one-line readiness signal and does NOT print the `Ready to Propose` block

#### Scenario: continued refinement does not re-print the block

- **WHEN** the user keeps refining the idea across subsequent turns after it was judged solid
- **THEN** `sai-explore` does not print or re-print the `Ready to Propose` block on any of those turns

### Requirement: Readiness signal is actionable

The one-line readiness signal SHALL communicate how the user can request the block — it names the action that triggers emission (for example, telling the user to ask to crystallize) — so that under full on-demand emission the mechanism is discoverable and the user does not wait for a block that will never auto-appear. The verbatim signal string remains unpinned by this change; only the requirement that it convey the trigger action is normative.

#### Scenario: signal names how to get the block

- **WHEN** `sai-explore` emits the one-line readiness signal
- **THEN** the signal communicates how the user can request the `Ready to Propose` block, without pinning a specific verbatim wording

### Requirement: Readiness signal fires once per stable idea

The one-line readiness signal SHALL fire at most once per stable idea, reusing the in-conversation Persistence pattern of the §3 language gate: the agent tracks the current idea in-conversation, does NOT re-emit the signal on later turns while the idea remains substantially the same, and re-fires the signal only when the idea materially changes into a new stable idea. This tracking state is held in-conversation only and SHALL NOT be written to any file or configuration.

#### Scenario: signal does not repeat while the idea is stable

- **WHEN** the idea was already judged solid and the readiness signal already fired, and the user continues discussing the same idea
- **THEN** `sai-explore` does not re-emit the readiness signal on the following turns

#### Scenario: signal re-fires for a materially different idea

- **WHEN** the discussion shifts to a materially different idea that then becomes solid
- **THEN** `sai-explore` may emit the readiness signal once for the new stable idea

#### Scenario: tracking state is never persisted

- **WHEN** the readiness signal fires and its per-idea tracking is recorded
- **THEN** that tracking is held in-conversation only and is not written to any artifact, configuration file, or other on-disk state

### Requirement: Full block is emitted only on explicit user request

`sai-explore` SHALL print (or re-print) the full `Ready to Propose` block(s) only when the user explicitly asks to crystallize — for example, asking for the paste-ready block, to crystallize, or to create a proposal / run `/sai-1-spec`. Absent such an explicit request, no block is printed even when the idea is solid. This user-triggered gate applies to both the single-change protocol (§5) and the sliced protocol (§6); when the sliced protocol applies, an explicit request emits the full ordered set of per-slice blocks. When the user explicitly asks to crystallize before the idea is judged solid, `sai-explore` SHALL honor the explicit request rather than withhold the block, but SHALL still run the §4 slicing assessment first so the emitted block(s) reflect the correct single-vs-sliced routing. The existing §7 inline-proposal path — which already prints the paste-ready block(s) when the user asks to create a proposal or run `/sai-1-spec` now — is one such explicit-request path and remains consistent with this gate.

#### Scenario: explicit request prints the single-change block

- **WHEN** the idea fits one change, is solid, and the user explicitly asks for the paste-ready block or to crystallize
- **THEN** `sai-explore` prints the single-change `Ready to Propose` block

#### Scenario: explicit request prints the full sliced set

- **WHEN** the idea was sliced, is solid, and the user explicitly asks to crystallize
- **THEN** `sai-explore` prints the full ordered set of per-slice `Ready to Propose` blocks

#### Scenario: no block without an explicit request

- **WHEN** the idea is solid but the user has not explicitly asked to crystallize or for the block
- **THEN** `sai-explore` prints no `Ready to Propose` block and relies on the once-per-stable-idea readiness signal alone

#### Scenario: explicit request before the idea is solid

- **WHEN** the user explicitly asks to crystallize while the idea has not yet been judged solid
- **THEN** `sai-explore` honors the request and emits the block(s) after first running the §4 slicing assessment to determine single-vs-sliced routing

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

### Requirement: Inline-proposal path does not assume a prior emission

The §7 inline-proposal path SHALL NOT presuppose that a `Ready to Propose` block was already emitted earlier in the session. Its wording SHALL NOT use deixis (such as "the block(s) above") that is false when no block was auto-printed; when §7 prints the block on request, its wording refers to the block it prints, not to a nonexistent earlier one. This keeps §7 coherent under on-demand emission, where the user's first explicit act may be to request a proposal with no block yet in the transcript.

#### Scenario: inline-proposal request with no prior block

- **WHEN** the user's first explicit act is to ask to create a proposal or run `/sai-1-spec` now, with no `Ready to Propose` block earlier in the session
- **THEN** `sai-explore` prints the block via the §7 path and its wording refers to the block it just printed, not to a block "above" that was never emitted
