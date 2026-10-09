# Design Step — Research

Active step: research. Gather source evidence for design and identify any unresolved facts; report the `research` progress event per the worker contract. The `design.md` Open Questions gate runs in the tasks step after design is written.

## Inputs

Read the following known files in the main agent (paths are fixed by convention):
- `openspec/changes/{resolved_change_name}/proposal.md` — motivation, what changes, capabilities in scope
- All files matching `openspec/changes/{resolved_change_name}/specs/**/*.md` — capability delta specs

## Codebase research (delegated)

Start from the evidence you already have: `proposal.md`, including `## Proposal Research Documentation`, the specs, and on a rerun the existing design artifacts. Research the gaps: the files the design changes, their callers, the tests that cover them, and any fact that is missing, contradictory, or possibly stale. A path cited in that evidence that no longer exists or now points at unrelated content is a gap, never trusted. Delegate gap research to `budget-explorer`; the design worker does not search or open source files itself. A proposal without `## Proposal Research Documentation` blocks nothing: research the gaps from the specs.

Launch `budget-explorer` with this goal and output contract:

> Read the proposal and specs for change `{resolved_change_name}`, then verify only these gaps: `{gaps}`. Choose search tools by your research ladder. Return structured data with exactly `files` and `unresolved` (plus the explorer's mandatory `ladder_discards` and `out_of_root_requests`). `files` contains at most 12 entries, each with `filePath`, `keyExports`, `isReusableForThisChange` (boolean), and `notes` (at most 20 words, citing source lines for claims that determine the design). `unresolved` lists relevant files or claims not yet verified, with a reason. Limit the entire response to 350 words; no raw file contents or narrative.

Use the report to make design decisions. If directly affected callers, tests, or claims remain unverified, continue with a targeted `budget-explorer` request before closing this step. Research is done when every file the design changes, its callers, and its tests are verified. Carry unresolved design decisions into `design.md` for the tasks-step gate.

When consuming `ladder_discards`, Fetch @sai/policies/explore-agent.md and apply
only § Missing-tool notice presentation; retain internal diagnostics without
adopting the explorer's role, ladder execution, or shell restrictions.

## Evidence boundary

Source files are the authority for codebase facts; the explorer reports bounded evidence from them. When a report is surprising, ambiguous, or conflicts with another source, ask the explorer to check the specific claim and cite the source lines. If the evidence remains unresolved and blocks drafting `design.md`, return `needs_input` for that decision.

The budget skill loaded through `common.md` owns dispatch mechanics and tool-call limits. A file marked `NOT_FOUND` remains unresolved.
