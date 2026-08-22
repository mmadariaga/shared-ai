# Backfill Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @skills/budget/SKILL.md and use it
Fetch @sai/commands/backfill/instructions.md and follow those instructions exactly.
Fetch @sai/policies/remember.md

## Invocation Envelope

The worker receives exactly one opaque string: `arguments_value`; binding
metadata remains outside the worker request. Do not scan parent conversation
history. Throughout `@sai/commands/backfill/instructions.md`, `$ARGUMENTS`
denotes the received `arguments_value`.

There is no coordinator-side change resolution in this phase: the change name
is derived and confirmed inside the technical flow itself (instruction
Phase 5). Payloads are therefore pre-resolution shapes — they omit
`resolved_change_name` — until the user confirms the derived name, after which
every subsequent result carries it.

The envelope parse belongs HERE, in this worker session: per the
instruction's Envelope Tokens section, scan the received `arguments_value`
for `--fast-track` and the diff-source tokens (`--staged`, `--unstaged`,
`--diff` with its SHA value), strip every recognized token, and read the
trimmed remainder as the request body the instruction reads as
`$ARGUMENTS`. `fast_track_active` is worker-derived session state; no
wrapper and no coordinator splits this envelope on the command's behalf.

## Lifecycle

This phase declares NO progress plan: emit no progress events, no notice, and
no handshake event. Every run closes with exactly one terminal lifecycle
status — `completed`, `needs_input`, or `failed`/`cancelled` — in the closed
worker-core shapes, each carrying the mandatory worker-authored `emitted_on`,
a concrete English `summary`, and an ordered duplicate-free `changed_files`.

An unattended envelope — a detected crystallized block, a parsed diff-source
token, and every consumed field derivable — closes with zero `needs_input`
results; any datum that cannot be resolved restores exactly that ask's
channel in the Asks section below. `fast_track_active` never suppresses an
input question: with no diff-source token present, the diff-source ask fires
normally.

## Read-only technical procedure

Perform the whole technical flow of
`sai/commands/backfill/instructions.md` up to artifact composition: the STOP
condition check, the worker-side envelope-token parse (including
`fast_track_active`), diff-source selection, diff computation (`git diff`,
`git diff --staged`, `git diff HEAD`, `git ls-files --others
--exclude-standard` — read-only git surface only) and its summary,
crystallized-block intake replacing optional intent capture when the pinned
labels are present, in-memory intent reconciliation and item classification,
the fixed and adaptive interview, generated reconciliation questions, the
scope-drift report, and conflict detection. Everything is read-only: checks,
diffs, reads, scans, and in-memory records — never mutations.

## Delegated scanning

The `@skills/budget/SKILL.md` load lives HERE, in this worker session. Per
instruction Phase 4, delegate spec scanning to a **`budget-explorer`**
subagent (lookup task, ≤10 tool calls) using the exact prompts the
instruction fixes verbatim — the diff-only prompt unchanged when there is no
usable intent context, and the same prompt plus the enriched in-conversation
intent block when usable intent exists — keeping each prompt's declared
output contract exactly: only overlapping specs, exactly `path`,
`what_would_change` (≤30 words), and `why` (≤20 words), no prose, no raw file
contents. Never pass a non-usable candidate as synthetic intent context.

## Asks

Return every user-facing decision of the instruction as a `needs_input`
lifecycle result — one question at a time, in the instruction's order,
complying with the five-element anatomy of `@sai/policies/question-context.md`.
Question strings render in the user's language under `@sai/policies/remember.md`.
The ask is a returned result, never an inline picker call from this session;
presentation mechanics belong to the coordinator.

- **Closed-choice asks** return the ordered options exactly: the diff-source
  selection **"Which diff should I analyze?"** with its three options and the
  plain-text fallback block preserved verbatim for picker-less surfaces —
  returned whenever the envelope carried no diff-source token, including
  every `fast_track_active` run, because the flag never suppresses an input
  question; the
  intent-capture choice with options `Provide intent (Recommended)` /
  `Continue without intent` under the canonical prompt string and the
  harness-provided free-text slot as the only paste channel, resolving
  selections exactly as the instruction's precedence rules define — not
  returned when a crystallized block supplies structured intent; the
  conflict decision **"Do you want to proceed with these updates, or abort?"**
  with options `proceed (Recommended)` / `abort` — not returned under
  `fast_track_active`, where the verbatim conflict report is carried in your
  payload content and the run proceeds automatically; the change-name proposal
  "I'll use `{proposed-name}` as the change name. Is that correct? (yes/no)"
  with `yes` / `no` — returned for block-supplied and derived names in manual
  mode, never under `fast_track_active`, which accepts a block-supplied
  `**Change name**` directly. Carry the essential state context alongside each ask —
  the brief diff summary with the `Diff loaded. Proceeding to interview.`
  confirmation, the verbatim conflict-report block, or the proposed name.
- **Open-ended and free-text asks** return an empty `options` array: the
  base-commit request "Provide the base commit SHA:" (never when `--diff`
  supplied the SHA), Question 1 ("What
  problem does this solve?") and Question 2 ("What are the known limitations or
  technical debt left behind?") each returned only when their Phase 2
  three-step resolution left them unanswered, every generated reconciliation
  question, and
  the single clean follow-up `Share your statement of intent below.` The
  coordinator renders each exactly once as ordinary conversation text per the
  instruction's Delivery rule and forwards your full response.

Preserve the instruction's stop texts exactly: with `$ARGUMENTS` empty and no
derivable name, or when no name can be derived at Phase 5, return a terminal
payload whose summary is exactly **"Change name required. Run:
/sai-backfill <name>"** and close the run; on a forwarded `abort`, return a
terminal payload whose summary is exactly **"Backfill aborted. No files
written."**; on the `--staged` path with an empty staging area, return a
terminal payload whose summary is exactly **"Staged diff is empty — stage the
implementation before invoking backfill."** Carry the scope-drift lines, the
conflict report, and the
`No spec conflicts detected. Proceeding.` continuation line verbatim inside
your summaries so the coordinator can present them unaltered.

## Draft composition

Where the instruction's Phase 6 says create or write, read compose-draft-and-
return: assemble the draft `.openspec.yaml` (the exact no-intent three-key
form or usable-intent four-key form with date-only `created`), the draft
`proposal.md` (opening with the exact applicable POST-HOC RECORD blockquote,
the six required headings in order, concrete Impact entries ending with the
Out-of-scope line), and every draft capability spec (sai-workflow delta
format, concrete `### Requirement:` headings with SHALL/MUST language, at
least one `#### Scenario:` block with exactly one `- **WHEN**` and one
`- **THEN**` line) from the selected diff, fixed answers,
evidence-backed reconciliation results, qualifying preservation
confirmations, and scope-drift reports. Return ALL draft CONTENT as payload
text inside your terminal `completed` payload together with the confirmed
change name — the coordinator validates it against the sai-workflow schema
and performs the final writes. Never print drafts as your deliverable and
never write them to any file.

## Absolute mutation prohibition

NEVER write any file — no artifact, no draft on disk, no `.openspec.yaml`
key, nothing outside reporting duties. NEVER run a state-changing git
command: the read-only diff surface above stays unchanged. Schema validation
and every final write into `openspec/changes/{name}/` belong exclusively to
the coordinator.
