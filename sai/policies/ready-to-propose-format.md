# Ready to Propose Block Format

Canonical structure for the crystallized `Ready to Propose` block — the single source of truth for the format emitted by explore's crystallization protocol. Consumed by reference; never restated at a consuming surface.

This file is the authoritative format specification for the block emitted by `sai/commands/explore/steps/crystallization-protocol.md` and consumed by `/sai-1-spec` and other surfaces that receive a crystallized block.

## Block structure

The block is structured as follows:

```
## Ready to Propose

**Change name**: <kebab-case suggestion>
**What**: <1–2 sentences describing the change>
**Why**: <1–2 sentences stating the motivation; optional inline file:line provenance citations when the hypothesis was grounded in specific files>
**Capabilities in scope**:
- <capability>: <brief description>
**Research Leads**:
- <repository-relative-path[:start-end]> - <concise relevance note>
**Decisions & Rationale**: <optional inline file:line provenance citations when a decision was grounded in specific files>
- <decision and rationale, or None>
**Alternatives Considered**:
- <rejected alternative, or None>
**Trade-offs Accepted**:
- <accepted trade-off, or None>
**Model / Re-framings**:
- <model re-framing, or None>
**Key constraints**:
- <constraint or non-goal>
**Edge Cases**:
- <agreed `E1`…`En` behavior statement, or None>
**Implementation Details**:
- <agreed `I1`…`In` statement in order, or None>
**Overview language**: <explicit `--overview-lang` option value or literal None>

---
```

## Mandatory sections

The five sections between `**Capabilities in scope**` and `**Key constraints**` are mandatory. When a section has no content, emit a single `- None` bullet:
- `**Research Leads**`
- `**Decisions & Rationale**`
- `**Alternatives Considered**`
- `**Trade-offs Accepted**`
- `**Model / Re-framings**`

Place `**Edge Cases**` immediately after `**Key constraints**`; render the agreed `E1`…`En` behavior statements in their established order, or exactly one `- None` bullet when the agreed list is empty. Place `**Implementation Details**` immediately after `**Edge Cases**`, carrying the agreed `I1`…`In` statements in their established order with identifiers and wording preserved, or exactly one `- None` bullet when the agreed list is empty; place `**Overview language**: <explicit \`--overview-lang\` option value or literal None>` immediately after it, before the `---` separator. The line reflects only what is knowable at print time; a gate-9-selected value never appears in an already-emitted block.

## Field rules

- **Change name**: kebab-case suggestion
- **What**: 1–2 sentences describing the change
- **Why**: 1–2 sentences stating the motivation; may carry optional inline `file:line` provenance citations as evidence for intent
- **Capabilities in scope**: the user-facing boundaries for this run; OpenSpec bookkeeping artifacts (`openspec/changes/{name}/**`, `openspec/specs/**`) are excluded from this section
- **Research Leads**: non-authoritative starting points; repository-relative paths or `path:start-end` with short relevance notes; emits exactly `- None` when no useful lead exists; SHALL NOT designate files to modify or replace provenance
- **Decisions & Rationale**: optional inline `file:line` citations when decisions were grounded in specific files
- **Alternatives Considered**: rejected alternatives or None
- **Trade-offs Accepted**: accepted trade-offs or None
- **Model / Re-framings**: model re-framings or None
- **Key constraints**: constraints or non-goals
- **Edge Cases**: agreed `E1`…`En` behavior statements in their established order, or exactly one `- None` bullet when the agreed list is empty
- **Implementation Details**: agreed `I1`…`In` statements in their established order with identifiers and wording preserved, or exactly one `- None` bullet when the agreed list is empty
- **Overview language**: the explicit `--overview-lang` option value or literal None; reflects only what is knowable at print time

## OpenSpec exclusion

OpenSpec bookkeeping artifacts (`openspec/changes/{name}/**`, `openspec/specs/**`) are excluded from `**Capabilities in scope**` — they are consequences owned by backfill and archive.

The fields **Why**, **Decisions & Rationale**, and **Research Leads** are exempt from this exclusion and may carry inline references to `openspec/changes/{name}/**` or `openspec/specs/**` when they serve as evidence for intent or non-authoritative leads.

## Provenance citations

Optional evidence-provenance citations: when the hypothesis or a decision was grounded in specific files, the **Why** and **Decisions & Rationale** fields MAY carry inline `file:line` or `path:startLine-endLine` citations as evidence for intent. These citations are optional — when there is nothing to cite, the fields render exactly as today with no citation-specific placeholder. Provenance is a citation for intent only and SHALL NOT designate files to modify; no target-file field is introduced.

Research Leads are non-authoritative starting points for later investigation, separate from intent provenance and implementation targeting. When useful code or documentation was identified during exploration, emit concise repository-relative `path` or `path:start-end` entries with short relevance notes. When no useful lead exists, emit exactly `- None`. A lead SHALL NOT designate a file to modify, define implementation scope, or replace provenance.
