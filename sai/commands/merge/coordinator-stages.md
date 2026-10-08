# Merge coordinator stages

The coordinator's section library. `merge.js` serves one `## Stage:` section
when that stage starts (`mechanics.md` § Stage delivery); it is never fetched
whole. Steps 1–5 and 10 of the merge workflow live here; Steps 6–9 are the
worker's judgment stages in `instructions.md`.

Each operation runs after its lifecycle check and under safe-operations;
presentation-state updates follow the operation outcome.

## Stage: preflight

The stage facts are the `preflight` receipt. Use its `current_branch`,
`dirty`, `candidates`, `merge_in_progress`, and `rebase_in_progress`; list no
branches and re-run no status check yourself.

### Step 1: Guards

When `merge_in_progress` or `rebase_in_progress` is true, print the matching
pinned closing text from the preflight texts and close the run: no question,
no launch.

### Step 2: Batch 1

Build Batch 1 from the receipt and the preflight texts — `dirty` (only when
`dirty` is non-empty), `method` (not in fast-track), `branch` — and present it
in one trip through `render_gate`. In fast-track the method is `merge`.

Resolve the answers in this order. An abandoned batch closes nothing and
launches nothing.

1. **`dirty` is `no`** — ignore any branch text and close the run stating that
   no merge was performed, with no fetch, validation, or mutation.
2. **Classify the `branch` answer the picker returns**, in this order. A
   picker may return an option's label instead of its value: an answer
   equal to the exact value or the exact label of a listed candidate or of
   the sentinel option is that option's selection, mapped to its value
   before classification. Only an answer matching no option's value or
   label is picker free text.
   - an exact listed candidate value sets `branch_selection_source: listed`,
     including picker free text that exactly matches a listed value;
   - the branch-entry sentinel `sai:enter-branch` (a routing choice, never a
     Git ref) prints the seam's branch-entry prompt through
     `render_open_input`; record the typed answer in input history as
     `{id: branch-entry, question, options: [], answer_value}`;
   - any other non-empty answer is picker free text: the typed answer
     itself, with no second prompt; its Batch 1 history pair already
     records it, so add no `branch-entry` pair;
   - an empty or whitespace-only answer is not a branch: repeat the branch
     question, with no fetch.

   Both text paths set `branch_selection_source: free-text`. On the sentinel
   path the typed text wins even when it matches a listed candidate.
3. **Typed text** — the exact typed value is `branch_entry`. Validate the
   `branch-selection` → `branch-validation` transition before Step 3.

Choosing text entry pre-authorizes exactly one `git fetch --prune origin`
(Step 3), never an integration.

### Test command

Fix `test_command` here, once, before Step 3. Every verification round of
this run uses the value fixed here, whatever the integration later changes in
the documentation. Take the first source that names an explicit command:

1. `AGENTS.md` at the project root — use the copy in your context; read the
   file only when it is not there.
2. `README.md` at the project root — one read.
3. Neither — `test_command: list`. Capture the marker list's outcome now:

   ```text
   node <merge-tool> suite --record <unique-external-file> --json --cwd <project-root>
   ```

   Keep the returned `record` and `record_hash`. The outcome in that record —
   one command, or none with its reason — is the fixed value: a marker file
   the integration adds or removes later does not change it.

An explicit command is a test invocation written literally in the document,
such as `npm test` or `dotnet test src/App.sln`; copy it exactly. A command
you would have to infer is not explicit. A document that names several test
commands, none clearly the general one, names none: take the next source.

### Step 3: Branch validation and provenance

Derive `source_ref` yourself from the unmodified answer and pass it to git as
one literal argument:

- **Listed candidate** — `refs/heads/<value>`; do not fetch.
- **`branch_entry`** — the route is already in `branch-validation`. An
  entry beginning with the exact prefix `origin/` maps to
  `refs/remotes/origin/<remainder>`; every other entry maps to
  `refs/heads/<value>`. Run `git fetch --prune origin` first; if it fails,
  check nothing further.

Then run `merge.js provenance` with this exact `source_ref`:

```text
node <merge-tool> provenance --source-ref <full-ref> --method merge|rebase --squash yes|no|not-applicable --json --cwd <project-root>
```

That one call checks the ref format
(`git check-ref-format`), its existence (`git show-ref --verify --quiet`), and
its commit (`git rev-parse --verify <source_ref>^{commit}`), then captures the
merge provenance.

The ref is exactly this derived value: do not interpolate the user's text
into shell syntax, resolve arbitrary revisions, or create a local branch for
an `origin/<branch>` entry. If the fetch or the provenance call fails, close
the run with the branch-failure text; do not capture provenance or launch on
that path.

