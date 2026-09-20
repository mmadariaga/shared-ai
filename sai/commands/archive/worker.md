# Archive Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/commands/archive/instructions.md and follow those instructions exactly.
Fetch @skills/safe-operations/SKILL.md and use it for every Direct Build (unattended) mutation.
Fetch @sai/policies/commit-rules.md and follow it for the Direct Build (unattended) commit.

## Invocation Envelope

The worker receives exactly one opaque string: `arguments_value`; binding
metadata remains outside the worker request. Under strict-zero two-phase
startup the initial dispatch carries only the ready prompt plus base
instructions with no task content; `arguments_value` arrives only in the
post-ready same-worker continuation after `event: ready`. Do not scan parent conversation
history. Change resolution has already happened coordinator-side through the
shared change-picker before this dispatch, so every payload carries
`resolved_change_name`. Throughout `@sai/commands/archive/instructions.md`,
`$ARGUMENTS` denotes the received `arguments_value`.

The Direct Build (unattended) composition may prefix its initial envelope with
`--direct-build-prepare` on its own line, followed by the already resolved change
name. Strip that marker and retain `direct_build_mode: prepare` as
invocation-scoped worker state. An `--direct-build-execute` marker is valid only on
the explicit same-worker continuation described below and is never accepted as
an initial dispatch. A normal archive dispatch has no marker and retains its
existing envelope shape.

The coordinator declares `fast_track_active` alongside the envelope as session
state. Honor it only in the fast-track branches documented below and in the
instruction's own fast-track bullets; it never suppresses the CORE-missing hard
stop, the AUDIT informational line, or the collision check.

In Direct Build (unattended) prepare mode, `fast_track_active` still controls only the existing
documented gate branches. The worker completes the full read-only pre-flight
and returns a closed mutation plan; it never treats a prepared plan or an
auto-proceeded gate as authorization to mutate.

## Lifecycle

This phase declares NO progress plan: emit no progress events and no notice.
Every stretch opens with `event: ready` as its first nonterminal return before
any expensive work; the task arrives only in the post-ready same-worker
continuation. Every run closes with exactly one terminal lifecycle
status — `completed`, `needs_input`, or `failed`/`cancelled` — in the closed
worker-core shapes, each carrying a concrete English `summary`, an ordered duplicate-free `changed_files`, and
`resolved_change_name`. Worker payloads carry no time field; the validator emits the `validated_at` sidecar.

## Read-only technical procedure

Perform the whole read-only pre-flight of
`sai/commands/archive/instructions.md`: the Classification Check (`openspec
status --change "$ARGUMENTS" --json`, the `.openspec.yaml` `backfilled`
resolution rules, the CORE/AUDIT/EXEMPT grouping with its skip rules), the
Completion Check scan (enumerate every `- [ ]` in
`implementation.md` with its `implementation.md:{line}` location, enclosing
`#### Step N` heading, and checkbox text), the missing-main-spec delta
assessment (diff every delta spec against its main spec, classify
`[ADD]` additions, build the combined summary), the capability-emptying delta
assessment (detect when a delta spec capability's `## REMOVED Requirements`
names every requirement currently published in `openspec/specs/<capability>/spec.md`
with no `## ADDED Requirements` for that same capability), and the target-name
collision check against `openspec/changes/archive/YYYY-MM-DD-{name}/`. Everything
is read-only: these are checks, scans, and diffs — never mutations.

All findings return as payload content: carry the informational AUDIT line,
the unchecked-item list, the combined delta-sync summary, and the collision
verdict inside your summaries so the coordinator can present them verbatim.
Never print them as your deliverable and never write them to any file.

Preserve the instruction's stop texts exactly: when any CORE artifact is not
`done`, return a terminal payload whose summary is exactly
**"Missing CORE artifact(s): <id1>, <id2>. Archive blocked."** (substituting
the collected ids) and close the run; no AUDIT soft warning accompanies it.

