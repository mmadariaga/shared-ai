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
| `conflicts --record <file>` | the conflict snapshot: affected files with category, regions, stage OIDs, the safety check, and the containment indicators, and the unrelated-content inventory, captured before any write. The record holds the complete indicators; stdout carries their bounded summary |
| `bundle [--out <file>]`, `write` | the conflict bundle for the worker (with `--out`, written to a new record file outside the repository and summarized on stdout), and the worker's only way to change an affected file (`steps/common.md`, `steps/apply.md`) |
| `resolution --record --record-hash --source --confirmed [--phase authored\|materialized] [--partial]` | the check of a written resolution against the snapshot: complete inventory, decisions that match, text only inside the regions, unrelated content untouched, and, in `materialized`, whole-side checkouts equal to their captured stage. `--partial` checks only the files the resolution names, for the shortcut files of a mixed stop |
| `correction --record <file>` | a snapshot of explicit byte ranges (array in `--input-file <path>`) that authorizes a correction outside the conflict regions |
| `suite --record <file>` | the project-marker test command, when no documented command exists |
| `verify` | one run of the fixed test command; `--command '<line>'` for a documented command, else `--suite <record> --suite-hash <sha256>` |
| `verify --baseline --record <file>` | the suite before the integration, with the failing tests named when the output allows it |
| `verify --baseline-record <file> --baseline-hash <sha256>` | the suite compared with the baseline: a failure not in the baseline is rerun once, and `comparison.status` is `clean`, `preexisting`, `flaky`, `not-comparable`, `new`, or `unavailable`. `verification_result` is `failed` only for a new failure |
| `collision` (provenance in `--input-file <path>`, `--record <file>`) | the ADR/DDR collision frontier: `not-applicable`, `no-collision`, or `needs-judgment` |
| `duplicates` (provenance in `--input-file <path>`, `--record <file>`) | the introduced duplicate blocks of the final tree: see Introduced duplicates |
| `status` | `HEAD`, its subject, the current branch, the staged and unmerged paths, and the operation state |

`verify` reports `unavailable` with its reason when no suite is detected, several candidates are ambiguous, or the command cannot start; that is not a failing test and not a pass.

## Containment indicators

`conflicts` adds `containment` to the stop (`operation`: `merge`, `rebase`, or `cherry-pick`, the incoming tip, the merge base, how many commits were scanned on each side, and `truncated` when a side exceeded 500 commits) and to each file. They are evidence about one question: is the change the stop replays (git's stage 3: the replayed commit, or the source branch in a merge) already contained in the other side (stage 2)? They never decide it. Per file:

- `incoming`: the incoming commits that touch the file, each with `sha`, `subject`, `patch_id` (upstream commits whose `git patch-id --stable` equals this commit's), `same_subject` (upstream commits with the same subject), and `range_diff` (`{upstream, status}` of the `git range-diff` pairing, where `=` is an identical patch and `!` a modified one, or `null` when unpaired or skipped for size).
- `upstream_touching`: the upstream commits that touch the file.
- `lines`: for a file with all three stages, `added` and `removed` (the non-blank lines the incoming change adds and removes against the common ancestor), `present_on_other_side` (how many added lines the other side already holds, with multiplicity), `missing` (the added lines it lacks, at most 50), `still_on_other_side` (how many removed lines the other side still holds), and `still`; `null` for a file without all three stages (binary, deleted on one side, renamed).

The stdout summary of a file keeps at most 5 incoming commits, with `patch_id` and `same_subject` as booleans and `range_diff` as its status, the count of `upstream_touching`, and the counts of `lines` with at most 3 `missing` lines. The safety check (`stage_checkout_preserves_combined_content`) stays beside the indicators: a `false` side admits no whole-side checkout.

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

`category` is `specs`, `adr-ddr`, or `code`; `source` is `authored` (`changed_files` lists its path), `git-ours`, or `git-theirs` (no regions). `steps/apply.md` gives the worker's form. For a shortcut the coordinator writes the same report in the run directory with one `git-ours` record per shortcut file, `changed_files: []`, and no decisions.

**`stop-{n}-confirmed.json`.** The array of decisions the check expects, `[{"conflict_id": "<category>:<path>#<n>", "decision": "ours|theirs|synthesis"}]`, one per semantic region and per whole-side file of the strategy; a file without regions is `<category>:<path>#1`. The shortcut writes `[]`.

**`stop-{n}-shortcuts.md`.** One line per file of the stop, written once the shortcut files pass the materialized check and before they are staged:

```text
- <path> | shortcut ours | <reason: the evidence that the change is already contained>
- <path> | worker | <reason: the safety check or indicator that kept it from the shortcut>
```

A `shortcut` line means the whole-side checkout was applied and checked; the closing report quotes these lines.