Keep the complete provenance receipt. It is immutable historical evidence:
forward it unchanged, never recapture its SHAs after launch.

### Step 4: Launch

Launch is the next operation after the provenance capture. When anything ran
between them, check the receipt with `merge.js valid` and recapture a stale
one before any squash mutation.

Validate the lifecycle transition to `merge-outcome`: from `branch-selection`
for a listed candidate (provenance captured, no fetch) or from
`branch-validation` for a free-text entry (fetch succeeded and the exact ref
resolves). Print the integration proposal from the preflight texts, call
`render_progress` to render the first TODO, and launch by method:

- `merge` — `git merge --no-ff --no-commit <source_ref>`;
- `rebase` — `git rebase <source_ref>`;
- `rebase-squash` — when `merge_base` differs from `target_sha`,
  `git reset --soft <merge_base>` then one `git commit` holding the
  squashed change, with its informative message (`merge_base..HEAD`) composed
  per `node <merge-tool> instructions --stage messages`; then
  `git rebase <source_ref>`.

### Step 5: Outcome

Record the outcome from the launch's exit status — `clean` or `conflicted`,
and for a rebase `stopped` or `finished` — and reconcile the TODO to the
actual route.

- **Conflicted** — enter the `conflicts` stage.
- **Clean** (a merge stopped before its commit, or a finished rebase) — enter
  the `collision` stage. A clean integration never enters `verify` and never
  asks for a language.

Exit: the run is closed, or the provenance receipt is retained and the launch
outcome is recorded.

## Stage: conflicts

Runs once per conflict stop: after a conflicted launch and after each
`git rebase --continue` that stops again. The stage facts are the `conflicts`
snapshot view: the affected files with their categories, region ids, and stage
blob OIDs, the `categories` counts, the operation state, and the exact record
reference/hash. Capture it before any worker write; it is the protected
pre-write content: the actual conflicted working file, including Git-combined
content, marker byte ranges, modes, and the unrelated-content inventory. A
missing stage is evidence of a structural conflict, not a collection success
for the missing side.

An empty inventory after a failed launch is a launch failure, not a conflict:
surface the git error and close the run with the exact repository state.

`working_language` starts unresolved; a clean run never asks for it.

### Conflict hand-off

On the run's first conflict stop, print one concise notice as ordinary text
(conflicts detected, the affected paths, the unresolved integration, and that
a working language is needed), with no semantic analysis. Then present Batch 2
in one trip through the active harness-native question mechanism
(`AskUserQuestion` on Claude Code, `question` on opencode):

- `language` — the canonical question **"Which language should I use for the
  conflict explanation and resolution strategy?"**, rendered in the ambient
  conversation language. Options are `English` and the current conversation
  language (once, when they coincide), plus the harness's free-text path when
  it has one. Labels may be localized; each value is the exact language
  token.

Store the language answer as invocation-scoped `working_language`, outside
`arguments_value`, artifacts, configuration, and worker payload
persistence.

On every later conflict stop, print the notice and keep the selected
`working_language`; the language question runs once per run.

### Strategy task

A conflict is a judgment point. Dispatch the worker when none is running
(`coordinator.md` § Judgment-point dispatch); otherwise continue the same
worker. Disclose `strategy` with the complete affected inventory, the snapshot
reference/hash, the provenance receipt, the method, and the working language.
The worker reads the conflicts through `merge.js bundle` on that reference.

- **Strategy presentation and application.** Follow `instructions.md` Step 7
  for the mode-specific hand-off. In normal mode the strategy arrives as a
  gate and the user's `apply-strategy` sets `strategy_status: confirmed`. For
  a fast-track strategy `completed` result, validate its completeness through
  the presentation seam, print the complete strategy, set
  `strategy_status: confirmed`, then continue the same worker, unprompted,
  with an instruction to apply that presented strategy under invocation
  authority. Repeat for every new conflict or strategy revision, including later rebase
  stops. This strategy-only result is not terminal navigation.
- **Gates.** Route each worker `needs_input` through the seam's `render_gate`
  when `options` is non-empty and `render_open_input` when it is empty.
  Present closed options through the native picker per "Closed-choice prompts"
  in `@sai/policies/remember.md`, append each exact answer to the opaque input
  history, and forward the exact value to the same worker with the `strategy`
  pointer (`revise-strategy`, an open answer) or the `apply` pointer
  (`apply-strategy`). Open input goes back
  unchanged; build no options for it and interpret nothing. A
  `decline-strategy` closes the run with the worker's closing summary.
