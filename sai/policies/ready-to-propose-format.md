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
- **Request Additional Notes**: optional, free-form, non-normative Markdown (paragraphs or bullets) carrying discussed, agreed context that could influence implementation and fits no other field. Examples of what it holds, not an exhaustive list:
  - future behavior the conversation agreed on but excluded from this change;
  - related follow-up work, such as PBIs or tickets;
  - any other agreed context of this kind, including points the conversation left explicitly undecided.

  A non-goal and its detail are two facts. The non-goal is a binding exclusion of this change and goes to `**Key constraints**`; its detail (how the excluded behavior should work later) is context and goes here. The pair is not duplication. Likewise, a requirement that describes future behavior outside this change goes here as future context; an obligation of this change goes to `**Edge Cases**`, `**Implementation Details**`, or `**Key constraints**`.

  **Emission sweep**, run before the block is printed: the sweep is complete when every discussed-and-excluded topic whose detail goes beyond its non-goal in `**Key constraints**` has that detail in `**Request Additional Notes**`. When no content meets this criterion or the definition above, omit the field.

  Guardrails, each with its target:
  - carry each fact once, in the field that owns it: this field takes only context that no other field states;
  - emit the field with content, or omit it entirely; an empty field or a `- None` bullet is never emitted;
  - in a sliced crystallization set, each per-slice block sweeps only its own slice's content and carries only its own slice's notes, or omits the field;
  - `/sai-3-implement`'s escalation block may include the field but is not required to.

  Illustrative example (generic, not required wording):

  ```
  **Key constraints**:
  - Report archiving is out of scope for this change.
  **Request Additional Notes**:
  Future scope, outside this change: an archived report becomes read-only, keeps its owner, and is purged after the retention period; a follow-up ticket tracks this work. Undecided: whether an administrator can restore an archived report.
  ```

  Consumers treat it as informative context only: no requirement, scenario, or mandatory scope derives from it. `/sai-1-spec` and backfill copy it verbatim (no rewriting, summarizing, translating, or merging) into the dedicated `## Request Additional Notes` section of `proposal.md`, kept separate from `## Additional Notes`.
- **Overview language**: the explicit `--overview-lang` option value or literal None; reflects only what is knowable at print time, so a gate-9-selected value never appears in an already-emitted block

Provenance citations are optional: with nothing to cite, **Why** and **Decisions & Rationale** carry no citation placeholder. Provenance is evidence for intent only and SHALL NOT designate files to modify; the block has no target-file field.
