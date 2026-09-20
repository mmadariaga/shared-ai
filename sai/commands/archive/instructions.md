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
- **Declaration preconditions.** Archive declares only when the declaration can succeed. Once a capability-emptying delta is detected, check each condition below, read-only, before writing anything. If any of them blocks, this is a **declaration refusal**: archive writes nothing, runs no CLI archive, and reports the blocking condition together with the way forward. A refusal is a stop, not a question — no route gains a prompt, and `--fast-track` and the Direct Build (unattended) route behave exactly like the ordinary route.
  - **Author veto.** When `retire_capabilities` is already present and its parsed value is `false`, the author has explicitly vetoed the retirement. Refuse to declare and report that the author vetoed it, naming both ways forward: remove the `retire_capabilities: false` entry from `openspec/changes/$ARGUMENTS/.openspec.yaml` so the retirement can be declared, or reshape the delta so it does not empty the capability. Do not skip the veto and run the CLI anyway: the CLI cannot tell `retire_capabilities: false` from an absent key, so an archive attempted under the veto fails with `archive_spec_validation_failed` on every rerun and the author never gets an exit.
  - **Unhonoured value.** When `retire_capabilities` is already present and its parsed value is not a boolean — a string such as `"yes"` or `"no"`, `null`, a number — refuse to declare. Name the file, the key, and its current value, and state the way forward: set `retire_capabilities` to `true` to declare the retirement, to `false` to veto it, or remove the key. Archive never guesses which boolean an unhonoured value meant, and never overwrites it: the CLI does not honour such a value, the author's intent behind it is unknowable here, and guessing `true` would delete a published spec on the strength of a guess — including unattended under `--fast-track` and Direct Build.
  - **Unaccounted content.** For each capability the delta empties, read its published spec at `openspec/specs/<capability>/spec.md` and look for **unaccounted content**: any `##` section other than `## Purpose` above the spec's requirements. The CLI's merge cannot attribute that content to any requirement, so it refuses a declared retirement that would delete it. When any emptied capability carries unaccounted content, refuse to declare, naming the capability and each offending section heading, and state the way forward: move that content out of the spec, then rerun `sai-archive`.
  - **Metadata precondition.** The declaration is written only into an `openspec/changes/$ARGUMENTS/.openspec.yaml` that already exists, parses as valid YAML, and carries a `schema:` key. A missing file, an unparseable file, or a file without `schema:` is a refusal naming the file and the missing or broken key. Archive NEVER creates `.openspec.yaml` and NEVER authors a `schema:` value: a metadata file carrying only the retirement marker has no schema for the CLI to resolve, which makes the change unreadable to `openspec status` — the first step of archive's own pre-flight — and makes the marker itself unhonoured.
  - **All or nothing.** When a change empties several capabilities and any one of them is blocked, the whole declaration is refused. Archive never declares partially and never retires the unblocked subset.
- The write is conditional, narrow, and idempotent:
  - With no capability-emptying delta detected, none of these checks run and `.openspec.yaml` is not touched at all.
  - Idempotence and veto are judged on the **parsed YAML value** of `retire_capabilities`, never on the literal text of the line. A parsed value of `true` (however it was written — `true`, `True`, or any spelling the YAML parser turns into the boolean) is already a declaration: it is neither rewritten nor duplicated. A parsed value of `false` is the explicit user veto above, and a parsed value that is not a boolean is the unhonoured-value refusal above. Every present-key case is therefore resolved before the write — `true` skips, `false` vetoes, anything else refuses — so the write only ever inserts an absent key. The replace-in-place rule below still governs how any write to a present key is performed, so a duplicate entry stays impossible.
  - The write is a **parse-verified replace-in-place**, never an append. When `retire_capabilities` is already present, replace that entry's value in place; when it is absent, insert the single key once. Never append a second `retire_capabilities` entry: a duplicate key makes the file invalid YAML for every CLI surface, and the value the CLI honours is the parsed one, not the last line written. Preserve every other key and the file's existing formatting, and write no other key and no approval key.
  - After writing, re-parse `openspec/changes/$ARGUMENTS/.openspec.yaml`. If it no longer parses as valid YAML, or `retire_capabilities` does not read back as the boolean `true`, report that and do NOT invoke the CLI archive. This is the one stop archive itself caused — the file parsed before archive wrote to it — so the report SHALL say so and name the way forward: archive does not revert the write, and the file must be restored before `sai-archive` is rerun, with `git checkout HEAD -- openspec/changes/$ARGUMENTS/.openspec.yaml` when the file is tracked, or by hand when it is not. Until it is restored the change is unreadable to `openspec status`, so a rerun fails at the pre-flight rather than at the declaration.
  - The key belongs to the change, not to a capability. A change that empties capability `A` while modifying capability `B` still receives one `retire_capabilities: true`; the CLI deletes only the spec left with no requirements.