- **New problem.** A worker `conflict_detected` with `strategy-analysis`, a
  new conflict, or a strategy revision invalidates the old confirmation:
  print its notice, capture a new snapshot when the conflicted set changed,
  and repeat the full `strategy` analysis and presentation before a new
  `apply` task in either mode.

### Resolution validation

The worker places `authored` text through `merge.js write` after the Step 7
application hand-off (the tool preserves each file's encoding, BOM, and line
endings, and the `resolution` check below expects those same bytes) and
returns the `## Complete resolution payload` JSON object defined in
`instructions.md`. Surrounding prose is explanation, never file content.
Validate the whole object at once:

1. `selected_contextual_decisions` holds exactly one `ours`, `theirs`, or
   `synthesis` per semantic conflict, each matching the decision the
   confirmed strategy states for it.
2. `files` holds exactly one record per affected conflicted path,
   with no duplicate or unexpected path, the worker's category, and
   `decisions` that agree with the decision records.
3. `source` is `git-ours` or `git-theirs` with empty `regions`, or
   `authored` with at least one region, each region's `conflict_id` present
   in the captured region inventory; semantic regions also match the
   file's `decisions` (obvious authored regions need no semantic decision).
   No region `text` holds a `<<<<<<<`,
   `=======`, or `>>>>>>>` line, a diff, a hunk, or a complete file.
4. Any missing or invalid record, decision, path, region, or source rejects
   the whole payload: touch no conflict and stage nothing.

Run `merge.js resolution --phase authored` with the exact original worker
source and retained pre-write snapshot:

```text
node <merge-tool> resolution --record <snapshot> --record-hash <retained-sha256> --source <original-worker-result-file> --confirmed <semantic-decision-array-file> --phase authored|materialized --json --cwd <project-root>
```

Preserve the received worker result byte-for-byte in `--source`, including
its original envelope, and validate it through the shared runner first. Do not
construct a reduced substitute or strip its fields. The confirmed array is
separate coordinator evidence derived from the exact confirmed strategy, never
a replacement worker result. On both Claude Code and opencode, create
`--source` and `--confirmed` inputs as unique files in the same
harness-approved temporary area outside the repository as `--record`, and
retain their exact references and hashes until the invocation closes. These
are ephemeral validation inputs, not repository artifacts, `changed_files`, or
staging candidates; creating them inside the repository would contaminate the
unrelated-content check.

Reject on stale/changed snapshot, HEAD/index/operation mismatch, incomplete
inventory, region mismatch, or unrelated content change. The reference
for authored content is the file captured before writing, including
Git-combined content, not either stage's whole file. Git-sourced files stay
unchanged until your checkout, then equal the captured stage blob. A missing
selected stage requires explicit handling or escalation; never approximate it
with a checkout.

After every record passes, materialize `git-ours` / `git-theirs` files with
`git checkout --ours` / `--theirs`; `authored` files are already written.
Add each materialized path to the union after its checkout succeeds.

### Post-resolution review

Compare the working tree with the confirmed strategy held in your context. A
`git-ours` / `git-theirs` file is byte-identical to its captured
`git show :2:` / `:3:` stage. An `authored` file matches its captured
pre-write working content outside the resolved regions and carries the
confirmed decisions inside them. No write lands outside the agreed regions
or the affected file set. On a divergence (an unauthorized change, an unresolved
region, an out-of-scope write, any deviation from the strategy), stage
nothing and send the named divergence to the same worker as a correction
under the `apply` pointer, then review again. After three rounds without a
match, stop without staging: report that the confirmed strategy could not be
materialized within the retry budget. Supplement this independent semantic
review with `merge.js resolution --phase materialized`; stage only when both
pass. Reuse valid checks during review and repeat only invalidated facts. A
correction retains the original protected-content snapshot, not a fresh
snapshot of the incorrect write. A correction whose regions differ from the
captured ones receives a new exact authorized-region snapshot before writing
(§ Correction capture); absent exact boundaries, stop
rather than broaden scope. Keep the previous snapshot for evidence; a
correction capture authorizes only the named corrective ranges.

### Correction capture

