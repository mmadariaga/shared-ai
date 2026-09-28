# Implement Step — Artifact Analysis

Active step: artifact-analysis. Parse all change artifacts, classify audit findings, and validate design decisions for ADR/DDR, then report the `artifact-analysis` progress event per the worker contract.

### Parse the artifacts

Read the full content of `proposal.md`, `design.md`, `tasks.md`, and all `specs/**/*.md` before applying the workflow steps below.

- Extract change metadata (name, affected files)
- Parse all implementation steps from `tasks.md` in order
- Identify affected files and intended actions per step
- Extract and internalize the Expertise Profile from `## Implementation Context` in `tasks.md`

**Exception (audit artifacts):** Check whether any of `review.md`, `security.md`, `performance.md`, or `accessibility.md` exist in `openspec/changes/{change-name}/`. For each one that exists, read it and apply the **Judgment Rubric for Audit Findings** (see below) to every finding, classifying each as Apply, Discard, or Escalate. The classified results are evaluated for escalations first (see **Escalation Detection and Handoff** below); if escalations exist, the run stops. Otherwise, the plan-generation step appends audit-derived steps from this Apply/Discard classification — the append description lives at that execution site; this step only reads and classifies.

### Judgment Rubric for Audit Findings

The rubric is defined normatively in `openspec/specs/audit-artifact-ingestion/spec.md`; this section is its operational restatement. This step applies it once per run; the plan-generation step appends from the resulting classification.

For every finding in an existing audit artifact (`review.md`, `security.md`, `performance.md`, `accessibility.md`), evaluate all five criteria and classify the finding as **Apply**, **Discard**, or **Escalate**:

1. **Severity** — does the finding rise to Critical/High (the shared audit severity vocabulary used by review, security, performance, and accessibility), or is it a non-issue?
2. **Actionability** — is the proposed fix specific enough to implement as a concrete file:line change, or is it a vague suggestion?
3. **Spec-decision consistency** — does the finding contradict a decision in `design.md` or a requirement in `specs/**/*.md`?
4. **Duplication** — does the finding repeat another finding already addressed in an earlier step of `implementation.md`?
5. **Scope** — does the finding stay within the change's declared scope, or does it propose out-of-scope work?

The Apply/Discard/Escalate classification SHALL follow from the rubric outcome, not from gut feel.

- **Apply** findings are rendered as concrete code-writing checkboxes (file:line location + specific change) inside the appended audit step — the same kind of code-writing checkboxes the implementation plan template uses elsewhere in `implementation.md`.
- **Escalate** findings are those that contradict an existing decision or requirement (criterion 3 fails) or propose work that exceeds the change's declared scope and would require new acceptance criteria not yet established (criterion 5 fails). When any finding is classified as Escalate, the run stops before `plan-generation` appends any audit-derived steps, and instead emits a `Ready to Propose` block for a new change derived from the escalated findings. No Escalate findings are appended as code actions. Each escalated finding that stops the run records the artifact source (`review.md`, `security.md`, etc.) and finding id for research-leads population in the emitted proposal.
- **Discard** findings appear in a **Discarded findings sub-block** inside the same appended step (not a separate step). Each entry uses the format:
  `**{id}** — {one-sentence reason} (source: {artifact} § {category} {id})`
- **Question (Q) findings** (only `review.md` has a Questions category) are auto-discarded with the reason `requires user response, not a code change`. The full Q text SHALL be transcribed verbatim beneath the entry line so the user can answer in chat. Q findings SHALL NOT be rendered as Apply code actions under any circumstance.
- **Informational findings** in `security.md` / `performance.md` / `accessibility.md` are NOT auto-discarded — they go through the normal rubric like any other finding. (Only `review.md` Questions are auto-discarded; `security.md` has no Informational tier, while `performance.md` and `accessibility.md` do.)

**Escalation Detection and Handoff**: After classifying each finding in all audit artifacts, check whether any finding was classified as **Escalate**. If escalations exist:
  1. Do NOT generate any appended audit step.
  2. Do NOT continue to `plan-generation`.
  3. Group escalated findings by the scope of work they imply: two findings from different artifacts belong in the same group when they describe the same missing change or overlapping capability gap. Each group represents one proposed change (e.g., findings from `review.md` and `security.md` that both reveal a missing authentication requirement belong together; a finding about a missing configuration file would be a separate group).
  4. For each group of escalated findings, emit a `Ready to Propose` block from `sai/policies/ready-to-propose-format.md` with:
     - **Change name**: a kebab-case suggestion derived from the escalated work (e.g., `add-authentication-requirement`, `missing-config-file-handling`). Derive the name from the substance of the missing work, not from its source artifacts. When the work is genuinely too ambiguous to name, acknowledge the ambiguity in **What** and use the most concrete descriptor available from the findings.
     - **What**: a 1–2 sentence summary of the escalated work.
     - **Why**: describing the gap, issue, or constraint revealed by the escalated findings, citing the source artifacts and finding ids as evidence (e.g., `Finding C1 in review.md and finding S2 in security.md both reveal that the current change's scope does not cover authentication, which contradicts the requirement in specs/auth.md.`).
     - **Research Leads**: populated from the repository-relative paths the escalated findings point to in the codebase (e.g., `specs/auth.md`, `sai/commands/config/auth-handler.md`, any source files the findings cite). Do NOT use artifact offsets or finding id suffixes; Research Leads are pointers to code and documentation the findings reference, not the audit artifact itself.
     - **Edge Cases**: `- None` (only explore can agree on edge cases with the user).
     - **Implementation Details**: `- None` (only explore can agree on implementation details with the user).
     - All other sections populated to the best of the agent's ability from the escalated findings' text.
  5. Return `failed`, with `summary` carrying every emitted Ready to Propose block (one block per escalation group), and stop the run.

### Validate design decisions for ADR/DDR

Read the `## Decisions` section from `design.md`. Fetch @sai/policies/adr-ddr-criteria.md and evaluate each recorded decision against the three ADR/DDR criteria it defines.
- **Resolve the record family first**: only when all three criteria hold, resolve the decision's record family (`adr` or `ddr`) before deciding record creation. Read the decision's `**Record family**: adr|ddr` marker from `design.md` when present — do NOT re-decide a family the design already recorded. When the marker is absent (the design predates this requirement, or the decision surfaced only at implementation time), apply the ordered routing test defined in that policy.
- **Culture check before any ask**: only after all three criteria hold and the record family is resolved, use the resolved family's physical `0000-INDEX.md` as the sole culture signal: `docs/adr/0000-INDEX.md` for `adr` or `docs/ddr/0000-INDEX.md` for `ddr`. Do not infer culture from any other ADR/DDR records, from the other family's index, or from records/files outside these recognized locations; a missing index means no culture whether the resolved family has records or no records at all. If the resolved-family index exists, create the `docs/<family>/NNNN-slug.md` file directly without asking; its index uses the warm-splice branch. If it is absent, ask the user a closed yes/no on creation through `needs_input` that names the resolved family (e.g. "This decision qualifies as a DDR. Do you want me to create it?") and create the file only upon explicit approval; its index uses the cold-build branch. Never offer an ADR-vs-DDR choice in the ask. If the decision does not meet all three criteria, create nothing and ask nothing.
- **Record authoring and index maintenance**: before writing the first record this run creates, Fetch @sai/commands/implement/steps/decision-record-index.md and follow it for every record created and for each family's index. When this run creates no record, skip it.
