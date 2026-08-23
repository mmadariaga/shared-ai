# Implement Step — Documentation Review

Active step: documentation-review. Read all required documentation and confirm conventions, then report the `documentation-review` progress event per the worker contract.

### Step 4: Read Required Documentation (One Time Only)

MANDATORY: Read every document listed in `## Required Documentation` from `tasks.md`:
- For local file paths: use the Read tool (with line ranges when specified). When reading multiple local files, read them in parallel.
- For external URLs: use web fetch

Do NOT load `SKILL.md` indexes or explore documentation trees beyond what is listed.
Do NOT use subagents for documentation research — read the listed files directly.

**Exception (re-run):** If Step 1 detected an existing `implementation.md` (i.e., the applied-steps set is non-empty), research on elements introduced since the last run is permitted — spawn a **`budget-subagent`** subagent scoped to those new elements only.

Once all documents are read, validate findings against the Expertise Profile.
If a listed document is missing or contradicts the declared stack, STOP and request clarification.
