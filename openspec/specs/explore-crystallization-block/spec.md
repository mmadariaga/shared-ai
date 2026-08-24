# explore-crystallization-block Specification

## Purpose

Define the crystallized handoff format and closing behavior for `sai-explore`.
## Requirements
### Requirement: Three mandatory decision-facet sections in the single-change Ready to Propose block

The single-change `Ready to Propose` block emitted by `sai-explore` (`sai/commands/explore/instructions.md` item 5) SHALL include three new sections, inserted in this exact order between `**Capabilities in scope**` and `**Key constraints**`:

1. `**Decisions & Rationale**`
2. `**Alternatives Considered**`
3. `**Trade-offs Accepted**`

Each new section SHALL use a bullet list, one line per entry, in the same style as the existing `**Key constraints**` section (`- <entry>`). When a section has no content to record, the agent SHALL emit a single bullet whose value is the literal `None`. The five existing fields (Change name, What, Why, Capabilities in scope, Key constraints) SHALL be unchanged in name, position, or style.

#### Scenario: all three sections are present in the emitted block, in order

- **WHEN** `sai-explore` emits the single-change `Ready to Propose` block
- **THEN** the block contains `**Decisions & Rationale**`, `**Alternatives Considered**`, and `**Trade-offs Accepted**` sections, in that exact order, between `**Capabilities in scope**` and `**Key constraints**`

#### Scenario: section with no content uses a None placeholder

- **WHEN** a new section has no content to record (for example, no rejected alternatives were discussed in the explore conversation)
- **THEN** the section is emitted with a single bullet whose value is the literal `None`, and is not omitted and not emitted as an empty section

#### Scenario: existing five fields are unchanged

- **WHEN** `sai-explore` emits the single-change `Ready to Propose` block
- **THEN** `**Change name**`, `**What**`, `**Why**`, `**Capabilities in scope**`, and `**Key constraints**` retain their original names, positions, and styles

### Requirement: Mandatory Model / Re-framings section in the single-change Ready to Propose block

The single-change `Ready to Propose` block emitted by `sai-explore` SHALL include a `**Model / Re-framings**` section inserted immediately after `**Trade-offs Accepted**` and before `**Key constraints**`. This section records the moments in the explore conversation where the model or problem framing changed materially (for example, the user or agent realized a different subsystem was the real subject, or a constraint changed the shape of the change). The section SHALL use the same bullet-list style as `**Key constraints**` (one line per entry). When no re-framing occurred, the agent SHALL emit a single bullet whose value is the literal `None`.

#### Scenario: Model / Re-framings section is present in the emitted block

- **WHEN** `sai-explore` emits the single-change `Ready to Propose` block
- **THEN** the block contains a `**Model / Re-framings**` section between `**Trade-offs Accepted**` and `**Key constraints**`

#### Scenario: section with no re-framing uses a None placeholder

- **WHEN** the explore conversation did not materially re-frame the model or problem under discussion
- **THEN** the section is emitted with a single `None` bullet, and is not omitted

### Requirement: Sliced-feature protocol preserves existing sections while adding Edge Cases

The sliced-feature `Ready to Propose` blocks emitted by `sai-explore` (`sai/commands/explore/instructions.md` item 6) SHALL preserve every existing block section, field, ordering, and language-gate invariant, and SHALL add only the dedicated `**Edge Cases**` section required by the `explore-handoff-edge-cases` capability. The `**Edge Cases**` section SHALL follow `**Key constraints**`, use the one agreed list mechanically partitioned by slice, and emit `- None` when no case is attributed to that slice.

The companion `explore-handoff-edge-cases` capability governs the same `**Edge Cases**` rendering for the single-change protocol (`sai/commands/explore/instructions.md` item 5). Together, this modified requirement and that companion requirement explicitly cover both single-change and sliced crystallization protocols.

#### Scenario: Per-slice blocks retain their existing fields and add Edge Cases

- **WHEN** `sai-explore` emits the sliced-feature protocol with one `Ready to Propose` block per slice
- **THEN** each per-slice block preserves every existing section and field, followed by a dedicated `**Edge Cases**` section

