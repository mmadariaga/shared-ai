# Merge mechanical evidence

Fetch `@sai/policies/tool-resolution.md` and resolve `merge.js` once for this invocation. Use that same installed copy for every call. Both Claude Code and opencode install it through the existing `sai-tools` projection.

## Evidence, not authority

`sai/tools/merge.js` computes repository facts. The coordinator still owns every decision, the review, and every git mutation; the worker still reconstructs intent. Each fact receipt carries `version`, `action`, `outcome`, `dependencies`, `state`, and `data`. `success` is a collected fact, `failure` is a failed check, and `not-applicable` is an explicit skipped operation, never a passing test. A collection or usage error exits 2, a failed assertion exits 1. Stop on a missing, malformed, or incomplete receipt rather than infer a result.

The state records the exact repository, `HEAD`, index entries, refs, operation identity, and the file hashes and modes the result depends on. To reuse a receipt, run `node <merge-tool> valid --json --cwd <project-root>` with the whole receipt in `--input-file <path>`, and reuse it only on `success`. A write, checkout, staging, launch, rename, or finalization invalidates the receipts whose dependencies changed. A provenance receipt is immutable historical evidence after the launch: never replace its shas with the current `HEAD` or a moved ref.

## Records

A record is a file outside the repository, in the run directory, written exclusively and identified by its path and sha256. Verify a retained hash before using the record; a missing or changed record stops the work that depends on it. Never overwrite a conflict snapshot to make a failed comparison pass.

A tool whose output is large writes it to a record file and prints a JSON summary with the record's path and hash: `conflicts`, `correction`, and `verify` through `--record`, and `bundle` through `--out`. Read the summary first and open the record only for the detail it lacks.

## Calls

All calls take `--json --cwd <project-root>`.

