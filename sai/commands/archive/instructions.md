> **Routed ownership.** This instruction is the technical pre-flight of the
> `sai-archive-worker` (`sai/commands/archive/worker.md` fetches and follows
> it). The ordinary route keeps every check below read-only. The explicit
> Direct Build (unattended) route uses the same pre-flight to prepare a closed mutation order;
> only its later `--direct-build-execute` continuation may execute that order.
> Transport mapping: where this file
> says **print**, the worker carries the exact text in its returned payload
> `summary` and the coordinator presents it verbatim; where it says **ask** or
> **offer**, the worker returns the question and ordered options as a
> `needs_input` result and the coordinator presents them through the native
> picker; where it conditions on an answer, the coordinator forwards the
> selected value through the binding continuation; and every mutation it
> references — the archive move, any delta-spec sync write, the conditional
> `retire_capabilities` declaration, and every git
> operation of the post-archive commit gate — executes coordinator-side per
> `sai/commands/archive/coordinator.md` on the ordinary route. In Direct Build (unattended)
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
     - This prompt is conversational in chat only: do NOT write any approval key to `.openspec.yaml` and do NOT introduce any new formal approval gate. The only `.openspec.yaml` key archive may ever write is `retire_capabilities`, under the conditions of "Capability-emptying delta retirement" below; approval keys and new formal gates stay prohibited. Only the unchecked-items rule changes; the Classification Check, missing-main-spec handling, and spec-sync behavior are untouched.
   - **If it does not exist**: skip this check entirely. Proceed without any warning about incomplete tasks.

## Missing main spec handling

When assessing delta spec sync state during the read-only pre-flight:
- If a delta spec capability has **no matching main spec** at `openspec/specs/<capability>/spec.md`, treat it as a new addition.
- Include it in the combined delta-sync summary as `[ADD] <capability>`.
- The CLI archive invocation handles new main spec creation; SAI reports it as informational context.

### Automatic spec synchronization via CLI

Delta-spec synchronization and the archive directory move are performed by a
single `openspec archive <name> --yes --json` invocation. The CLI's
deterministic pre-write validation is the scenario-preservation guarantee;
SAI does not duplicate it. In the ordinary route, the coordinator runs the
CLI after the gates resolve. In Direct Build (unattended) execution, the
worker runs the CLI as the first mutation step. When no delta specs exist,
the CLI archives the change without modifying main specs. This policy applies
regardless of fast-track state. All other archive gates (Classification
Check, unchecked-items, collision check) remain unchanged.

## Capability-emptying delta retirement

When assessing delta spec sync state during the read-only pre-flight:
- If a delta spec capability's `## REMOVED Requirements` section names every requirement currently published in `openspec/specs/<capability>/spec.md` with no `## ADDED Requirements` section for that same capability, this is a **capability-emptying delta**.
- Detection stays read-only and stays in the pre-flight, at the same point and by the same method as before. Only the outcome changes: a capability-emptying delta no longer blocks the archive. Archive declares the retirement and lets the CLI perform it.
- Declaring the retirement means writing the single key `retire_capabilities: true` into `openspec/changes/$ARGUMENTS/.openspec.yaml` before the `openspec archive <name> --yes --json` invocation. The CLI is the only component that deletes anything under `openspec/specs/**`; archive gains no move or delete power there.
- The written key is not transient: `.openspec.yaml` lives inside the change directory, so the CLI move carries the modified file with the change into `openspec/changes/archive/YYYY-MM-DD-{name}/`, where the declaration stays as the archived record of the retirement's intent.
- The write is conditional, narrow, and idempotent:
  - With no capability-emptying delta detected, `.openspec.yaml` is not touched at all.
  - When the key is already present with the boolean literal `true`, it is neither rewritten nor duplicated.
  - When the key is present with the boolean literal `false`, that is an explicit user veto: leave it untouched, write nothing, and let the CLI invocation proceed with the veto in force.
  - The key belongs to the change, not to a capability. A change that empties capability `A` while modifying capability `B` still receives one `retire_capabilities: true`; the CLI deletes only the spec left with no requirements.
- The retirement is silent: no new question, gate, or per-route branch is introduced. The ordinary route, the Direct Build (unattended) route, and `--fast-track` behave identically. The existing post-archive commit gate remains the human checkpoint, and the absence of a commit is what keeps the deletion recoverable.
- Silence is not opacity: the archive report names every retired capability so the later commit gate shows what was deleted.
- If `openspec archive` fails after the key was written, the key stays written in the working tree. Archive does not revert it.
- Archive does not validate cross-capability references after a retirement: a live capability citing the retired one is left dangling, and detecting that is out of scope here.
- `/sai-retire-docs` and `openspec/specs/_archived/` are untouched by this path and keep their own ownership. They own retirement that has no change behind it — docs, ADRs, and DDRs — and retire by moving to `openspec/specs/_archived/<capability>/` with a per-candidate confirmation gate; the two paths split by trigger, not by competition.
- `openspec validate <capability>` is still not evidence about this shape: `openspec validate <change>` checks delta well-formedness only, and `openspec validate <capability>` inspects the published spec. The pre-flight detects the delta shape directly, without duplicating the CLI's rebuilt-spec validation.

## Forward-only history guard

Archived history under `openspec/changes/archive/` is immutable. Never edit, rewrite, or delete a file under `openspec/changes/archive/` directly outside the authorized archive flow. A direct edit is blocked with: "Archived history is immutable: <path> is under `openspec/changes/archive/` and cannot be edited directly. Only `sai-archive` may create `archive/YYYY-MM-DD-{name}/` via `openspec archive <name> --yes --json`." Normal `sai-archive` creation of `archive/YYYY-MM-DD-{name}/` via that CLI primitive stays allowed and is not a violation. A test scan exclusion is scope only and never permission to edit: the `IMMUTABLE_HISTORY` exclusion does not authorize edits.

Direct writes to `openspec/specs/` without an active change are blocked. Without an active change (`openspec list --json` reports none), stop with: "No active change: direct writes to `openspec/specs/` are blocked. Run `/sai-1-spec` to create a change and use the proposal flow." Legitimate specs writes via the proposal flow (delta specs in `openspec/changes/{name}/specs/**` synced through `openspec archive`) stay allowed and are not a violation.
