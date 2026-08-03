# explore-crystallization-block Specification

## Purpose

Define the crystallized handoff format and closing behavior for `sai-explore`.

## Requirements

### Requirement: Three mandatory decision-facet sections in the single-change Ready to Propose block

The single-change `Ready to Propose` block emitted by `sai-explore` (`sai/instructions/explore.md` item 5) SHALL include three new sections, inserted in this exact order between `**Capabilities in scope**` and `**Key constraints**`:

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

### Requirement: Sliced-feature protocol is not modified

The sliced-feature `Ready to Propose` blocks emitted by `sai-explore` (`sai/instructions/explore.md` item 6) SHALL NOT be modified by this change. The per-slice blocks continue to use the original 5-field format (Change name, What, Why, Capabilities in scope, Key constraints), without the four new sections, because the new sections describe the whole feature and would either repeat the same content per slice or fragment it incorrectly across slices.

#### Scenario: per-slice blocks keep the original 5-field format

- **WHEN** `sai-explore` emits the sliced-feature protocol with one `Ready to Propose` block per slice
- **THEN** each per-slice block contains the original 5 fields only and does not include `**Decisions & Rationale**`, `**Alternatives Considered**`, `**Trade-offs Accepted**`, or `**Model / Re-framings**` sections

### Requirement: Crystallization output closes with a keep-window-open recommendation

Both the single-change crystallization output (`sai/instructions/explore.md` item 5) and the sliced-feature crystallization output (item 6) SHALL close with a recommendation that the user keep the current explore window open and use it to review and refine downstream artifacts. The recommendation SHALL name the literal `review-loop` and `start-pipeline` tokens as user-triggered paths, without presenting either as a picker, auto-offering either path, or auto-firing either token. It SHALL explain that `start-pipeline` supervision is available on Claude Code and opencode and unavailable on GitHub Copilot.

The recommendation SHALL NOT alter the `Ready to Propose` block itself, including its field scaffolding and existing language-gate invariants. It is plain conversational text rendered in the user's language, while both literal tokens remain verbatim.

#### Scenario: single-change block closes with the recommendation

- **WHEN** `sai-explore` emits the single-change `Ready to Propose` block (item 5)
- **THEN** it follows the block with a recommendation to keep the explore window open and review/refine downstream artifacts there, naming `review-loop` and `start-pipeline` as user-triggered paths
- **AND** the recommendation explains that `start-pipeline` supervision is available on Claude Code and opencode and unavailable on GitHub Copilot

#### Scenario: sliced output emits the recommendation once after the final block

- **WHEN** `sai-explore` emits the sliced-feature protocol with one `Ready to Propose` block per slice (item 6)
- **THEN** the keep-window-open recommendation is emitted once, after the final slice block, and not repeated per slice

#### Scenario: recommendation does not alter the block or the item-8 gate

- **WHEN** the closing recommendation is emitted
- **THEN** the `Ready to Propose` block's scaffolding and the item-8 crystallization language-gate invariants are unchanged
- **AND** the recommendation itself is plain conversational text rendered in the user's language
- **AND** neither token is presented through a picker or started automatically

#### Scenario: recommendation renders in the user's language

- **WHEN** the conversation's ambient language is not English
- **THEN** the closing recommendation prose is rendered in the user's language per `remember.md`, while the block scaffolding it follows stays governed by the item-8 gate

### Requirement: Sole edit target is sai/instructions/explore.md

The change SHALL modify `sai/instructions/explore.md` only. No new files are created; no other shared instruction, command, skill, schema, OpenSpec template, or `sai-*` wrapper is modified. `/sai-1-spec` itself is unchanged because it reads the user's message in the new chat, which carries the block content directly. None of the three `sai-1-spec` wrappers under `commands/claude/`, `commands/opencode/`, or `commands/copilot/` is modified. No harness-specific configuration (opencode.jsonc, Copilot agent definitions, Claude Code skills) is touched.

#### Scenario: no new files are created

- **WHEN** the change is applied
- **THEN** no new file appears in the repository and the only modified file is `sai/instructions/explore.md`

#### Scenario: /sai-1-spec and its wrappers are not modified

- **WHEN** the change is applied
- **THEN** `sai/commands/sai-1-spec.md` and the three `sai-1-spec` wrappers under `commands/claude/`, `commands/opencode/`, and `commands/copilot/` are unchanged

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
