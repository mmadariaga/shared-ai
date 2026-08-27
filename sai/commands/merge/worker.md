# Merge Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/commands/merge/instructions.md and follow those instructions exactly.

## Invocation Envelope

The worker receives exactly one opaque string: `arguments_value`; binding
metadata remains outside the worker request. Do not scan parent conversation
history. There is no change resolution in this phase: payloads never carry
`resolved_change_name`, and no prerequisite check runs — `sai-merge` works in
projects without openspec.

The coordinator declares `fast_track_active` alongside the envelope as session
state. Honor it only in the fast-track branches documented in the instruction's
Step 5 (runtime scope gate): it may skip only that scope question. It never
selects `ours`, `theirs`, or `synthesis`, and it never suppresses a required
contextual decision, the pre-merge environment checks, the verification loop,
or the incremental ADR/DDR collision pass.

After branch selection, the coordinator carries invocation-scoped merge
provenance outside `arguments_value`: `target_sha`, `source_sha`, `merge_base`,
and the ordered source-introduced ADR/DDR record inventory captured before
`git merge`. The provenance is forwarded with the post-merge outcome and is
used to scope Step 7; do not recompute it from post-merge `HEAD` or a moved
source ref.

The coordinator also owns one invocation-scoped `working_language` value. It is
not part of `arguments_value`, a worker payload, an artifact, or configuration.
The worker receives the selected value only through the active same-worker
continuation after the conflict hand-off, and retains it for every later
explanation, strategy revision, context request, correction, verification
re-entry, and new-conflict analysis. A clean merge never receives or requests
this value.

## Lifecycle

This phase declares NO progress plan: emit no progress events, no design notice,
and no handshake event. A conflicted merge first emits the declared closed
nonterminal `event: conflict_detected` extension from
`@sai/orchestration/worker-core.md`; it carries the affected-file inventory and
either `continuation_state: language-selection` or
`continuation_state: strategy-analysis`. The event pauses this worker stretch;
the coordinator handles the language question or the re-entry notice and then
resumes the same worker. Every stretch still closes with exactly one terminal
lifecycle status — `completed`, `needs_input`, or pre-resolution
`failed`/`cancelled` — in the closed worker-core shapes, each carrying the
mandatory worker-authored `emitted_on`, a concrete summary in the selected
working language once one exists, and an ordered duplicate-free
`changed_files`.

## Read-only technical procedure

Perform the whole read-only procedure of
`sai/commands/merge/instructions.md`: the pre-merge environment checks (E1
dirty-worktree gate, E2 in-progress-merge guard), the branch selection
(local branches from `git branch --no-merged HEAD` whose commits are not already
reachable from the current branch, sorted by full commit timestamp descending and exact
branch name ascending for equal timestamps, with `YYYY-MM-DD HH:mm` labels and
exact branch-name values), the post-merge conflict analysis (ours/theirs/base
for each conflicted file, classification into specs / ADR-DDR / code), the
resolution analysis (semantic merge for specs, guided fusion for code, E3
escalation for true contradictions), the contextual objective comparison and
decision stage (complete `ours` / `theirs` / optional safe `synthesis`
alternatives, plus the `more-context` same-worker continuation), with the
filtered runtime scope gate (Step 5) emitted before any proposal payload when
fast-track is inactive, the verification loop (Step 6, E4 no-suite escalation,
E5 cap exhaustion), and the incremental ADR/DDR collision pass (Step 7, E6
triple+ collisions, E7 orphan refs, ambiguous bare-reference escalation, and
E8 delete/modify escalation). Step 7 uses only exact `A` record paths under
`docs/adr/` and `docs/ddr/` from the captured source-vs-base diff, excludes
source-side renames and copies (including unchanged-source copies via the
explicit `--find-copies-harder` check), filters them to records present in the
final merge state, excludes `docs/adr/0000-INDEX.md` and
`docs/ddr/0000-INDEX.md`, and compares their `(family, numeric prefix)` keys
against that final state. Final-state lookup includes both bare and existing
suffixed record names. A deleted or unidentifiable final record is removed from
the frontier; a conflict-resolution rename is not a second introduction. If
the frontier is empty, skip the collision pass entirely. Keep every
source-introduced record sharing a key, and process the complete final-state
group when that key exposes a pre-existing collision. Reserve unique
family-aware identifiers before suffix assignment so a target name is never
already occupied by another final-state record. For affected keys only, scan
repository-wide same-family and cross-family markdown links (including
correction-table and reserved historical links), relationship tokens, and
both `adr-index` and `ddr-index` structured metadata; do not search or repair
unrelated historical identifiers. Derive introduction events from the captured
`source_sha`, `target_sha`, or `merge_base` with path-following rename history,
preserving the original source path for repaired suffixed records. Use the
corresponding stage-side anchor for unresolved merge-index entries (stage 2 →
target, stage 3 → source, stage 1 → merge base), and sort by full introduction
timestamp, commit SHA, family, numeric prefix, and final path for deterministic
tie-breaking. Carry that provenance in every rename plan; an unresolvable event
is an escalation, never a missing date.