When the capability-emptying delta assessment detects a delta spec capability
whose `## REMOVED Requirements` names every requirement currently published in
`openspec/specs/<capability>/spec.md` with no `## ADDED Requirements` for that
same capability, the archive is NOT blocked. Record the detected capability
names as invocation-scoped `retired_capabilities` state and carry them in your
terminal summary, naming each one, so the coordinator and the later commit gate
show what the CLI will delete. Declaring the retirement is the single
`retire_capabilities: true` key described in
`@sai/commands/archive/instructions.md`; it is written immediately before the
`openspec archive <name> --yes --json` invocation by whoever runs that
invocation — the coordinator on the ordinary route, this worker in the
Direct Build (unattended) execute continuation. Add no question, gate, or
per-route branch for it, and never move or delete anything under
`openspec/specs/**` yourself.

Whenever `retired_capabilities` is non-empty, extend the same read-only
pre-flight with the declaration preconditions of
`@sai/commands/archive/instructions.md` and record their outcome as
invocation-scoped state alongside `retired_capabilities`: the author veto
(`retire_capabilities` already present with the parsed value `false`), the
unhonoured value (`retire_capabilities` already present with a parsed value
that is not a boolean — a string such as `"yes"` or `"no"`, `null`, a number),
the unaccounted content of each emptied capability's published spec at
`openspec/specs/<capability>/spec.md` (any `##` section other than
`## Purpose` above its requirements, recorded with the capability name and each
offending heading), and the metadata precondition
(`openspec/changes/<name>/.openspec.yaml` exists, parses as valid YAML, and
carries `schema:`). All three are reads: open no file for writing here.

Mirror the refusals rather than proceeding. When any recorded condition blocks —
including the all-or-nothing rule, where one blocked capability refuses the
whole declaration — close the run with a terminal payload whose summary names
the blocking condition, the capability or file it concerns, and the way forward
that instruction states, and reports that archiving was not performed. Carry
that instruction's remedies verbatim in meaning: for the author veto, remove the
`retire_capabilities: false` entry or reshape the delta so it does not empty the
capability; for an unhonoured value, set `retire_capabilities` to `true` to
declare the retirement, to `false` to veto it, or remove the key — archive never
guesses which boolean an unhonoured value meant and never overwrites it; for
unaccounted content, move that content out of the spec and rerun `sai-archive`.
Never skip a veto and let the CLI archive run anyway: the CLI cannot tell
`retire_capabilities: false` from an absent key, so the archive fails with
`archive_spec_validation_failed` on every rerun and the author never gets an
exit.
Return no
mutation plan and no prepared execution order in that closure, so no route can
treat a refused declaration as authorization. The refusal is a stop, not a
question: return no `needs_input` for it, and let `fast_track_active` and the
Direct Build (unattended) route behave exactly like the ordinary route.

## Pre-mutation gates

After a clean Classification Check, return the unchecked-items decision as a
`needs_input` lifecycle result, complying with the five-element anatomy of
`@sai/policies/question-context.md`. The ask is a returned result, never an
inline picker call from this session.

- **Unchecked-items gate** (only when `implementation.md` exists with one or
  more `- [ ]`): ask **"Continue archiving with N unchecked items?"** with
  ordered options `yes (Recommended)` / `no`, carrying the enumerated unchecked
  items as essential state context. When `fast_track_active` is true, do NOT
  return this ask: auto-proceed as if the user answered `yes`, write no
  approval key anywhere, and continue to the terminal result. When
  `implementation.md` does not exist, skip the gate entirely.

Delta-spec synchronization is handled by the CLI archive invocation
(`openspec archive <name> --yes --json`), which the coordinator runs on the
ordinary route and the worker runs on the Direct Build (unattended) execute
continuation. The CLI's deterministic pre-write validation is the scenario-
preservation guarantee; SAI does not duplicate it.

On a forwarded answer, process it without re-presenting the prompt and without
executing anything: on `no`, or any non-confirming answer, return a terminal
`completed` payload whose summary states that archiving was not
performed, citing the unchecked items or the cancellation. On a confirming
answer, close the run with a terminal `completed` payload whose summary
restates the change name, schema, the pre-flight collision verdict, the
combined delta-sync summary (informational), every capability named in
`retired_capabilities` (or nothing when that set is empty), and any carried
warnings — so the
coordinator can present it verbatim before running the CLI archive on the
ordinary route, or use it as the validated plan for the Direct Build (unattended)
execute continuation.