#### Scenario: Empty slice attribution uses None

- **WHEN** a sliced-feature block has no edge case attributed to its slice
- **THEN** its `**Edge Cases**` section contains exactly `- None`

### Requirement: Close crystallization with selector

`sai-explore` SHALL define one authoritative crystallization-turn close in `sai/commands/explore/instructions.md`. Items 5 (single change), 6 (sliced feature), and 7 (inline proposal refusal) SHALL reference that definition rather than restating its emission sequence. The shared close SHALL apply after the single `Ready to Propose` block, after the final per-slice block, or after the inline-refusal paste-ready block(s), respectively.

The shared close SHALL emit, in this order and exactly once per crystallization turn:

1. One keep-window-open recommendation outside the handoff block, rendered under the existing language-gate rule and naming the literal `review-loop` exactly once.
2. One harness-native two-option crystallization-close selector offering `Auto` before `Manual`.

The recommendation SHALL be plain conversational text rendered in the user's language under the existing language-gate rule, while the agreed literals remain verbatim. `review-loop` remains a standing user-triggered path while the selector governs only delegated execution. The recommendation SHALL remain before the selector. The selector SHALL be the final emission of the shared close and the crystallization turn; a later answer is a separate response turn. Selecting `Manual`, or giving an answer that maps to neither selector option, SHALL refer to this already-emitted recommendation, SHALL dispatch nothing, and SHALL receive the path-specific existing next-step instruction exactly once after the selector response. The path-specific instruction SHALL NOT be emitted before the selector or re-emit the recommendation or selector. Item 10 SHALL describe that branch by reference to this shared rule. Only `/sai-1-spec`, `/sai-2-design`, and `review-loop` remain verbatim English; surrounding next-step prose follows the crystallization language gate. The recommendation SHALL NOT alter any `Ready to Propose` block, its `---` payload boundary, or its language-gate invariants.

#### Scenario: single-change handoff uses the shared close

- **WHEN** `sai-explore` emits the single-change `Ready to Propose` block
- **THEN** item 5 uses the shared close definition
- **AND** the existing `Open a new chat` next-step instruction is not emitted between the `---` separator and the selector
- **AND** one keep-window recommendation using the existing language rule and naming `review-loop` exactly once precedes one selector offering `Auto` before `Manual`
- **AND** the selector is the final emission of this slice's turn

#### Scenario: sliced output closes once after the final slice

- **WHEN** `sai-explore` emits one `Ready to Propose` block per slice
- **THEN** item 6 uses the shared close definition only after the final slice block
- **AND** one keep-window recommendation using the existing language rule precedes one selector after the final block
- **AND** the selector is emitted once for the whole slice set and is the final emission of this slice's turn
- **AND** the recommendation and selector are not repeated for an earlier slice
- **AND** the instruction to take the first block to a new chat with `/sai-1-spec` is emitted exactly once after a `Manual` or unmapped selector response, while later slices remain separate follow-up changes

#### Scenario: inline proposal refusal uses the shared close

- **WHEN** the user asks to create a proposal or run `/sai-1-spec` inline and the paste-ready block(s) are emitted
- **THEN** item 7 uses the shared close definition
- **AND** the copy/start-new-chat next-step clause with `/sai-1-spec` is emitted exactly once after a `Manual` or unmapped selector response
- **AND** no in-session proposal dispatch is introduced
- **AND** the existing recommendation precedes the selector, which remains the final emission of this slice's turn

#### Scenario: Manual refers to the existing recommendation once and moves the handoff after the selector

- **WHEN** the user selects `Manual` or gives an unmapped answer to the selector
- **THEN** no worker is dispatched
- **AND** the recommendation was already emitted once before the selector
- **AND** no second recommendation or selector is emitted as part of that answer
- **AND** the existing path-specific next-step instruction is emitted once after the selector response
- **AND** the existing selector re-invocation behavior remains available on a later explicit request

#### Scenario: the close does not alter the handoff payload

