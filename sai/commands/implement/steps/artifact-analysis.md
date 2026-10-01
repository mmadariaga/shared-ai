# Implement Step — Artifact Analysis

Active step: artifact-analysis. Parse all change artifacts, classify audit findings, and validate design decisions for ADR/DDR, then report the `artifact-analysis` progress event per the worker contract.

### Parse the artifacts

Read the full content of `proposal.md`, `design.md`, `tasks.md`, and all `specs/**/*.md` before applying the workflow steps below.

- Extract change metadata (name, affected files)
- Parse all implementation steps from `tasks.md` in order
- Identify affected files and intended actions per step
- Extract and internalize the Expertise Profile from `## Implementation Context` in `tasks.md`

**Exception (audit artifacts):** When any of `review.md`, `security.md`, `performance.md`, or `accessibility.md` exists in `openspec/changes/{change-name}/` at run start, Fetch @sai/commands/implement/steps/audit-ingestion.md and follow it (classification, escalation handoff). Only in this case; when none exists, skip it silently.

### Validate design decisions for ADR/DDR

Read the `## Decisions` section from `design.md`. Fetch @sai/policies/adr-ddr-criteria.md and evaluate each recorded decision against the three ADR/DDR criteria it defines.
- **Resolve the record family first**: only when all three criteria hold, resolve the decision's record family (`adr` or `ddr`) before deciding record creation. Read the decision's `**Record family**: adr|ddr` marker from `design.md` when present — do NOT re-decide a family the design already recorded. When the marker is absent (the design predates this requirement, or the decision surfaced only at implementation time), apply the ordered routing test defined in that policy.
- **Culture check before any ask**: only after all three criteria hold and the record family is resolved, use the resolved family's physical `0000-INDEX.md` as the sole culture signal: `docs/adr/0000-INDEX.md` for `adr` or `docs/ddr/0000-INDEX.md` for `ddr`. Do not infer culture from any other ADR/DDR records, from the other family's index, or from records/files outside these recognized locations; a missing index means no culture whether the resolved family has records or no records at all. If the resolved-family index exists, create the `docs/<family>/NNNN-slug.md` file directly without asking; its index uses the warm-splice branch. If it is absent, ask the user a closed yes/no on creation through `needs_input` that names the resolved family (e.g. "This decision qualifies as a DDR. Do you want me to create it?") and create the file only upon explicit approval; its index uses the cold-build branch. Never offer an ADR-vs-DDR choice in the ask. If the decision does not meet all three criteria, create nothing and ask nothing.
- **Record authoring and index maintenance**: before writing the first record this run creates, Fetch @sai/commands/implement/steps/decision-record-index.md and follow it for every record created and for each family's index. When this run creates no record, skip it.
