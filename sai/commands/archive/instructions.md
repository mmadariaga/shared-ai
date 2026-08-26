> **Routed ownership.** This instruction is the technical pre-flight of the
> `sai-archive-worker` (`sai/commands/archive/worker.md` fetches and follows
> it). The ordinary route keeps every check below read-only. The explicit
> Build (unattended) route uses the same pre-flight to prepare a closed mutation order;
> only its later `--autofast-execute` continuation may execute that order.
> Transport mapping: where this file
> says **print**, the worker carries the exact text in its returned payload
> `summary` and the coordinator presents it verbatim; where it says **ask** or
> **offer**, the worker returns the question and ordered options as a
> `needs_input` result and the coordinator presents them through the native
> picker; where it conditions on an answer, the coordinator forwards the
> selected value through the binding continuation; and every mutation it
> references — the archive move, any delta-spec sync write, and every git
> operation of the post-archive commit gate — executes coordinator-side per
> `sai/commands/archive/coordinator.md` on the ordinary route. In Build (unattended)
> execution, the coordinator validates and authorizes the closed order before
> forwarding it to the same archive worker; no other worker mutation is
> allowed.

## Classification Check

Before running the archive skill, perform this check:

1. Run `openspec status --change "$ARGUMENTS" --json` to get the artifact completion status.
2. Read `openspec/changes/$ARGUMENTS/.openspec.yaml` and parse the `backfilled` field.
   - Treat `backfilled` as `true` **only** when the file exists, parses as valid YAML, and the key is present with the boolean literal value `true`.
   - Absent file, absent key, or any other value (including `false`, string `"true"`, `null`, etc.) → treat as `false`.
   - If the file exists but is corrupt / unparseable as YAML, treat as `false` and emit a single warning line, then continue — do NOT abort.
   - Log the resolved value as intermediate state (e.g. `[sai-archive] backfilled=<true|false>`).
3. From the `artifacts` array in the JSON, classify the eleven `sai-workflow` artifacts into three groups:
   - **CORE** (blocking): `proposal`, `specs`, `design`, `tasks`, `implementation`.
   - **AUDIT** (informational only): `review`, `security`, `performance`, `accessibility`, `change-overview`.
   - **EXEMPT** (non-blocking, silent when present or absent): `interfaces`.
   The `interfaces` artifact is never collected into the CORE not-`done` set or the AUDIT missing set under any input condition, and no diagnostic mentioning `interfaces` is emitted.
4. Evaluate CORE artifacts:
   - If `backfilled === true`, skip `design`, `tasks`, `implementation`, `interfaces`, and `change-overview` from the not-`done` collection. `proposal` and `specs` are scanned unconditionally.
   - For each remaining CORE artifact, if its `status` is not `done`, collect its `id`.
   - If any CORE artifact is not `done`, stop: return a terminal payload whose summary is the single error message: "Missing CORE artifact(s): <id1>, <id2>. Archive blocked." The archive does not proceed and no AUDIT soft warning is emitted.
5. Evaluate AUDIT artifacts (only when all CORE artifacts are `done`):
   - For each AUDIT artifact, if its `status` is not `done`, check whether the file `openspec/changes/$ARGUMENTS/<id>.md` exists and contains a markdown heading `## Not Applicable` (case-sensitive, leading `## ` followed by the exact text `Not Applicable`).
     - If the file exists and contains `## Not Applicable`, treat that artifact as present.
     - Otherwise, collect its `id`.
    - If one or more AUDIT artifacts are missing, carry exactly one informational line in the returned summary: `[sai-archive] informational: missing AUDIT artifact(s): <id1>, <id2>`.
6. Evaluate the `change-overview` AUDIT artifact (only when all CORE artifacts are `done`):
   - For a non-backfilled change, read `openspec/changes/$ARGUMENTS/.openspec.yaml` and parse the `overview.state` key (absent key → treat as `unmaterialized`). If `change-overview`'s CLI `status` is not `done` (missing or not-`done` file) OR `overview.state` is `stale`, `failed`, `materializing`, or `unmaterialized`/absent, collect `change-overview` into the missing-AUDIT set. A missing file warns even when the state reads `current`, because currentness is the conjunction of the state key and the file's presence; a file present with any non-`current` state warns for the same reason. `## Not Applicable` does not apply to `change-overview`.
   - For a backfilled change, `change-overview` is skipped entirely (treated as `done`), exactly like `interfaces` — no diagnostic mentioning `change-overview` is emitted.
   - If one or more AUDIT artifacts are missing (including `change-overview`), carry exactly one informational line in the returned summary: `[sai-archive] informational: missing AUDIT artifact(s): <id1>, <id2>`.