- **WHEN** the shared close is emitted in any of the three crystallization paths
- **THEN** the existing `Ready to Propose` block field labels, field order, scaffolding, and `---` separator remain unchanged
- **AND** the complete block remains the `crystallized_block` payload transported through the existing two-string spec-worker envelope, including its existing marker and argument structure
- **AND** no emission is added, removed, reordered, or relocated relative to the selector in this slice
- **AND** `review-loop` remains a standing user-triggered review path while the selector governs only delegated execution
- **AND** `--fast-track` does not suppress or auto-answer the selector

#### Scenario: recommendation language and review separation remain unchanged

- **WHEN** the crystallization turn uses a non-English conversation language
- **THEN** the recommendation remains plain conversational text rendered in the user's language, while both literal tokens remain verbatim
- **AND** the selector remains the sole control for delegated execution
- **AND** `review-loop` remains a standing user-triggered path while the selector governs only delegated execution
- **AND** the `review-loop` path remains independent of selector selection

#### Scenario: recommendation does not alter the block or the item-8 gate

- **WHEN** the closing recommendation is emitted
- **THEN** the `Ready to Propose` block's scaffolding and the item-8 crystallization language-gate invariants are unchanged
- **AND** the recommendation itself is plain conversational text rendered in the user's language
- **AND** both literal tokens remain verbatim
- **AND** `review-loop` remains a standing user-triggered path while the selector governs only delegated execution

### Requirement: Sole edit target is sai/commands/explore/instructions.md

The change SHALL modify `sai/commands/explore/instructions.md` only. No new files are created; no other shared instruction, command, skill, schema, OpenSpec template, or `sai-*` wrapper is modified. `/sai-1-spec` itself is unchanged because it reads the user's message in the new chat, which carries the block content directly. None of the three `sai-1-spec` wrappers under `commands/claude/`, `commands/opencode/`, or `commands/copilot/` is modified. No harness-specific configuration (opencode.jsonc, Copilot agent definitions, Claude Code skills) is touched.

#### Scenario: no new files are created

- **WHEN** the change is applied
- **THEN** no new file appears in the repository and the only modified file is `sai/commands/explore/instructions.md`

#### Scenario: /sai-1-spec and its wrappers are not modified

- **WHEN** the change is applied
- **THEN** the active files under `sai/commands/spec/steps/` and the three `sai-1-spec` wrappers under `commands/claude/`, `commands/opencode/`, and `commands/copilot/` are unchanged

### Requirement: Single-change handoffs expose dedicated research leads

The single-change `Ready to Propose` block emitted by `sai-explore` SHALL include a dedicated **Research Leads** section separate from **Why** and **Decisions & Rationale**. When the explore conversation identifies relevant code or documentation for follow-up research, the section SHALL list concise repository-relative path references, optionally using `path:start-end` line ranges, with a short note explaining each lead's relevance. The section SHALL represent investigative starting points only: it SHALL NOT identify files to modify, define implementation scope, or replace the existing intent provenance citations.

#### Scenario: relevant leads were identified during exploration

- **WHEN** `sai-explore` crystallizes a single-change handoff after identifying relevant files or documentation
- **THEN** the handoff includes a **Research Leads** section with each useful path or path-range reference and a concise relevance note
- **AND** the listed leads are presented as suggestions for later research, not as target files

#### Scenario: exploration has no useful follow-up leads

- **WHEN** `sai-explore` crystallizes a single-change handoff without identifying a useful file or documentation starting point
- **THEN** the handoff still includes the **Research Leads** section with `- None`
- **AND** the absence of leads does not change the rest of the handoff or block the user from continuing

#### Scenario: leads do not replace intent provenance

- **WHEN** a single-change handoff contains both **Research Leads** and inline `file:line` evidence-provenance
- **THEN** each remains in its existing role: leads guide investigation and provenance supports intent
- **AND** no target-file, files-to-modify, or where-to-modify field is introduced

### Requirement: Research leads are limited to single-change crystallization

The dedicated **Research Leads** section SHALL be added only to the single-change `Ready to Propose` format. Sliced-feature per-slice blocks SHALL retain their existing format and SHALL NOT gain a Research Leads section through this change.

#### Scenario: a sliced feature is crystallized

