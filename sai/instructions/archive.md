## Classification Check

Before running the archive skill, perform this check:

1. Run `openspec status --change "$ARGUMENTS" --json` to get the artifact completion status.
2. Read `openspec/changes/$ARGUMENTS/.openspec.yaml` and parse the `backfilled` field.
   - Treat `backfilled` as `true` **only** when the file exists, parses as valid YAML, and the key is present with the boolean literal value `true`.
   - Absent file, absent key, or any other value (including `false`, string `"true"`, `null`, etc.) → treat as `false`.
   - If the file exists but is corrupt / unparseable as YAML, treat as `false` and emit a single warning line, then continue — do NOT abort.
   - Log the resolved value as intermediate state (e.g. `[sai-archive] backfilled=<true|false>`).
3. From the `artifacts` array in the JSON, classify the ten `sai-workflow` artifacts into three groups:
   - **CORE** (blocking): `proposal`, `specs`, `design`, `tasks`, `implementation`.
   - **AUDIT** (informational only): `review`, `security`, `performance`, `accessibility`.
   - **EXEMPT** (non-blocking, silent when present or absent): `interfaces`.
   The `interfaces` artifact is never collected into the CORE not-`done` set or the AUDIT missing set under any input condition, and no diagnostic mentioning `interfaces` is emitted.
4. Evaluate CORE artifacts:
   - If `backfilled === true`, skip `design`, `tasks`, `implementation`, and `interfaces` from the not-`done` collection. `proposal` and `specs` are scanned unconditionally.
   - For each remaining CORE artifact, if its `status` is not `done`, collect its `id`.
   - If any CORE artifact is not `done`, STOP and print a single error message: "Missing CORE artifact(s): <id1>, <id2>. Archive blocked." Do not proceed with the archive. Do not emit any AUDIT soft warning.
5. Evaluate AUDIT artifacts (only when all CORE artifacts are `done`):
   - For each AUDIT artifact, if its `status` is not `done`, check whether the file `openspec/changes/$ARGUMENTS/<id>.md` exists and contains a markdown heading `## Not Applicable` (case-sensitive, leading `## ` followed by the exact text `Not Applicable`).
     - If the file exists and contains `## Not Applicable`, treat that artifact as present.
     - Otherwise, collect its `id`.
   - If one or more AUDIT artifacts are missing, print exactly one informational line: `[sai-archive] informational: missing AUDIT artifact(s): <id1>, <id2>`.
6. When following the upstream `openspec-archive-change` skill:
   - If all CORE artifacts are `done` and only AUDIT artifacts are missing (or treated as present via `## Not Applicable`), **skip step 2** of the upstream skill and continue at step 3.
   - Otherwise, let the upstream skill run normally.

## Completion Check

Before running the archive skill, perform this check:

1. Check if openspec/changes/$ARGUMENTS/implementation.md exists.
   - **If it exists**: search it for unchecked items (`- [ ]`). If one or more are found, this is a **soft confirmation gate**, not a hard stop:
     - List every unchecked item concretely — for each, print its location as `implementation.md:{line}`, the `#### Step N` heading it falls under, and the checkbox's own text.
      - Ask as a closed-choice prompt: `Continue archiving with N unchecked items?` with options `yes (Recommended)` / `no` (per the "Closed-choice prompts" rule in `remember.md`, which gives the per-harness option-picker mapping), where `N` is the count of unchecked items.
     - Perform the archive move ONLY on an explicit `yes`. On `no`, on silence, or on any answer other than `yes`, do NOT perform the archive move and report that archiving was not performed, citing the unchecked items.
     - This prompt is conversational in chat only: do NOT write any approval key to `.openspec.yaml` and do NOT introduce any new formal approval gate. Only the unchecked-items rule changes; the Classification Check, missing-main-spec handling, and spec-sync behavior are untouched.
   - **If it does not exist**: skip this check entirely. Proceed without any warning about incomplete tasks.

## Missing main spec handling (applies to step 4 of the archive skill)

When assessing delta spec sync state:
- If a delta spec capability has **no matching main spec** at `openspec/specs/<capability>/spec.md`, treat it as a new addition.
- Include it in the combined summary as `[ADD] <capability>`.
- The "changes needed" branch applies: offer "Sync now (recommended — creates new main spec)" and "Archive without syncing".
