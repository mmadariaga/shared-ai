# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>. TASK is not a template, it's a instruction set.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>

  ## Prerequisite checks
  Fetch @sai/instructions/prereqs.md

  ## Load instructions (in order)
  Fetch @sai/instructions/change-picker.md and follow it exactly.

  Fetch @sai/instructions/remember.md

  ## Run
  **User's request:** $ARGUMENTS

  `sai-status` is a **read-only** progress panel for one OpenSpec change. It creates, modifies, or deletes NOTHING — not under `openspec/changes/{name}/`, not `openspec/specs/`, not `.openspec.yaml`. It dispatches no `budget-explorer` / `budget-executor` subagent and accepts no `--fast-track` flag. Run entirely in the main session: at most one `openspec status` CLI call plus a handful of local file reads.

  After the change name is resolved (from `$ARGUMENTS`, or by `change-picker.md` when no name was given), render the panel with the algorithm below.

  ### Step A — Archive detection (before any CLI call)
  Glob `openspec/changes/archive/*-{name}/`. If a directory matches:
  - The change is ARCHIVED. Parse the leading `YYYY-MM-DD` from the directory name as the archive date.
  - Print the panel header, the archive path, the archive date, and a note that the change is closed.
  - Do NOT run `openspec status` (it exits 1 on a non-live name) and do NOT read or count `implementation.md` checkboxes.
  - Print NO `Next:` `/sai-N-...` command — an archived change is closed.
  - STOP here; the archived panel is complete.
  If no archive directory matches, continue to Step B for the live change.

  ### Step B — Artifact presence from the CLI
  Run `openspec status --change {name} --json` and parse the `artifacts[]` array. For each of the 10 sai-workflow schema artifacts — `proposal`, `specs`, `design`, `tasks`, `interfaces`, `implementation`, `review`, `security`, `performance`, `accessibility` — read its `status`: treat `done` as present, `ready` / `blocked` as absent. Do NOT re-derive presence from filesystem globs. `pr` is NOT one of the 10 and never gets a panel line.

  ### Step C — Fill the four gaps the CLI does not expose
  1. **Specs approval** — read `openspec/changes/{name}/.openspec.yaml`. If `approval.specs.approved_at` is present and non-empty, the specs are APPROVED (show the timestamp); otherwise NOT APPROVED. Never write this file.
  2. **Not-Applicable audits** — for each present audit artifact (`review`, `security`, `performance`, `accessibility`), read its body; if it contains a `## Not Applicable` heading (case-sensitive `## ` followed by the exact text `Not Applicable`), render it as present / `N/A`, mirroring `sai-archive`'s Classification Check.
  3. **Implementation progress** — if `implementation.md` exists, count `- [x]` (checked) over `- [x]` + `- [ ]` (total) task lines and show `checked/total`. If it does not exist, show the implementation phase with no count and do NOT error. This checked-vs-total count is the ONLY checkbox interpretation in the panel.
  4. **interfaces is EXEMPT** — never flag an absent `interfaces` as a problem or a missing-artifact warning (ADR 0023).

  ### Step D — Render the panel
  Print a compact panel: a header naming the change; one per-phase line for each of the 10 artifacts in the canonical order above (present / absent, and `N/A` for a Not-Applicable audit); the specs-approval line; the implementation `checked/total` count; and a `Next:` line.

  ### Step E — Next hint
  Resolve the FIRST matching row, top-to-bottom, and print it as the `Next:` line:
  - `specs` absent → `/sai-1-spec`
  - `specs` present, no `approval.specs.approved_at` → `/sai-2-design` (carries the specs approval gate)
  - approved, `design` or `tasks` absent → `/sai-2-design`
  - `design` + `tasks` present, `implementation` absent → `/sai-3-implement`
  - `implementation` present, not all task lines `- [x]` → `/sai-4-apply`
  - implementation complete, an audit missing (not present and not `## Not Applicable`) → `/sai-5-review` (then `/sai-6-security`, `/sai-7-performance`, `/sai-8-accessibility`)
  - audits satisfied → `/sai-pr` then `/sai-archive`
  `/sai-pr` MAY appear only as a `Next:` hint, never as a panel checkbox.
</TASK>

Follow instruction on <TASK> step by step
