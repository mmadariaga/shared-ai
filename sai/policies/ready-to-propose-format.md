<!-- Format validator: node sai/tools/lint.js ready-to-propose <file> -->

# Ready to Propose Block Format

Canonical structure for the `Ready to Propose` block, emitted by explore's crystallization protocol (`sai/commands/explore/steps/crystallization-protocol.md`) and by `/sai-3-implement`'s escalation handoff, and consumed by `/sai-1-spec`. Consumed by reference; never restated at a consuming surface.

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
**Terms**:
- <agreed term: definition, or None>
**Edge Cases**:
- <agreed `E1`…`En` behavior statement, or None>
**Implementation Details**:
- <agreed `I1`…`In` statement in order, or None>
**Request Additional Notes**:
<optional free Markdown: paragraphs or bullets>
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

Sections follow the block order above; `**Overview language**` is the last line before the `---` separator.

`**Request Additional Notes**` is optional and sits outside the five mandatory sections: when present it follows `**Implementation Details**` and immediately precedes `**Overview language**`; when it has no content it is omitted entirely — no label, no `- None`.

## Field rules

- **Change name**: kebab-case suggestion
- **What**: 1–2 sentences describing the change
- **Why**: 1–2 sentences stating the motivation; may carry optional inline `file:line` or `path:startLine-endLine` provenance citations as evidence for intent, including references to `openspec/changes/{name}/**` or `openspec/specs/**`
- **Capabilities in scope**: the user-facing boundaries for this run; OpenSpec bookkeeping artifacts (`openspec/changes/{name}/**`, `openspec/specs/**`) are excluded — they are consequences owned by backfill and archive
- **Research Leads**: non-authoritative starting points for later investigation — concise repository-relative `path` or `path:start-end` entries with short relevance notes, which may point into OpenSpec artifacts; emits exactly `- None` when no useful lead exists; a lead SHALL NOT designate a file to modify, define implementation scope, or replace provenance
- **Decisions & Rationale**: may carry the same optional provenance citations as **Why**, including OpenSpec references
- **Alternatives Considered**: rejected alternatives or None
- **Trade-offs Accepted**: accepted trade-offs or None
- **Model / Re-framings**: model re-framings or None
- **Key constraints**: constraints or non-goals
- **Terms**: agreed terms fixed before edge cases, each as `term: definition`; emits exactly `- None` when no term was agreed; conversation-only agreement, never a file write
- **Edge Cases**: agreed `E1`…`En` behavior statements in their established order, or exactly one `- None` bullet when the agreed list is empty
- **Implementation Details**: agreed `I1`…`In` statements in their established order with identifiers and wording preserved, or exactly one `- None` bullet when the agreed list is empty. `wording preserved` means identifiers and order, not source language, and does not block translation under the crystallization language gate.
- **Request Additional Notes**: optional, free-form, non-normative Markdown (paragraphs or bullets) carrying user-agreed context from the conversation that fits no other field. Emission rules:
  - emit it only when the conversation left agreements that fit no official field; never duplicate content already carried by another field, and never emit it empty or as `- None`;
  - an agreement that imposes an obligation is binding and goes to `**Edge Cases**`, `**Implementation Details**`, or `**Key constraints**`, never to this field;
  - in a sliced crystallization set, each per-slice block carries only its own slice's notes, or omits the field;
  - `/sai-3-implement`'s escalation block may include the field but is not required to.

  Consumers treat it as informative context only: no requirement, scenario, or mandatory scope derives from it. `/sai-1-spec` and backfill copy it verbatim (no rewriting, summarizing, translating, or merging) into the dedicated `## Request Additional Notes` section of `proposal.md`, kept separate from `## Additional Notes`.
- **Overview language**: the explicit `--overview-lang` option value or literal None; reflects only what is knowable at print time, so a gate-9-selected value never appears in an already-emitted block

Provenance citations are optional: with nothing to cite, **Why** and **Decisions & Rationale** carry no citation placeholder. Provenance is evidence for intent only and SHALL NOT designate files to modify; the block has no target-file field.
