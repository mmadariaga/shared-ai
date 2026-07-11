## Why

The single-change `Ready to Propose` block in `sai/instructions/explore.md` currently has five fields (Change name, What, Why, Capabilities in scope, Key constraints). When the user takes that block to a new `/sai-1-spec` chat, the reasoning behind each decision, the rejected alternatives, and any silent re-framing of the model under discussion all stay in the prior conversation and have to be re-derived in the new chat — the direct cause of avoidable review rounds. Capturing those three decision facets plus a model/re-framings log inside the block makes the block paste-ready across the new-chat boundary.

## What Changes

- Extend the single-change `Ready to Propose` block in `sai/instructions/explore.md` (item 5) by inserting four new sections between `**Capabilities in scope**` and `**Key constraints**`, in this exact order: `**Decisions & Rationale**`, `**Alternatives Considered**`, `**Trade-offs Accepted**`, `**Model / Re-framings**`.
- Each new section uses a bullet list, one line per entry, in the same style as `**Key constraints**`. When a section has no content to record, the section uses a single `None` placeholder line.
- The sliced-feature protocol (item 6) is unchanged; the new sections describe the whole feature, not individual slices, so they do not apply to per-slice blocks.

## Capabilities

### New Capabilities

- `explore-crystallization-block`: extends the single-change `Ready to Propose` block in `sai/instructions/explore.md` (item 5) with four mandatory sections — `**Decisions & Rationale**`, `**Alternatives Considered**`, `**Trade-offs Accepted**`, and `**Model / Re-framings**` — inserted between `**Capabilities in scope**` and `**Key constraints**`, in that order. Each section uses a bullet list in the same style as `**Key constraints**` and uses a `None` placeholder when not applicable. The sliced-feature protocol (item 6) is out of scope for this change.

### Modified Capabilities

<!-- none -->

## Impact

- **Single file edit**: `sai/instructions/explore.md`. No new files, no other shared instruction, command, skill, schema, or `sai-*` wrapper is touched.
- **No change to `/sai-1-spec`**: the command reads the user's message in the new chat, which carries the block content; nothing in the command body needs to change. None of the three `sai-1-spec` wrappers (under `commands/claude/`, `commands/opencode/`, `commands/copilot/`) is modified.
- **No production code, no config, no schema change.** Behavior is purely a structural change to the printed block in `sai-explore`.
- **Sliced-feature protocol (item 6) is out of scope.** The new sections describe the whole feature, not individual slices, so per-slice blocks keep the original 5-field format and do not gain the new sections.
- **Backward compatibility**: the block is paste-ready into the new chat; existing user messages that used the old 5-field block continue to parse, but new explorations produce the 9-field block.

## Proposal Research Documentation

**Local files**: `sai/instructions/explore.md` (the single-change protocol at item 5, the sliced-feature protocol at item 6, the inline-proposal refusal at item 7), `openspec/specs/explore-vertical-slicing/spec.md` (format reference for an explore-scoped capability), `openspec/changes/archive/2026-07-08-explore-codegraph-fallback-notice/proposal.md` (format reference for a single-file explore change that touched the same instruction file), `openspec/changes/archive/2026-07-02-vertical-slices-in-sai-explore/proposal.md` (predecessor that introduced the slicing assessment and the block structure that this change extends).

**External URLs**: none consulted during the spec phase.

## Additional Notes

- **Order is fixed.** The new sections MUST be inserted in this exact order, immediately after `**Capabilities in scope**` and before `**Key constraints**`: (1) `**Decisions & Rationale**`, (2) `**Alternatives Considered**`, (3) `**Trade-offs Accepted**`, (4) `**Model / Re-framings**`. This ordering is part of the requirement and is not up to `sai-2-design` to rearrange.
- **Section style is fixed.** Each new section is a bullet list with one line per entry, matching the existing `**Key constraints**` style (`- <entry>`), so a single parser pattern works for all four new sections. The `None` placeholder is a single bullet whose value is the literal `None` (no surrounding punctuation, no trailing colon).
- **Sections are mandatory, content is not.** The four new sections are always present in the block; the placeholder line is what conveys "no content", not absence of the section. This invariant is what makes the block paste-ready across the new-chat boundary: the parser in `/sai-1-spec` always sees the same nine sections in the same order.
- **Sliced protocol deliberately excluded.** The sliced-feature protocol emits one `Ready to Propose` block per slice; the new sections would describe the parent feature, not a slice, so injecting them per slice would either repeat the same content N times or fragment it incorrectly. The right place for the new sections is the single-change block, which describes the whole feature.
- **Model / Re-framings is optional-content but mandatory-section.** The section is always emitted (with `None` if no re-framing occurred) — its purpose is to flag that the *possibility* of a re-framing was checked, not just to record a re-framing when one happened. The agent is expected to actively look for moments where the model under discussion shifted, not to passively note only the obvious cases.
- **Parser-stability goal.** The same `**SectionName**:` followed by `- <entry>` layout used by `**Key constraints**` is reused for all four new sections so a single parser pattern in downstream code (e.g. a future `/sai-1-spec` enhancement) can handle all six sections uniformly.
