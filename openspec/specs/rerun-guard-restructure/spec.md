# rerun-guard-restructure Specification

## Purpose
TBD - created by archiving change simplify-existing-implementation. Update Purpose after archive.
## Requirements
### Requirement: The re-run guard SHALL be a top-level numbered step, not a sub-step

`sai/instructions/implement.md` SHALL designate the re-run guard as **Step 1** (a top-level `### Step 1:` section), not as a sub-step (e.g., `### Step 1b:`). No other step SHALL occupy Step 1.

#### Scenario: re-run guard appears as Step 1
- **WHEN** `sai/instructions/implement.md` is read
- **THEN** the first `### Step` heading is `### Step 1: Simplify existing implementation.md` (or equivalent top-level phrasing)
- **THEN** no `### Step 1b` heading exists in the file

---

### Requirement: The subagent directive for the re-run guard SHALL be a bold mandatory instruction with a self-contained prompt

The re-run guard step in `sai/instructions/implement.md` SHALL carry a directive of the form `**MANDATORY: Spawn a subagent for this step. Do NOT read \`implementation.md\` yourself.**` followed by a complete, self-contained subagent prompt. The prior blockquote format (`> **Subagent:** Run this step in a separate subagent.`) SHALL NOT be used.

#### Scenario: directive uses bold mandatory phrasing
- **WHEN** the re-run guard step in `sai/instructions/implement.md` is read
- **THEN** it contains a bold `**MANDATORY:**` directive explicitly forbidding the main agent from reading `implementation.md` directly

#### Scenario: subagent prompt is self-contained
- **WHEN** the re-run guard step is read
- **THEN** it contains a numbered prompt listing all steps the subagent must perform (read file, evaluate checkboxes, collapse fully-checked steps, write back, report)
- **THEN** no separate blockquote hint appears in place of this prompt

---

### Requirement: Subsequent implement steps SHALL be renumbered to follow the promoted Step 1

After the re-run guard occupies Step 1, the remaining steps in `sai/instructions/implement.md` SHALL be renumbered: old Step 1 (Parse Artifacts) becomes Step 2, old Step 2 (Validate ADR/DDR) becomes Step 3, old Step 3 (Read Required Documentation) becomes Step 4, old Step 4 (Generate Full Implementation) becomes Step 5.

#### Scenario: step headings are sequential after renumbering
- **WHEN** all `### Step N:` headings in `sai/instructions/implement.md` are listed
- **THEN** they appear as Step 1 through Step 5 with no gaps or duplicate numbers

---

### Requirement: The research-exception cross-reference SHALL point to Step 1, not Step 1b

The research-exception note in `sai/instructions/implement.md` (`## Required Documentation` step) SHALL reference "Step 1" when describing the re-run condition, replacing the prior "Step 1b" reference.

#### Scenario: cross-reference uses updated step name
- **WHEN** the `## Required Documentation` section of `sai/instructions/implement.md` is read
- **THEN** the re-run exception clause reads "If Step 1 detected an existing `implementation.md`" (not "Step 1b")

