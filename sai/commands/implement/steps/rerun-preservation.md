# Implement Step — Re-run Preservation

Loaded by `plan-generation` only when `implementation.md` already exists in `openspec/changes/{change-name}/` at run start.

#### Re-run preservation path

On a re-run, this step builds its output from the prior `implementation.md` as the collapse step left it on disk — it does NOT regenerate from the implementation plan template. The preservation path runs in three phases: **classify**, **preserve**, then **append audit-derived steps**. The INCOMPLETE gate in **Append audit-derived steps** is evaluated before preserving: a `failed` gate writes nothing.

##### Classify each prior step

Before preserving or appending anything, classify every `#### Step N:` section in the prior file from its checkbox state. Distinguish two checkbox categories **functionally** (by what the box's line does, not by a literal phrase — the file does not use the phrase "instruction box"):

- **Code-writing checkbox** — its line introduces or modifies project files: a RED phase box that writes a failing test or stub, or a GREEN phase box that writes the implementation.
- **Verification checkbox** — its line only runs or inspects: a Verification Checklist box, a "Verify RED" / GATE box, or a "Verify GREEN" box.

The classifications:

- **APPLIED** — every checkbox in the step is `[x]` (the collapse step will already have collapsed it to `*(already applied)*`).
- **VERIFY-PENDING** — every code-writing checkbox is `[x]` but at least one verification checkbox is `[ ]`.
- **INCOMPLETE** — at least one code-writing checkbox is `[ ]`.

Classification is derived from checkbox state only, not from commit history.

Classification actions:

- Each **INCOMPLETE** step is a pending step apply will run. INCOMPLETE alone never halts the run; the gate that acts on it lives in **Append audit-derived steps**.
- Each **VERIFY-PENDING** step is named as a warning in the terminal `summary`, then the run continues best-effort. A VERIFY-PENDING classification MUST NOT, by itself, halt the run.
- Proceed to preserve the prior file.

##### Preserve the prior file byte-for-byte

Once the INCOMPLETE gate in **Append audit-derived steps** has been evaluated and has not failed the run, build the new `implementation.md` by copying the prior file as the collapse step left it:

- Every step the collapse step collapsed to a heading followed by `*(already applied)*` is copied **byte-for-byte** — the heading line and the exact marker line, unchanged. Do NOT rewrite, re-expand, re-word, re-number, or re-order a compacted step. Do NOT add commit references or timestamps to the marker. Do NOT re-open a compacted step (no code blocks, checklists, or any other content added back to it).
- Every step with at least one unchecked `[ ]` checkbox is carried over unchanged.
- Orphan headings (steps no longer present in `tasks.md`) are preserved as-is — never deleted, renamed, or remapped. `tasks.md` drift is out of scope.
- This step never re-derives an existing step from the implementation plan template.

##### Append audit-derived steps

An audit artifact is `review.md`, `security.md`, `performance.md`, or `accessibility.md` in `openspec/changes/{change-name}/`. An **audit step** is the step appended for one audit artifact and MUST use the required heading literal `#### Step N: Address <kind> findings`, with `<kind>` one of `review`, `security`, `performance`, `accessibility`. A **pending audit step** is a step with that heading and at least one `[ ]` in its section.

Skip every audit artifact whose latest audit step (matched by that heading literal for its `<kind>`) is still pending: that step already carries it, and it is not re-appended. The remaining artifacts are those needing a new audit step.

**INCOMPLETE gate:** if at least one artifact needs a new audit step and **any** prior step is **INCOMPLETE**, return `failed` before preserving or appending anything. The `summary` names each INCOMPLETE step, the audit artifacts that need a new step, and the next action: run `/sai-4-apply <change>` to finish the pending Steps, then re-plan. Audit steps would otherwise be generated on the false premise that the pending steps' code exists.

Otherwise, for each audit artifact needing a new audit step, append exactly one new step at the end of `implementation.md`:

- Number the first appended step strictly after the **highest** existing `#### Step N:` number found in the prior file (scan every `#### Step N:` heading, so out-of-order or orphan headings still yield the correct N+1). Subsequent appended steps continue N+2, N+3, …
- Each appended step is dedicated to a single artifact and MUST NOT be merged into an existing step (e.g., `#### Step 7: Address review findings`, `#### Step 8: Address security findings`).
- Use the Apply/Discard classification that `artifact-analysis` produced with the **Judgment Rubric for Audit Findings**. The appended step contains the Apply code actions and the Discarded findings sub-block side by side — the Discarded sub-block lives INSIDE the same step, not as a separate step.
- **All-Discarded case:** when every finding in an artifact is Discard, the appended step SHALL still exist, containing only the Discarded findings sub-block and a single `- [ ] No code changes from this audit` checkbox (no Apply code actions). The user closes the step by checking that box.
- **Discard confirmation:** list each Discarded finding in the terminal `summary` (one line per Discard, plus the verbatim Q text for any Q Discard), inviting the user to confirm or override before `/sai-4-apply` starts. Confirmation is conversational only — do NOT write any approval key to `.openspec.yaml` and do NOT introduce a new approval gate.
- When an audit artifact's finding references an already-compacted step, address it as a **new appended step** whose text references the original step number. Do NOT re-open or modify the compacted step the finding names.
- If no audit artifact needs a new audit step, append nothing — the preserved file stands as-is, byte-for-byte, and the run ends `completed`. When INCOMPLETE steps exist, the `summary` lists the pending Steps apply will run, alongside the VERIFY-PENDING warnings.

**Audit-step interface contracts:** apply the rule of the same name in `steps/audit-ingestion.md`, loaded by `artifact-analysis` whenever an audit artifact exists.