`node <merge-tool> correction --record <unique-external-file> --json --cwd <project-root>`
takes a complete JSON array on stdin:
`{path, category, before_hash, regions: [{start, end, conflict_id}]}`.
`before_hash` is SHA-256 of the current file; ranges are ordered, disjoint byte
offsets in that preimage. Confirm each boundary independently and restrict
paths to the current affected set before this call. This read-only capture
creates the same protected snapshot with explicit correction ranges, not
inferred markers. Continue the worker with the `apply` pointer and the
authorized correction; it returns the same complete resolution payload.
Validate and independently review it before re-staging. A correction that
changes a confirmed objective instead re-enters `strategy` and its
mode-specific hand-off.

### Staging

After the review passes, `git add` every resolved file. A file with an
unresolved escalation is staged only with the escalation noted.

Exit: the resolution is staged and reviewed — enter `verify`; or the run is
closed (declined strategy, review budget exhausted, launch failure).

## Stage: verify

Runs after a conflict stop's resolution is staged. The stage facts are the
`verify` receipt: the detected command, exit code, `verification_result`, and
the reference/hash of the full output. One call runs the `test_command` fixed
in preflight: pass an explicit command on the stage entry and on every later
`verify` as `--command '<test_command>'`; with `list`, pass the suite record
captured in preflight as `--suite <record> --suite-hash <record_hash>`. Every
round carries one of the two, so no round detects the command again. The
record retains full
stdout/stderr, and the returned view carries only their hashes and
`output_ref`. A state change during the test invalidates a pass. The budget is
three rounds per conflict stop; each test run that started uses one round, and
validating a receipt is not a run.

### Step 8: Verification loop

- **`unavailable`** — no suite was detected, or the command could not start.
  `unavailable_reason` names which: `no-suite`, `ambiguous-suite` (several
  .NET candidates, listed in `detail`), or `not-runnable` (the command failed
  to start; `detail` holds the reason). Print the matching notice from
  the verification texts, record `verification_result: unavailable` before proceeding
  unprompted, and continue. It is not a pass and not a question. A
  `not-runnable` result is not a failing test: it uses no round and starts no
  test correction.
- **`passed`** — record it and continue.
- **Fail in round 1 or 2** — a failing test is a judgment point. Continue the
  worker with the `test-correction` pointer, the round number, the staged
  paths, and the failure record's reference/hash. It returns the failure
  analysis and its proposed fixes as exact correction ranges within the
  affected file set. Then choose exactly one branch before another execution:
  - **Applied correction** — capture proposed ranges per the `conflicts`
    stage's § Correction capture, validate and independently review the
    returned payload as in that stage, and re-stage the corrected files.
    Count a correction only when tool evidence confirms changed bytes in
    authorized files against this round's pre-write snapshot and the
    corresponding independent review passed. A proposal, report, no-op write,
    or cumulative `changed_files` union is not proof of a correction in this
    round. After that proof and review, repeat verification within the budget.
  - **Concrete repeat reason** — without an applied correction, record the
    evidence and why another execution can provide useful new information
    before executing it. A started run interrupted by the execution timeout
    may justify increasing that timeout; speculation about intermittent
    failures does not justify a repeat. This grants neither environment
    changes nor scope expansion.
  - **Neither** — when failure analysis completes without an applied correction
    and without a concrete repeat reason, record coordinator-only
    `verification_result: failed-no-correction` and close verification now.
    Proposed but unapplied corrections take this branch. Retain the consumed
    round count and every remaining failure; unused rounds are not exhausted.
    Continue integration through the same navigation as `cap-exhausted`,
    with failed status, not a pass.
  A permitted repeat runs
  `node <merge-tool> verify --record <new file> --json --cwd <project-root>`
  with the same fixed command or suite arguments above. Each started
  execution, including one that reaches the execution timeout, consumes a
  round. Increasing the timeout does not reset the maximum of three.
- **Fail in round 3** — record `cap-exhausted`. The resolved state stays
  staged and uncommitted, the run continues as on a pass, and the final
  summary carries the remaining failures.

A fix that would change a confirmed objective, or a worker
`conflict_detected` with `strategy-analysis`, returns to the `conflicts`
stage's new-problem rule before the next resolution write.

Keep the consumed rounds for this conflict stop on re-entry, including after
a new-problem strategy correction. Each new rebase conflict stop gets fresh
verification and its own three-round budget; retain earlier unresolved
failures for the final summary. Retry decisions and `failed-no-correction`
belong only to coordinator state, not the stateless tool or worker fields.

Exit: `verification_result` is `passed`, `unavailable`, `failed-no-correction`, or `cap-exhausted` —
enter `collision` for a merge, or `final` for a stopped rebase.

## Stage: collision