## Direct Build (unattended) execution continuation

After Direct Build (unattended) preparation, the coordinator validates the returned
classification, gate outcomes, collision verdict, archive destination, owned
staging set, and commit authorization. It then continues the same worker with
one opaque payload whose first line is exactly `--direct-build-execute`. The
remaining content is a closed execution order; it is the only authority for
mutation and may contain only the resolved change name, the conditional
`retire_capabilities` retirement declaration with the capabilities it retires,
the exact date-prefixed archive destination, the exact owned staging paths, and
the one pre-authorized local commit action. The retirement declaration is a
named member of this enumeration, so an order carrying it is not an altered
order: validate step 0 as authorized content rather than rejecting the order or
writing without authorization.

Before acting, the worker validates that the order is complete, duplicate-free,
consistent with its prepared plan, inside the allowed `openspec/` and
implementer-owned path sets, and still pending. A path in the implementer-owned
set may be absent when the prepared diff records its deletion; such a path is
staged with the deletion-aware equivalent of `git add`, not treated as a
missing-path contract error. It rejects a missing non-deletion path, reordered,
foreign, already-executed, or otherwise altered order with a closed `failed`
result and executes nothing for that continuation.

The worker holds no Write or Edit tool. Every mutation in this continuation —
the CLI archive invocation, exact-path staging, and the HEREDOC commit — is
performed through the **Bash tool**, which the binding already grants this
worker. Bash is the write vehicle: the CLI invocation and every git operation
run as shell commands. Never attempt a Write or Edit tool call in this
continuation; if Bash is unavailable, return a closed `failed` result rather
than simulating a write through another channel. The worker then performs
exactly this order and nothing else:

0. Retirement declaration, only when the prepared plan recorded one or more
   `retired_capabilities`: through the Bash tool, write the single key
   `retire_capabilities: true` into `openspec/changes/<name>/.openspec.yaml`
   under the conditions of `@sai/commands/archive/instructions.md`.
   Re-check that instruction's declaration preconditions against the current
   files first — the author veto, an unhonoured value (a present
   `retire_capabilities` whose parsed value is not a boolean), unaccounted
   content in each emptied capability's published spec, and the metadata
   precondition that
   `.openspec.yaml` exists, parses, and carries `schema:`. If any of them
   blocks now, write nothing, do not run step 1, and return a closed `failed`
   result naming the blocking condition and its way forward; never create
   `.openspec.yaml` and never author a `schema:` value. Otherwise perform the
   parse-verified replace-in-place write: skip the write entirely when the
   parsed value of `retire_capabilities` is already the boolean `true`, insert
   the single key once when it is absent, replace an existing entry's value in
   place rather than adding a line whenever a present key is written at all,
   and never append a second `retire_capabilities` entry. Judge the skip, the
   veto, and the unhonoured value on the parsed
   YAML value, not the literal text. Preserve every other key and the file's
   existing formatting; write no other key and no approval key. Re-parse the
   file after writing: if it no longer parses as valid YAML, or
   `retire_capabilities` does not read back as the boolean `true`, return a
   closed `failed` result with that evidence and do not run step 1. This is the
   one stop archive itself caused — the file parsed before archive wrote to it
   — so say so in the result and name the way forward: archive does not revert
   the write, and the file must be restored before `sai-archive` is rerun, with
   `git checkout HEAD -- openspec/changes/<name>/.openspec.yaml` when the file
   is tracked, or by hand when it is not. Report that command as the user's
   remedy; never run it or any other git command in this step. Until the file
   is restored the change is unreadable to `openspec status`, so a rerun fails
   at the pre-flight rather than at the declaration. Add the
   file to `changed_files` when it was written. With no recorded
   `retired_capabilities`, do not touch `.openspec.yaml` at all. If step 1 then
   fails, leave the written key in place — never revert it. This step adds no
   gate and no question.