When the merge outcome is conflicted, stop immediately after collecting the
Git-reported conflict inventory and return the `conflict_detected` extension
before reading base/ours/theirs versions or performing category or semantic
analysis. The extension's `affected_files` is the exact ordered inventory; its
`changed_files` remains an empty worker-write list because detection is
read-only. Only after the coordinator forwards the selected working language
does this procedure continue into conflict classification and the global
strategy analysis. If the coordinator reports a new problem from resolution
application or verification, return through the same extension with
`continuation_state: strategy-analysis`, preserve the selected language, and
re-enter that analysis without asking for a language again.

The first conflict hand-off has this exact closed nonterminal shape:

```yaml
event: conflict_detected
emitted_on: string
summary: string
changed_files: string[]
affected_files: string[]
continuation_state: language-selection
```

The re-entry form keeps the same fields and uses
`continuation_state: strategy-analysis`. The worker returns no question or
options in this event and does not chat directly with the user.
Return the collision applicability value, the captured incremental frontier,
the exact old/new H1 and old/new index-label data, plus the family and assigned
suffixed identifier, for every proposed rename; obtain it as part of this
read-only analysis so the coordinator never has to reread artifacts to
reconstruct presentation state. Return the concrete index-file label update
and every exact canonical reference replacement for affected identifiers,
including cross-family prefixes and any ambiguous-reference escalation, so the
coordinator can apply the supplied H1, index-label, and reference replacements
without reconstructing them. Never propose a guessed destination for an
ambiguous bare reference.
Everything is read-only: these are checks, analyses, and proposals — never
mutations.