- The retirement is silent: no new question, gate, or per-route branch is introduced. The ordinary route, the Direct Build (unattended) route, and `--fast-track` behave identically. The human decision is upstream and already made: it is the capability-emptying delta the author wrote into the change, not any downstream approval. Archive only carries that delta out. Do not rely on the post-archive commit gate as the checkpoint — `--fast-track` suppresses that selector and the Direct Build (unattended) route commits unattended, so on both routes the published spec is deleted and committed within a single invocation with nobody watching. Recovery is through git on every route, and `retire_capabilities: true` travels with the change into `openspec/changes/archive/YYYY-MM-DD-{name}/.openspec.yaml` as the durable record that the retirement was declared.
- Silence is not opacity: whenever one or more capabilities were retired, the visible archive output names every retired capability id. The line is emitted identically on the ordinary route, under `--fast-track`, and under Direct Build (unattended) — an identical report on all three routes is not a per-route branch. It is conditioned solely on a retirement having occurred: when the archive retires nothing, which is the ordinary case, no such line is emitted at all. When several capabilities are retired, every id is named, not only the first.
- The disclosure is pure output. It carries no options, accepts no answer, waits for nothing, and cannot block or fail the invocation; it informs and promises no reversal. On the ordinary route the disclosure comes first: it names what the CLI is about to delete, before `openspec archive <name> --yes --json` runs. The post-archive commit gate comes last, and by the time it is reached the CLI has already deleted the published spec on disk — so declining the commit there does not undo the retirement, it only leaves the deletion uncommitted in the working tree.
- If `openspec archive` fails after the key was written, the key stays written in the working tree. Archive does not revert it.
- Archive does not validate cross-capability references after a retirement: a live capability citing the retired one is left dangling, and detecting that is out of scope here.
- `/sai-retire-docs` and `openspec/specs/_archived/` are untouched by this path and keep their own ownership. They own retirement that has no change behind it — docs, ADRs, and DDRs — and retire by moving to `openspec/specs/_archived/<capability>/` with a per-candidate confirmation gate; the two paths split by trigger, not by competition.
- `openspec validate <capability>` is still not evidence about this shape: `openspec validate <change>` checks delta well-formedness only, and `openspec validate <capability>` inspects the published spec. The pre-flight detects the delta shape directly, without duplicating the CLI's rebuilt-spec validation.

## Forward-only history guard

Archived history under `openspec/changes/archive/` is immutable. Never edit, rewrite, or delete a file under `openspec/changes/archive/` directly outside the authorized archive flow. A direct edit is blocked with: "Archived history is immutable: <path> is under `openspec/changes/archive/` and cannot be edited directly. Only `sai-archive` may create `archive/YYYY-MM-DD-{name}/` via `openspec archive <name> --yes --json`." Normal `sai-archive` creation of `archive/YYYY-MM-DD-{name}/` via that CLI primitive stays allowed and is not a violation. A test scan exclusion is scope only and never permission to edit: the `IMMUTABLE_HISTORY` exclusion does not authorize edits.

Direct writes to `openspec/specs/` without an active change are blocked. Without an active change (`openspec list --json` reports none), stop with: "No active change: direct writes to `openspec/specs/` are blocked. Run `/sai-1-spec` to create a change and use the proposal flow." Legitimate specs writes via the proposal flow (delta specs in `openspec/changes/{name}/specs/**` synced through `openspec archive`) stay allowed and are not a violation.
