# Implement Step — Audit Ingestion

Loaded by `artifact-analysis` only when an audit artifact (`review.md`, `security.md`, `performance.md`, or `accessibility.md`) exists in `openspec/changes/{change-name}/` at run start.

For each audit artifact that exists, read it and apply the **Judgment Rubric for Audit Findings** (see below) to every finding, classifying each as Apply, Discard, or Escalate. The classified results are evaluated for escalations first (see **Escalation Detection and Handoff** below); if escalations exist, the run stops. Otherwise, the plan-generation step appends audit-derived steps from this Apply/Discard classification — the append description lives at that execution site; this step only reads and classifies.

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
     - **Out of scope Implementation Details**: `- None`.
     - All other sections populated to the best of the agent's ability from the escalated findings' text.
  5. Return `failed`, with `summary` carrying every emitted Ready to Propose block (one block per escalation group), and stop the run.

**Audit-step interface contracts:** When appending an audit step to `implementation.md`, also append a corresponding `## Step N:` contract section to `interfaces.md` if and only if the step introduces either a modified interface OR a testable assertion. The contract SHALL omit both `**Interfaces**` and `**Test assertions**` blocks for steps that introduce neither (following the omission rule in `@sai/policies/step-contract-format.md`). Assertions in the contract MUST anchor to requirements that already exist in `specs/**`; audit-derived assertions cannot create new acceptance criteria — they can only assert against existing requirements. The RED block for an audit step is determined by testability: a step that introduces testable code carries a RED block per the RED → GREEN hard rule in `steps/common.md`; a step that is not testable (config, scaffolding, internal refactors) omits the RED block entirely, regardless of whether any finding violated an existing requirement. If `interfaces.md` holds only the `None — no step contracts` sentinel, the first audit step that introduces a contract replaces the sentinel; subsequent audit steps append new `## Step N:` sections normally.
