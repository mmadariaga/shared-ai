# Implement Step — Plan Generation

Active step: plan-generation. Generate the full `implementation.md` plan, then report the `plan-generation` progress event per the worker contract.

### Step 5: Generate Full Implementation

**Escalation check.** Before generating, check whether escalations were detected and emitted in the `artifact-analysis` step. If escalations exist:
- The `Ready to Propose` block has already been emitted in chat by `artifact-analysis`.
- Do NOT generate `implementation.md` or proceed with plan generation.
- Return a terminal status reflecting the escalation stop (coordinates already handled by artifact-analysis).

**Re-run preamble.** Before generating, check whether `openspec/changes/{change-name}/implementation.md` already exists on disk (equivalently: whether Step 1 ran at all). The check keys on **file presence**, not on the count of steps Step 1 collapsed — a file where every step is FALLO MENOR (code applied, verification pending) has zero collapsed steps but MUST still be preserved.

- **If the file does NOT exist (first run):** take the **first-run generation path** below.
- **If the file exists (re-run):** take the **re-run preservation path** below. Do NOT fall through into implementation-plan-template regeneration on a re-run.

#### First-run generation path

- Create one full markdown file using the implementation plan template
- Include:
- Complete code for each step
- Precise file locations
- Checkboxes for every action
- Concrete verification instructions
- STOP & COMMIT markers after each step
- No placeholders, no TODOs, no ambiguity
- All code MUST strictly follow the Expertise Profile from `tasks.md`
- **Interface conformance**: When `interfaces.md` exists for this change, treat its per-step `**Interfaces**` block as the authoritative declaration of public signatures for that Step. Every function/method signature, exported type, and public surface generated into `implementation.md` for Step N SHALL match the signature declared under the matching `## Step N` in `interfaces.md`. The generated plan SHALL NOT introduce a public signature that contradicts the one declared in `interfaces.md`.
- **Absent-`interfaces.md` fallback**: If no `interfaces.md` exists for the change, generate `implementation.md` from `tasks.md`/`design.md` as before, with no interface-conformance gating.
- **STOP on unsatisfiable signature**: If a signature declared in `interfaces.md` cannot be honored (for example it is inconsistent with the stack, an existing API, or another Step's contract), STOP and surface the conflict as an interface amendment request to the coordinator/human. Do NOT amend the interface autonomously, and do NOT silently generate a divergent signature to work around the conflict.
- Before writing any Verification Checklist, determine whether the step's output is observable in the browser at this point (i.e., the component or change is already rendered in the app). Apply the following rules:
- **Automated checks** (lint, build, typecheck, unit tests): always include in the step where they apply. The agent runs these before stopping.
- **Human checks** (browser/UI behavior): only include them in the step where the behavior is first observable. If a step creates a component not yet integrated into any page or layout, defer all its Human checks to the integration step.
- **Deferred checks**: at the integration step, group all deferred Human checks before the step's own Human checks, using labeled blocks per origin step (see the implementation plan template).
- **Service-side / non-UI steps** (no observable browser behavior anywhere — config, migration, scaffolding, or service-side logic): omit the `**Human (...)**` header entirely and emit a single italic parenthetical note explaining why no human check applies (e.g. `*(No Human checks — service-side step with no observable browser behavior.)*`). Do NOT invent a `- [ ] No human check required` (or any equivalent placeholder) checkbox. This differs from a deferred check: a deferred check's human verification lands at a later integration step, whereas a service-side step has no human check anywhere.
- **RED → GREEN for testable steps:** For any step that introduces testable code (new functions, classes, endpoints, components, business logic), structure it as:
      1. **RED**: Write the test first. The test must fail when run against the current codebase (before the step's code is added). This proves the test is real and not tautological.
      2. **GREEN**: Write the minimal implementation that makes the test pass.
      3. No refactor phase — keep it minimal.
      - **Valid RED failure** = the test runner exits non-zero AND the failure is an assertion failure attributable to the missing/incomplete code under test (assertion mismatch, expected vs actual, raised wrong exception). It is NOT a valid RED if the failure is a setup/import/compilation error, a missing dependency, a syntax error in the test file itself, or any error unrelated to the behaviour being asserted. If the only way to make the test fail is by referencing a symbol that does not yet exist, scaffold a minimal stub that exposes the symbol and returns/raises the wrong value, so the failure is a proper assertion failure.
      - If a step is NOT testable (config changes, migrations, scaffolding), skip RED/GREEN and use the standard format.
      - Include both RED and GREEN verification commands in the Verification Checklist.
      - **Test retirements:** When a step replaces obsolete guard tests, list each retirement ONLY inside that step's RED block — one entry per retired file, using its exact repository-relative path, marked `retired`. A green-direct Step (no RED block) never carries retirements. Every Step whose RED block retires files adds one Verification Checklist item per retired file asserting that file's absence; the coordinator runs it after the RED dispatch returns and before GREEN may be dispatched.
- **Audit artifacts on a first run (rare):** If any of `review.md`, `security.md`, `performance.md`, `accessibility.md` exists in `openspec/changes/{change-name}/`, invoke the **Judgment Rubric for Audit Findings** on all findings first. If any findings are classified as Escalate, do NOT append any audit steps; instead, the escalation stop and Ready to Propose handoff have already occurred in `artifact-analysis` and the run is concluded. Otherwise, append one audit step per existing artifact after the last template-derived step, emitting the Apply code actions + Discarded findings sub-block. No slot is added to the implementation plan template — audit steps are generated dynamically (see D1 in `design.md`). Number the first audit step strictly after the highest `#### Step N:` number in the generated plan; continue N+2, N+3, … for subsequent artifacts. For each appended audit step, also manage `interfaces.md` contracts per the **Audit-step interface contracts** rule in the re-run preservation path below.

#### Re-run preservation path

On a re-run, Step 5 builds its output from the prior `implementation.md` as Step 1 left it on disk — it does NOT regenerate from the implementation plan template. The preservation path runs in three phases: **classify**, **preserve**, then **append audit-derived steps**.

##### Classify each prior step

Before preserving or appending anything, classify every `#### Step N:` section in the prior file from its checkbox state. Distinguish two checkbox categories **functionally** (by what the box's line does, not by a literal phrase — the file does not use the phrase "instruction box"):

- **Code-writing checkbox** — its line introduces or modifies project files: a RED phase box that writes a failing test or stub, or a GREEN phase box that writes the implementation.
- **Verification checkbox** — its line only runs or inspects: a Verification Checklist box, a "Verify RED" / GATE box, or a "Verify GREEN" box.

The classifications:

- **COMPLETO** — every checkbox in the step is `[x]` (Step 1 will already have collapsed it to `*(already applied)*`).
- **FALLO MENOR** — every code-writing checkbox is `[x]` but at least one verification checkbox is `[ ]`.
- **INCOMPLETO** — at least one code-writing checkbox is `[ ]`.

Classification is derived from checkbox state only, not from commit history.

Gate actions:

- If **any** prior step is **INCOMPLETO**: **STOP** before preserving or appending audit-derived steps. Report to the user which step is incomplete. Downstream audit steps would otherwise be generated on the false premise that the step's code exists.
- If no step is INCOMPLETO but one or more steps are **FALLO MENOR**: emit a warning naming each FALLO MENOR step, then continue best-effort. A FALLO MENOR classification MUST NOT, by itself, halt the run.
- If every step is **COMPLETO** (or the only non-COMPLETO steps are FALLO MENOR): proceed to preserve the prior file.

##### Preserve the prior file byte-for-byte

Build the new `implementation.md` by copying the prior file as Step 1 left it:

- Every step Step 1 collapsed to a heading followed by `*(already applied)*` is copied **byte-for-byte** — the heading line and the exact marker line, unchanged. Do NOT rewrite, re-expand, re-word, re-number, or re-order a compacted step. Do NOT add commit references or timestamps to the marker. Do NOT re-open a compacted step (no code blocks, checklists, or any other content added back to it).
- Every step with at least one unchecked `[ ]` checkbox is carried over unchanged.
- Orphan headings (steps no longer present in `tasks.md`) are preserved as-is — never deleted, renamed, or remapped. `tasks.md` drift is out of scope.
- Step 5 never re-derives an existing step from the implementation plan template.

##### Append audit-derived steps

After preservation, check whether escalations were detected in `artifact-analysis`. If escalations exist, the escalation stop and Ready to Propose handoff have already occurred, and the run is concluded; do NOT append any audit steps.

Otherwise, for each audit artifact that exists in `openspec/changes/{change-name}/` among `review.md`, `security.md`, `performance.md`, `accessibility.md`, append exactly one new step at the end of `implementation.md`:

- Number the first appended step strictly after the **highest** existing `#### Step N:` number found in the prior file (scan every `#### Step N:` heading, so out-of-order or orphan headings still yield the correct N+1). Subsequent appended steps continue N+2, N+3, …
- Each appended step is dedicated to a single artifact and MUST NOT be merged into an existing step (e.g., `#### Step 7: Address review findings`, `#### Step 8: Address security findings`).
- For every finding in the artifact, invoke the **Judgment Rubric for Audit Findings** and classify it as Apply or Discard. (Escalate findings, if any, are detected and handled exclusively in `artifact-analysis`; if escalations existed, the run would have stopped there and never reached this step.) The appended step contains the Apply code actions and the Discarded findings sub-block side by side — the Discarded sub-block lives INSIDE the same step, not as a separate step.
- **All-Discarded case:** when every finding in an artifact is Discard, the appended step SHALL still exist, containing only the Discarded findings sub-block and a single `- [ ] No code changes from this audit` checkbox (no Apply code actions). The user closes the step by checking that box.
- **Chat confirmation:** after generating each appended step, print the list of Discarded findings to chat (one line per Discard, plus the verbatim Q text for any Q Discard) and ask the user to confirm or override before the plan is considered final. Confirmation is conversational in chat only — do NOT write any approval key to `.openspec.yaml` and do NOT introduce a new approval gate.
- When an audit artifact's finding references an already-compacted step, address it as a **new appended step** whose text references the original step number. Do NOT re-open or modify the compacted step the finding names.
- If none of the four audit artifacts exist, append nothing — the preserved file stands as-is.

**Audit-step interface contracts:** When appending an audit step to `implementation.md`, also append a corresponding `## Step N:` contract section to `interfaces.md` if and only if the step introduces either a modified interface OR a testable assertion. The contract SHALL omit both `**Interfaces**` and `**Test assertions**` blocks for steps that introduce neither (following the omission rule in `@sai/policies/step-contract-format.md`). Assertions in the contract MUST anchor to requirements that already exist in `specs/**`; audit-derived assertions cannot create new acceptance criteria — they can only assert against existing requirements. The RED block for an audit step is determined by testability: a step that introduces testable code carries a RED block per `sai/commands/implement/instructions.md:164`; a step that is not testable (config, scaffolding, internal refactors) omits the RED block entirely, regardless of whether any finding violated an existing requirement. If `interfaces.md` holds only the `None — no step contracts` sentinel, the first audit step that introduces a contract replaces the sentinel; subsequent audit steps append new `## Step N:` sections normally.

Do NOT add audit-step dedup logic. Idempotency across repeated audit-loop passes is out of scope — append one new step per existing artifact each re-run, exactly as the spec contract states. The judgment is re-exercised on every re-run; judgment is not idempotent w.r.t. the audit artifact, so two re-runs against the same unchanged artifact may produce slightly different Apply/Discard lists.

<research_task>

Confirm conventions WITHOUT fresh codebase exploration. `tasks.md`'s `## Required Documentation`
and `## Implementation Context` are the primary source of truth.

1. Codebase Verification (bounded)
   - Use ONLY the file paths listed in `tasks.md` `## Required Documentation` to confirm
      existing conventions (layout, naming, error handling, logging, testing patterns,
      permission boundaries).
   - If a convention is needed for code generation but is not nailed down by `tasks.md`
      (Expertise Profile silent AND no neighbour file in Required Documentation
      demonstrates it), STOP and ask the user. Do NOT run repo-wide Grep/Glob to
      guess the convention — that is `tasks.md`'s job.
   - Build/test/run commands come from the Expertise Profile or AGENTS.md if listed.

4. Official Docs
   - Read ONLY the documents listed in `## Required Documentation` from `tasks.md`
   - Do NOT fetch generic documentation or load skill indexes
   - Extract only what is needed to confirm syntax, API signatures, and version-specific behaviors for this feature

5. Domain Language
   - Read the project-root `GLOSSARY.md` (`./GLOSSARY.md`) if it exists — this is its single canonical location; do not fall back to `openspec/changes/{name}/`. Format reference: use the `<glossary_format>` block pre-loaded in context to interpret the file structure (Language, Relationships, Example dialogue, Flagged ambiguities).
   - Use its canonical terms for all new identifiers (classes, functions, files, variables) in the generated plan.
   - If the spec introduces a term not in `GLOSSARY.md`, use the exact term from the spec and do not invent synonyms.

   Return a single research package that allows confident code generation with no guessing.

</research_task>

---

The implementation plan template (loaded below) applies to the **first-run generation path only**. On a re-run, Step 5 uses the re-run preservation path and MUST NOT regenerate existing steps from this template.

Fetch @sai/commands/implement/implementation-plan.template.md