7. Overlay on the upstream `openspec-archive-change` skill (fetched and executed coordinator-side; this worker never executes it — relay the outcome through your returned findings):
   - If all CORE artifacts are `done` and only AUDIT artifacts are missing (or treated as present via `## Not Applicable`), the coordinator **skips step 2** of the upstream skill in favor of this Classification Check and continues at step 3.
   - Otherwise, the upstream skill's own completion handling applies.

## Completion Check

Before running the archive skill, perform this check:

1. Check if openspec/changes/$ARGUMENTS/implementation.md exists.
   - **If it exists**: search it for unchecked items (`- [ ]`). If one or more are found, this is a **soft confirmation gate**, not a hard stop:
     - List every unchecked item concretely — for each, carry its location as `implementation.md:{line}`, the `#### Step N` heading it falls under, and the checkbox's own text in the returned summary and alongside the ask.
     - **If fast-track is active** (`sai-archive --fast-track`; opt-out set per `openspec/specs/sai-fast-track-flag/spec.md`): auto-proceed as if the user answered `yes`. Do NOT return the question below; continue toward the coordinator-owned archive move; write no approval key to `.openspec.yaml`; skip the remaining bullets of this gate.
      - Return the ask as a `needs_input` result: `Continue archiving with N unchecked items?` with options `yes (Recommended)` / `no` (per the "Closed-choice prompts" rule in `remember.md`, which gives the per-harness option-picker mapping), where `N` is the count of unchecked items.
     - The archive move executes coordinator-side ONLY after an explicit `yes` is forwarded. On `no`, on silence, or on any answer other than `yes`, the archive move does not happen and the returned summary reports that archiving was not performed, citing the unchecked items.
     - This prompt is conversational in chat only: do NOT write any approval key to `.openspec.yaml` and do NOT introduce any new formal approval gate. Only the unchecked-items rule changes; the Classification Check, missing-main-spec handling, and spec-sync behavior are untouched.
   - **If it does not exist**: skip this check entirely. Proceed without any warning about incomplete tasks.

## Missing main spec handling (applies to step 4 of the archive skill)

When assessing delta spec sync state:
- If a delta spec capability has **no matching main spec** at `openspec/specs/<capability>/spec.md`, treat it as a new addition.
- Include it in the combined summary as `[ADD] <capability>`.
- The "changes needed" branch applies: return a `needs_input` result offering "Sync now (recommended — creates new main spec)" and "Archive without syncing".

### Fast-track sync-gate handling (step 4 of the archive skill)

When fast-track is active (`sai-archive --fast-track`; opt-out set per `openspec/specs/sai-fast-track-flag/spec.md`), the delta-spec sync gate auto-proceeds instead of prompting:
- **Changes-needed path** (options "Sync now (recommended — creates new main spec)" / "Archive without syncing"): auto-select **Sync now** — never **Archive without syncing** — if and only if the change is low-risk-by-construction: EITHER `openspec/changes/$ARGUMENTS/implementation.md` exists AND contains at least one `- [x]`, OR the Classification Check resolved `backfilled=true` (reuse that value; do not re-read `.openspec.yaml`). When neither disjunct holds, return the gate as a `needs_input` result with its usual options.
- **Already-synced path** (options "Archive now" / "Sync anyway" / "Cancel"): auto-select **Archive now** unconditionally — it is a no-op, nothing to sync.
- Detect applied state by a single read of `implementation.md` for a `- [x]` — no git-log traversal.
- Every other gate stays in force: the CORE-missing hard stop, the AUDIT informational line, all safe-operations confirmations, the pre-existence check, and the opencode change-name resolution.

### Automatic spec synchronization

When delta specs exist, always select the sync path and continue through the
inline `openspec-sync-specs` workflow; do not present a synchronization choice
to the user. In the ordinary route, the coordinator performs that sync after
the worker's gate result. In Build (unattended) preparation, record the same selected
sync as a pending action and let the coordinator validate it before the worker's
explicit execute continuation performs it. When the delta specs are
already synchronized, select the archive path directly. Verify the resulting main
specs before moving the change. This policy applies regardless of fast-track
state and supersedes the upstream skill's `Sync now` / `Archive without
syncing` and `Archive now` / `Sync anyway` prompts. All other archive gates
remain unchanged.
