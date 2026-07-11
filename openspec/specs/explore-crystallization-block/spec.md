## ADDED Requirements

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

### Requirement: Sole edit target is sai/instructions/explore.md

The change SHALL modify `sai/instructions/explore.md` only. No new files are created; no other shared instruction, command, skill, schema, OpenSpec template, or `sai-*` wrapper is modified. `/sai-1-spec` itself is unchanged because it reads the user's message in the new chat, which carries the block content directly. None of the three `sai-1-spec` wrappers under `commands/claude/`, `commands/opencode/`, or `commands/copilot/` is modified. No harness-specific configuration (opencode.jsonc, Copilot agent definitions, Claude Code skills) is touched.

#### Scenario: no new files are created

- **WHEN** the change is applied
- **THEN** no new file appears in the repository and the only modified file is `sai/instructions/explore.md`

#### Scenario: /sai-1-spec and its wrappers are not modified

- **WHEN** the change is applied
- **THEN** `sai/commands/sai-1-spec.md` and the three `sai-1-spec` wrappers under `commands/claude/`, `commands/opencode/`, and `commands/copilot/` are unchanged