| Call | Gives |
| --- | --- |
| `preflight` | the `worktree_id` (the first 16 hex characters of the sha256 of the worktree's real top-level path, with `/` separators and lowercased on Windows, so one folder keeps one id whatever its spelling; the card keys the run-state slot `merge-{worktree_id}-{branch}` with it), the current branch, the dirty paths with their status codes, the branches not yet merged into `HEAD` newest first (local branches, the current branch's upstream, and each remote's default branch, with name and full `ref`), and whether a merge or rebase is in progress |
| `provenance --source-ref <full-ref> --method merge\|rebase --squash yes\|no\|not-applicable` | after checking the ref, the target, source, and merge-base shas, the source-introduced ADR/DDR records, the governing rules of each side, and the upstream facts: the current branch's upstream, how many commits a rebase or squash would rewrite, and how many of those the upstream already holds (`force_push_needed`) |
| `simulate --source-ref <full-ref> --method merge\|rebase\|squash [--harness <claude\|opencode>]` | before the launch, the predicted stops (§ Simulation): a summary with `predicted_stops` and `repeated_files`, and the path and hash of the detail file it wrote under the SAI temp root |
| `conflicts --record <file>` | the conflict snapshot: affected files with category, regions, stage OIDs, the safety check, the containment indicators, and the conflict signature, and the unrelated-content inventory, captured before any write. The record holds the complete indicators; stdout carries their bounded summary and each file's signature. During a rebase the upstream side is `base..onto`, never the branch's replayed copies, and its history facts are computed once per rebase into `history-facts.json` beside the record (`history_reused` says when a stop reused them) |
| `bundle [--out <file>]`, `write` | the conflict bundle for the worker (with `--out`, written to a new record file outside the repository and summarized on stdout), and the worker's only way to change an affected file (`steps/common.md`, `steps/resolve.md`) |
| `resolution --record --record-hash --source --confirmed [--phase authored\|materialized] [--partial]` | the check of a written resolution against the snapshot: complete inventory, decisions that match, text only inside the regions, unrelated content untouched, and, in `materialized`, whole-side checkouts equal to their captured stage. `--partial` checks only the files the resolution names, for the shortcut files of a mixed stop |
| `correction --record <file>` | a snapshot of explicit byte ranges (array in `--input-file <path>`) that authorizes a correction outside the conflict regions |
| `verify --command '<line>'` | one run of the exact test command line the coordinator built from `test-select.js command` and `select` (`test-execution.md`); `verification_result` is `passed`, `failed`, or `unavailable`, and `failing` names the failing tests when the output allows it. The tool discovers no suite and compares with no baseline: the classification of failing tests is the policy's, through `test-select.js swap` and `restore` |
| `collision` (provenance in `--input-file <path>`, `--record <file>`) | the ADR/DDR collision frontier: `not-applicable`, `no-collision`, or `needs-judgment` |
| `duplicates` (provenance in `--input-file <path>`, `--record <file>`) | the introduced duplicate blocks of the final tree: see Introduced duplicates |
| `status` | `HEAD`, its subject, the current branch, the staged and unmerged paths, and the operation state |

`verify` reports `unavailable` with its reason when the command cannot start; that is not a failing test and not a pass.

## Simulation

`simulate` predicts the stops of an integration before it launches, with `git merge-tree --write-tree`, which writes objects only: it changes no working tree, index, or ref (the receipt state proves it). A merge is one step (`HEAD` with the source). A squash is one step (the current branch's own commits since the merge base as one change replayed on the source), and none when there is nothing to squash. A rebase is one step per commit `git rebase` would replay (`<source>...HEAD`, right side only, merges and commits whose patch the source already holds left out), oldest first. After a predicted stop the next step starts from the merged tree with the current tip's version (`ours`, the upstream side) of each conflicted file, which is how the whole-side shortcut resolves a stop. One conflict does not end the prediction, which runs to the end of the range, and later commits that change the same lines of that file stop again.

The prediction is advisory: hooks, autostash, and rerere can change what git does, and the real stops govern. It does not evaluate containment, so it counts stops the whole-side shortcut may later resolve. Start runs the call after the start questions are answered, for the chosen method, and its summary (`repeated_files` included) feeds only the closing report: no question reads it and none recommends a method.

The run directory does not exist yet when Start runs the call, so the tool creates a private directory under the SAI temp root (`--harness` selects the root, as for `temp-root.js`; without it the harness of the installed copy) and writes the complete receipt there as `simulation.json`: every predicted stop with its position in the range, commit, subject, and conflicted files. Stdout carries the summary: `status`, `method`, the three shas, `replayed` (the steps simulated), `predicted_stops`, `repeated_files` (each `{path, stops}` with `repeated_threshold` (3) or more predicted stops, most stops first), and the `record` and `record_hash` of the detail file. A simulation that cannot run (git without `merge-tree --write-tree`, a ref it cannot read, a commit it cannot replay, any git failure) is `not-applicable` with `data.status: unavailable` and a `reason`, writes no file, and is not a failed check. `--record` does not apply.

## Containment indicators

`conflicts` adds `containment` to the stop (`operation`: `merge`, `rebase`, or `cherry-pick`, the incoming tip, the merge base, how many commits were scanned on each side, and `truncated` when a side exceeded 500 commits) and to each file. They are evidence about one question: is the change the stop replays (git's stage 3: the replayed commit, or the source branch in a merge) already contained in the other side (stage 2)? They never decide it. Per file:

- `incoming`: the incoming commits that touch the file, each with `sha`, `subject`, `patch_id` (upstream commits whose `git patch-id --stable` equals this commit's), `same_subject` (upstream commits with the same subject), and `range_diff` (`{upstream, status}` of the `git range-diff` pairing, where `=` is an identical patch and `!` a modified one, or `null` when unpaired or skipped for size).
- `upstream_touching`: the upstream commits that touch the file.
- `lines`: for a file with all three stages, `added` and `removed` (the non-blank lines the incoming change adds and removes against the common ancestor), `present_on_other_side` (how many added lines the other side already holds, with multiplicity), `missing` (the added lines it lacks, at most 50), `still_on_other_side` (how many removed lines the other side still holds), and `still`; `null` for a file without all three stages (binary, deleted on one side, renamed).

The stdout summary of a file keeps at most 5 incoming commits, with `patch_id` and `same_subject` as booleans and `range_diff` as its status, the count of `upstream_touching`, and the counts of `lines` with at most 3 `missing` lines. The safety check (`stage_checkout_preserves_combined_content`) stays beside the indicators: a `false` side admits no whole-side checkout.

## Conflict signature

`conflicts` gives every file a `signature`: `path`, `category`, `regions` (the number of conflict regions), `region_lines` (per region, `[ours_lines, theirs_lines]`, the line counts of the two sides git wrote between the markers, the base version left out), and `id`, the sha256 of the JSON array `[path, category, region_lines]`. The region text is not part of it, so a conflict whose text changes at every stop (a regenerated hash or version) keeps its signature, and a file whose shape changes does not. Two files have the same signature exactly when their `id` is equal: the tool decides that, never a worker and never the coordinator's reading. A file with no region (binary, deleted on one side, renamed) has `regions: 0`.

## Recipes

A recipe is a saved procedure: a Markdown file the worker writes in `<run directory>/recipes/` (outside the repository) for a file it resolved by a method that repeats. It never holds resolution text to paste: reuse writes through `merge.js write` like every resolution, and its result passes `merge.js resolution` like every resolution.

```text
signature: <the signature id of the file, copied from the snapshot>
file: <repository-relative path>

## Procedure
<per region position (`region 1`, `region 2`): the segments to compose or the rule that derives the text from the two sides>

## Why it repeats
<the intent the procedure serves, so a reviewer can tell a misapplied recipe>
```

A completed `resolve` report may carry `recipe`, a list of `{path, signature}`: the recipe file and the `signature.id` the worker copied. The coordinator accepts an entry only when that id is the id of a file the same stop record resolved by the worker's own decision, and keeps it in `recipes.md` in the run directory, one line per recipe, which is what a replacement worker and a resumed run read:

```text
- <signature id> | <file path> | <recipe path>
```

A stop whose record holds a file with a listed id sends that file to the `reuse` step with the recipe path. A recipe that failed at a stop (its report left the file untouched, the resolution check rejected it, or the review pass found a defect) is removed from `recipes.md`.

## Introduced duplicates

`duplicates` reads the final tree (the index, which must hold no unmerged path) and the two sides named by the provenance (`target_sha`, `source_sha`). It looks only at files that differ from both sides, because a file equal to one side has that side's duplicates. Per file it compares lines after trimming and ignores every line with no letter or digit (blank, brace-only, punctuation-only). A block is `min_lines` (4) consecutive significant lines. A block is **introduced** when it appears at least twice in the file of the final tree (occurrences do not overlap) and at most once in the same file on each side; a block already duplicated on one side is never listed. Consecutive flagged windows that repeat together are one block.

The result lists `blocks`, at most 100 (`total_blocks` and `truncated` say when more exist), each with `significant_lines`, a `preview` of its first lines, `target_count` and `source_count`, and its `occurrences`: `location` (`path:line`), `path`, `line`, `end_line`, the byte range `start` and `end` (from the first line of the block through the newline of its last line), and the file's `before_hash`. Files it could not compare (`binary`, `not-utf-8`, `too-large`) are in `skipped`. The ranges and hash are the inputs of `correction` when the file still equals the index. The tool flags and never decides: an intentional repetition is the coordinator's judgment.

## Resolution formats

**Complete resolution payload.** The resolution source of `resolution --source` is a terminal merge report (`status: completed`, `summary`, `changed_files`) whose `summary` holds one `## Complete resolution payload` heading followed by one JSON object, in a fenced block or bare, with nothing after it but another `## ` heading:

```json
{"selected_contextual_decisions": [{"conflict_id": "code:src/a.js#1", "decision": "synthesis"}],
 "files": [{"path": "src/a.js", "category": "code", "source": "authored",
            "regions": [{"conflict_id": "code:src/a.js#1", "text": "..."}],
            "decisions": [{"conflict_id": "code:src/a.js#1", "decision": "synthesis"}]},
           {"path": "src/b.js", "category": "code", "source": "git-ours", "regions": [], "decisions": []}]}
```

`category` is `specs`, `adr-ddr`, or `code`; `source` is `authored` (`changed_files` lists its path), `git-ours`, or `git-theirs` (no regions). `steps/resolve.md` gives the worker's form. For a shortcut the coordinator writes the same report in the run directory with one `git-ours` record per shortcut file, `changed_files: []`, and no decisions.

**`stop-{n}-confirmed.json`.** The array of decisions the check expects, `[{"conflict_id": "<category>:<path>#<n>", "decision": "ours|theirs|synthesis"}]`, one per semantic region and per whole-side file of the strategy; a file without regions is `<category>:<path>#1`. The shortcut writes `[]`.

**`stop-{n}-shortcuts.md`.** One line per file of the stop, written once the shortcut files pass the materialized check and before they are staged:

```text
- <path> | shortcut ours | <reason: the evidence that the change is already contained>
- <path> | worker | <reason: the safety check or indicator that kept it from the shortcut>
```

A `shortcut` line means the whole-side checkout was applied and checked; the closing report quotes these lines.