Runs on the final integration state: after a clean merge, after a conflicted
merge's verification, or after a rebase has finished. An in-progress rebase
skips it until the rebase finishes. The stage facts are the `collision`
receipt, computed from the original provenance receipt on stdin. Verified
absence of source-introduced records skips grouping and reference searches;
otherwise the tool groups the final tracked/index frontier by family and
prefix. `needs-judgment` is not a disposition, and no approximate mechanical
rule authorizes a repair.

### Step 9: Collision check

- **`not-applicable` or `no-collision`** — record the value in
  `collision_applicability` and continue. Report only the disposition: no
  search ran.
- **`needs-judgment`** — decision records in collision are a judgment point.
  Dispatch the worker when none is running (`coordinator.md`
  § Judgment-point dispatch); otherwise continue the same worker. Disclose
  `renumbering-plan` with the provenance receipt, the collision receipt's
  reference/hash, and the verification outcome. Its plan resolves the
  applicability to `not-applicable`, `no-collision`, `repair-required`, or
  `escalation-required`.

### Collision repair

When the worker's plan is `repair-required`, for each rename first record its
worker data in the seam's `adr_ddr_renames`, then apply exactly the worker's
replacements — `old_h1` → `new_h1`, `old_index_label` → `new_index_label` in
its index, and every listed reference update — and then `git mv <old> <new>`.
Apply only replacements the worker supplied, and never rename onto a path
another final-state record occupies. Orphan, ambiguous, and delete/modify
escalations are reported, never modified. Add renamed and updated paths to
the union.

### Final staging

`git add` exactly the union.

Exit: the applicability is resolved, every supplied repair is applied, and
the union is staged — enter `final`.

## Stage: final

Runs at each resolved rebase stop and on the final integration state. The
stage facts are the `status` receipt: HEAD and its subject, the current
branch, the staged and unmerged paths, and the operation state. Run
`node <merge-tool> status --json --cwd <project-root>` again whenever you
need those facts after an operation.

### Step 10: Finalization

Finalize only integration-owned staged content: the receipt's staged paths
are exactly the paths you staged. Retain unrelated working-tree changes, and
stop if unrelated staged content would enter a commit.

Build and present `compact_finalization_summary` from the final texts, then
directly execute the operation the integration state selects, unprompted
under § Command-local authorization. This pre-operation report is not
terminal navigation.

| state | operation |
| --- | --- |
| merge in progress | local merge commit |
| rebase stopped at a resolved commit | `git rebase --continue` |
| rebase finished, collision repair staged | local collision-repair commit |

- **Merge in progress, or a finished rebase with a staged repair** — pass the
  informative message (§ Informative messages, `merge_base..source_sha`)
  literally on standard input to `git commit -F -`, using
  `@sai/policies/command-execution.md`; show the resulting SHA and subject.
- **Rebase stopped** — `GIT_EDITOR=true git rebase --continue`. A new
  conflicted commit re-enters the `conflicts` stage (Step 5) with a fresh
  snapshot, the same worker, and the language already selected; a finished
  rebase goes to the collision pass (Step 9).
- **A rebase that finished with nothing staged needs no operation** and
  creates no extra commit.

Record the actual outcome in `finalization_status`. On a Git failure,
preserve the current state, surface the error, and follow the existing
error path without bypassing checks or claiming success.

### Closure

When no operation remains, write the final summary from the final texts'
template and hand it to `terminal_navigation`.

Exit: the run is closed with its final summary, or a rebase continued into
its next stage.

## Informative messages

Fetch @sai/policies/commit-rules.md and follow its message and safety rules;
`coordinator.md` § Command-local authorization replaces its Authorization gate.

A synthesized merge or squash message is an inventory of contained work, not
a summary. Compose the subject and keep it within 50 characters (squash
creation per `@sai/policies/commit-rules.md`; merge finalization by applying
`sai/commands/commit/instructions.md` Steps 1–5 under
`@sai/policies/commit-rules.md`), then append a body listing every
contained commit. Enumerate the range with
`git log --reverse --format=%s <range>` and emit one `- <first line>` body
line per output line, in that order, literal, with no reformat,
translation, or hash, all commits, no truncation (huge messages accepted), keeping each bullet on
one line even past 72 characters with no rewrap or trim, with a blank line
between subject and list. Ranges: merge finalization uses
`merge_base..source_sha`; squash creation uses `merge_base..HEAD` (the
current-branch uniques before the soft reset). With no contained commits
emit the subject alone with no list; one contained commit still yields one
bullet, never folded into the subject. The list reflects only contained
commits; conflict resolution adds or removes no bullets. Plain rebase and
a finished rebase with nothing staged carry no list.