1. Run `openspec archive <name> --yes --json` as the sole sync + move
   primitive. The CLI validates scenario preservation before writing and
   couples delta-spec synchronization with the archive directory move in one
   deterministic operation. Parse the JSON result: on success, the sync and
   move are complete; on failure or invalid JSON, return a closed `failed`
   result with the exact error and stop without staging or commit. There is
   no manual sync or move fallback and no retry.
2. Classify every supplied approved path before staging, completing the whole
   classification pass before running any staging command, then stage only the
   eligible subset. Determine trackedness with the existing deletion-aware
   check: a successful `git ls-files --error-unmatch -- <path>` lookup is
   tracked, including a tracked deletion; its exit-1 no-match result is
   untracked and any other error is terminal. For an untracked path only, run
   `git check-ignore --quiet -- <path>`: exit 0 means that the path is
   intentionally ignored, so omit it and append
   `[sai-archive] warning: omitted ignored untracked path: <path>` to the
   worker-authored `summary`; exit 1 means it is eligible and any other error
   is terminal. An ignored path is never force-added. Treat tracked paths,
   tracked deletions, and untracked non-ignored paths as eligible, and stage
   every eligible path with the existing exact allowlist and deletion-aware
   behavior. Any classification or staging error other than the explicit
   untracked-and-ignored match remains terminal: preserve the exact completed
   state, do not retry, and do not continue to message authoring or commit even
   if an earlier eligible path was staged. Never use `git add -A`, `git add .`,
   `git add -f`, or stage an unrelated dirty path.
3. Commit only when at least one eligible approved path remains in the index
   and the existing empty-index guard passes. If all approved paths were
   omitted as untracked ignored paths, preserve that guard's no-commit result
   (`[sai-archive] no commit: staging left the index empty`), retain the
   warnings, and do not author a message or create a commit. Otherwise, apply
   the commit-message rules to the staged state only, then execute one local
   HEREDOC-form new commit under the already-consumed Direct Build (unattended)
   commit authorization. When the prepared plan recorded one or more
   `retired_capabilities` and a commit is actually created, the authored message
   names every retired capability id on its own line in the message **body**,
   never in the subject: the subject stays exactly what the commit-message rules
   derive from the staged state, so the Conventional Commits format is unchanged.
   The two conditions are independent — a retirement with no commit (the
   empty-index guard above, or any earlier terminal stop) produces no body line,
   and a commit with no retirement produces none either. This adds no extra
   commit and no second write: never amend, push, force-push, or ask for a second
   commit.

Whenever the prepared plan recorded one or more `retired_capabilities`, the
terminal summary of this continuation names every retired capability id, exactly
as the prepare stretch's summary does, so the disclosure required by
`@sai/commands/archive/instructions.md` reaches the user identically on the
ordinary route, under `--fast-track`, and under Direct Build (unattended). It is
report text only: it carries no options, accepts no answer, and never blocks the
run. With an empty `retired_capabilities` set, no such line appears.

The worker records each realized path in the ordered duplicate-free
`changed_files` union. Obtain exact spec paths from the pre-flight inventory
because the CLI's `specsUpdated` is not a path list. A successful execution
marks the order consumed; any later execute continuation or replacement
reconstruction is rejected without another mutation. If the CLI invocation,
staging, message authoring, or commit fails after a partial mutation, return a
closed `failed` result with the exact completed state and failure class, set
`unrecoverable: true` only when the evidence establishes that continuation is
unsafe, and stop. Never silently retry, continue to another action, or commit
a partial plan.

## Absolute mutation prohibition outside Direct Build (unattended) execution

For the ordinary route and the prepare stretch, NEVER move directories. NEVER
write outside reporting duties — no main-spec sync writes, no `.openspec.yaml`
keys (the `retire_capabilities` declaration belongs to whoever runs the CLI
archive: the coordinator on the ordinary route, this worker only inside the
validated Direct Build (unattended) execution continuation), no artifact edits.
NEVER run git: no `git add`, no `git commit`, no
state-changing git command of any kind. The CLI archive invocation and git
operations remain coordinator-owned unless the worker is in the validated
Direct Build (unattended) execution continuation above.
