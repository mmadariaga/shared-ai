# Implement Step — Re-run Preservation

Loaded by `plan-generation` only when `implementation.md` already exists in `openspec/changes/{change-name}/` at run start.

#### Re-run preservation path

On a re-run, this step builds its output from the prior `implementation.md` as the collapse step left it on disk — it does NOT regenerate from the implementation plan template. The preservation path runs in three phases: **classify**, **preserve**, then **append audit-derived steps**.

##### Classify each prior step

Before preserving or appending anything, classify every `#### Step N:` section in the prior file from its checkbox state. Distinguish two checkbox categories **functionally** (by what the box's line does, not by a literal phrase — the file does not use the phrase "instruction box"):

- **Code-writing checkbox** — its line introduces or modifies project files: a RED phase box that writes a failing test or stub, or a GREEN phase box that writes the implementation.
- **Verification checkbox** — its line only runs or inspects: a Verification Checklist box, a "Verify RED" / GATE box, or a "Verify GREEN" box.

The classifications:

- **APPLIED** — every checkbox in the step is `[x]` (the collapse step will already have collapsed it to `*(already applied)*`).
- **VERIFY-PENDING** — every code-writing checkbox is `[x]` but at least one verification checkbox is `[ ]`.
- **INCOMPLETE** — at least one code-writing checkbox is `[ ]`.

Classification is derived from checkbox state only, not from commit history.

Gate actions:

- If **any** prior step is **INCOMPLETE**: return `failed` before preserving or appending audit-derived steps, naming the incomplete step. Downstream audit steps would otherwise be generated on the false premise that the step's code exists.
- If no step is INCOMPLETE but one or more steps are **VERIFY-PENDING**: name each VERIFY-PENDING step as a warning in the terminal `summary`, then continue best-effort. A VERIFY-PENDING classification MUST NOT, by itself, halt the run.
- If every step is **APPLIED** (or the only non-APPLIED steps are VERIFY-PENDING): proceed to preserve the prior file.

##### Preserve the prior file byte-for-byte

Build the new `implementation.md` by copying the prior file as the collapse step left it:

- Every step the collapse step collapsed to a heading followed by `*(already applied)*` is copied **byte-for-byte** — the heading line and the exact marker line, unchanged. Do NOT rewrite, re-expand, re-word, re-number, or re-order a compacted step. Do NOT add commit references or timestamps to the marker. Do NOT re-open a compacted step (no code blocks, checklists, or any other content added back to it).
- Every step with at least one unchecked `[ ]` checkbox is carried over unchanged.
- Orphan headings (steps no longer present in `tasks.md`) are preserved as-is — never deleted, renamed, or remapped. `tasks.md` drift is out of scope.
- This step never re-derives an existing step from the implementation plan template.

##### Append audit-derived steps

After preservation, for each audit artifact that exists in `openspec/changes/{change-name}/` among `review.md`, `security.md`, `performance.md`, `accessibility.md`, append exactly one new step at the end of `implementation.md`:

- Number the first appended step strictly after the **highest** existing `#### Step N:` number found in the prior file (scan every `#### Step N:` heading, so out-of-order or orphan headings still yield the correct N+1). Subsequent appended steps continue N+2, N+3, …
- Each appended step is dedicated to a single artifact and MUST NOT be merged into an existing step (e.g., `#### Step 7: Address review findings`, `#### Step 8: Address security findings`).
- Use the Apply/Discard classification that `artifact-analysis` produced with the **Judgment Rubric for Audit Findings**. The appended step contains the Apply code actions and the Discarded findings sub-block side by side — the Discarded sub-block lives INSIDE the same step, not as a separate step.
- **All-Discarded case:** when every finding in an artifact is Discard, the appended step SHALL still exist, containing only the Discarded findings sub-block and a single `- [ ] No code changes from this audit` checkbox (no Apply code actions). The user closes the step by checking that box.
- **Discard confirmation:** list each Discarded finding in the terminal `summary` (one line per Discard, plus the verbatim Q text for any Q Discard), inviting the user to confirm or override before `/sai-4-apply` starts. Confirmation is conversational only — do NOT write any approval key to `.openspec.yaml` and do NOT introduce a new approval gate.
- When an audit artifact's finding references an already-compacted step, address it as a **new appended step** whose text references the original step number. Do NOT re-open or modify the compacted step the finding names.
- If none of the four audit artifacts exist, append nothing — the preserved file stands as-is.

**Audit-step interface contracts:** When appending an audit step to `implementation.md`, also append a corresponding `## Step N:` contract section to `interfaces.md` if and only if the step introduces either a modified interface OR a testable assertion. The contract SHALL omit both `**Interfaces**` and `**Test assertions**` blocks for steps that introduce neither (following the omission rule in `@sai/policies/step-contract-format.md`). Assertions in the contract MUST anchor to requirements that already exist in `specs/**`; audit-derived assertions cannot create new acceptance criteria — they can only assert against existing requirements. The RED block for an audit step is determined by testability: a step that introduces testable code carries a RED block per the RED → GREEN hard rule in `steps/common.md`; a step that is not testable (config, scaffolding, internal refactors) omits the RED block entirely, regardless of whether any finding violated an existing requirement. If `interfaces.md` holds only the `None — no step contracts` sentinel, the first audit step that introduces a contract replaces the sentinel; subsequent audit steps append new `## Step N:` sections normally.