All findings return as technical source payload content: carry the conflict
analysis, the category-derived eligible scope options, one complete global
resolution strategy for the selected scope, its facts, inferences, affected
files, alternatives, and complete resolution content where required, the
verification results, and the ADR/DDR rename plan inside your summaries. The
coordinator's merge presentation seam owns how that source is rendered to the
user; keep the source content exact and never print it as your deliverable or
write it to a file. Gate questions and options remain returned lifecycle source
fields; do not invoke a picker or otherwise present them from this worker
session. The branch selector's question is exactly **"¿Qué rama quieres
mergear?"**; its option labels use `<branch> — last commit <YYYY-MM-DD HH:mm>`
for eligible branches while its values carry exact branch names. The scope
selector's options are already filtered to categories present in the worker's
conflict classification and ordered with `Full scope (Recommended)` (`full`)
first, followed by `Artifacts only (specs + ADR/DDR)` (`artifacts`) and `Code only`
(`code`) only when their categories are present. The worker's complete
strategy is a single proposal for the whole selected conflict set, not one
independent per-file prompt. Its internal `ours`, `theirs`, and optional safe
`synthesis` values remain stable in the complete alternatives and payload
records, while the user confirms or revises the global strategy. A
`more-context` request or a free-form context/correction answer continues this
same worker with the pending alternatives intact, without any write or stage.
When conflicts exist, the scope `needs_input` result is emitted before the
global strategy proposal when fast-track is inactive; the forwarded scope
answer (or fast-track's direct `full` selection) unlocks analysis, and only an
explicit confirmation of the current complete strategy unlocks resolution
payload delivery. Only explicit decisions unlock proposal delivery; in this
route, the required explicit decision is confirmation of the global strategy,
not an unreviewed per-file fragment choice.

## Strategy and continuation source contract

After the language hand-off and any selected scope gate, return one
worker-authored global strategy proposal for the entire selected conflict set.
The proposal is source content for the coordinator and contains, in the
selected working language, `## Global resolution strategy`, **Facts**,
**Inferences**, the affected files and conflict regions, what the plan keeps,
adopts, combines, or cannot safely synthesize, the affected contracts, the
trade-offs and risks, every complete alternative, and complete marker-free
resolution content where a candidate requires it. It is never a collection of
independent per-file fragment choices.

Return that proposal as a `needs_input` result with a closed strategy decision.
The `summary` is printed as ordinary coordinator text before the exact
question and ordered options are presented through the native question
mechanism. The strategy question asks whether to apply the current complete
plan and offers these stable values in order:

1. `Apply the complete strategy (Recommended)` — `apply-strategy`;
2. `Revise the strategy` — `revise-strategy`;
3. `Do not apply this strategy` — `decline-strategy`.

The worker authors explanatory labels in the selected working language; the
coordinator forwards them verbatim and the values are forwarded unchanged.
`apply-strategy` is the only value that can
unlock a completed result for coordinator validation and resolution writes.
`decline-strategy` closes the conflict route without a resolution write or
commit and documents the exact repository state. `revise-strategy` asks the
same worker for an open context/correction turn: return `needs_input` with the
worker-authored request and an empty `options` list. The coordinator presents
that request once as ordinary conversation text, waits for the user's free
text, and forwards it unchanged to this same worker. Recompute the complete
global strategy from the retained alternatives and the new evidence, then
return the proposal and closed decision again. This loop may repeat, and no
resolution write, conflict-marker removal, staging, or commit is allowed while
it is pending.

The existing internal decision values remain stable in every complete
alternative: `ours` preserves the current objective, `theirs` preserves the
incoming objective, and `synthesis` appears only for a worker-justified safe
combined outcome. `more-context` remains a valid internal continuation value
when a contextual alternative is exposed during a strategy revision; it never
becomes file content. A context or correction request is not answered by a
replacement worker and does not ask for the working language again.

On `apply-strategy`, return the completed resolution result with the exact
`## Selected contextual decisions` section and `## Complete resolution
payload` required below. The selected decisions must describe the one confirmed
global strategy, and the JSON object must contain a record for every conflicted
path in scope. The coordinator must validate the whole payload atomically
before writing anything.

A completed resolution result MUST carry the exact `## Complete resolution
payload` JSON object defined in `sai/commands/merge/instructions.md`. Its
`files` array contains one record per conflicted file in the selected scope,
with `path`, `category` (`specs`, `adr-ddr`, or `code`), `source`, `regions`,
and `decisions`. The `source` field must be exactly `"git-ours"`,
`"git-theirs"`, or `"authored"`. When the source is `git-ours` or `git-theirs`
(only when every region in the file resolves to the same side), the `regions`
array is empty and the coordinator uses `git checkout --ours` or
`git checkout --theirs`. When the source is `"authored"`, the `regions` array
carries one entry per conflicted region, each with a `conflict_id` (matching an
identifier in `decisions`, e.g. `"code:src/input.js#1"`) and a `text` field
holding only the region replacement text for the authored or synthesized
resolution, not a diff, hunk, complete file, marker annotation, or prose-only
instruction. Region replacement text must contain no `<<<<<<<`, `=======`, or
`>>>>>>>` markers. Regions are ordered by conflict_id for deterministic
splicing. The `selected_contextual_decisions` array contains every answered
semantic conflict and never `more-context`. The coordinator validates and
materializes each file: git-sourced files via checkout commands, authored files
by splicing each region's `text` into the working file at its marked conflict
region.

Preserve the instruction's stop texts exactly: an in-progress merge returns a
terminal payload whose summary is exactly **"Merge already in progress.
Resolve or abort the current merge first (`git merge --continue` or
`git merge --abort`)."** and closes the run; no other local branches returns
**"No other local branches to merge."**.

## Authorization ask

After the incremental ADR/DDR pass completes (or is skipped because the source
frontier is empty) and the coordinator has executed all renames and reference
updates, return `needs_input` asking **"Run `git commit` to
finalize the merge?"** with ordered options `yes (Recommended)` / `no`,
complying with the five-element anatomy of
`@sai/policies/question-context.md`. Carry a compact merge summary with the
target branch, source branch, verification status, conflict result, collision
result (including `not applicable` when the source introduced no final
ADR/DDR record or neither directory exists), and staged-file count. Carry the
corresponding collision-applicability value.
Do not put the full staged-file list in this authorization payload. The ask is
a returned lifecycle result, never an inline picker call from this session.

When the coordinator forwards the selected answer value, process it without
re-presenting the prompt and without executing anything: on `yes`, return
`completed` whose summary restates the exact authorized `git commit`
invocation for coordinator execution; on `no`, return `completed` whose
summary documents the exact repo state per the instruction's Step 8 refusal
branch (E9), including the full staged-file list only in that refusal summary.

## Absolute mutation prohibition

NEVER execute git mutations. NEVER run `git merge`, `git add`, `git commit`,
`git checkout`, `git stash`, `git reset`, or any state-changing git command.
NEVER write resolution files. NEVER rename files. NEVER update references in
any file. The merge launch, resolution writes, renames, reference updates,
staging, and commit execution belong exclusively to the coordinator.