- **WHEN** `sai-explore` emits the ordered per-slice handoff blocks for a sliced feature
- **THEN** those blocks retain their existing fields and ordering without a **Research Leads** section
- **AND** the single-change lead rules do not alter slice boundaries or dependencies

### Requirement: Optional evidence-provenance citations in the Why and Decisions & Rationale fields

The single-change `Ready to Propose` block emitted by `sai-explore` SHALL permit optional evidence-provenance citations inside the **Why** and **Decisions & Rationale** fields. When `sai-explore` grounded its hypothesis in specific files during the explore conversation, it SHALL elicit and record that grounding as inline citations attached to those two fields. "Elicit and record" means the block itself surfaces and includes the provenance as part of the same autonomous crystallization emission; it SHALL NOT add a new interactive user question and SHALL NOT alter the emission gate. A separate **Research Leads** section SHALL carry follow-up investigation starting points and SHALL NOT be used to relocate or reinterpret intent provenance.

A provenance citation is a `file:line` reference where the line component MAY be a single line (`path:line`) or a line range (`path:startLine-endLine`); both forms are permitted. Provenance is a citation for intent (WHY), is NEVER an implementation target, and no target-file field is added. Provenance citations remain optional: when there is nothing to cite, the **Why** and **Decisions & Rationale** fields render without citation-specific placeholders.

#### Scenario: explore grounded its hypothesis in specific files

- **WHEN** `sai-explore` emits the single-change `Ready to Propose` block and its hypothesis was grounded in specific files during the conversation
- **THEN** the **Why** and/or **Decisions & Rationale** fields carry inline `file:line` provenance citations for that grounding
- **AND** any **Research Leads** entries remain separate suggestions for follow-up research

#### Scenario: no provenance to cite

- **WHEN** the explore conversation produced no file-grounded evidence worth citing
- **THEN** the **Why** and **Decisions & Rationale** fields render without provenance and without a citation-specific `None` placeholder
- **AND** the **Research Leads** section independently reports useful leads or `- None`

#### Scenario: provenance never becomes an implementation target

- **WHEN** provenance citations or Research Leads are recorded in the block
- **THEN** both remain intent or research guidance only and do not designate files to modify
- **AND** no target-file or "where to modify" field is introduced

### Requirement: Provenance and research-lead literals are reproduced verbatim under the crystallization language gate

The `file:line` provenance citations permitted in the **Why** and **Decisions & Rationale** fields, and the path references listed in **Research Leads**, SHALL be reproduced verbatim and SHALL NOT be localized by the crystallization language gate. The gate's existing scaffolding invariants remain unchanged; only localizable free-text prose continues to render in the user's chosen language.

#### Scenario: non-English crystallization preserves path literals

- **WHEN** the crystallization language gate renders a single-change block in a non-English language and the block carries provenance or Research Leads
- **THEN** the surrounding free-text prose is rendered in the user's language while every path and line-range literal is reproduced verbatim
- **AND** the **Research Leads** heading remains the dedicated English section label defined by the handoff format

### Requirement: Overview language reminder records the gate decision

The single-change and sliced `Ready to Propose` blocks SHALL always include `**Overview language**: <value>`. When the user selected or supplied a language, `<value>` SHALL be reproduced exactly; when gate 9 resolved do not create, `<value>` SHALL be the literal `None`. The English scaffold label SHALL remain unchanged, and neither the label nor the `None` marker or selected value SHALL be localized. The line SHALL not alter the existing block sections, language-gate rules, selector close, or two-string handoff envelope.

#### Scenario: Single-change block records do not create

- **WHEN** a single-change crystallization resolves gate 9 to do not create
- **THEN** the block contains `**Overview language**: None`
- **AND** its other required sections and closing separator remain unchanged

#### Scenario: Sliced blocks record do not create

- **WHEN** a sliced crystallization resolves gate 9 to do not create
- **THEN** every per-slice block contains `**Overview language**: None`
- **AND** the shared selector is emitted once after the final block as before

#### Scenario: Selected language is repeated in every block

- **WHEN** a single or sliced crystallization supplies or selects `spanish`
- **THEN** every emitted block contains `**Overview language**: spanish`
- **AND** the value is not localized or persisted

