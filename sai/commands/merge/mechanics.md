# Merge mechanical evidence

Fetch @sai/policies/tool-resolution.md and resolve `merge.js` once for this invocation. Use that same installed copy for every call. Both Claude Code and opencode install it through the existing `sai-tools` projection.

## Evidence, not authority

`sai/tools/merge.js` computes repository facts. The coordinator still owns every decision, the review, and every git mutation; the worker still reconstructs intent. Each fact receipt carries `version`, `action`, `outcome`, `dependencies`, `state`, and `data`. `success` is a collected fact, `failure` is a failed check, and `not-applicable` is an explicit skipped operation, never a passing test. A collection or usage error exits 2, a failed assertion exits 1. Stop on a missing, malformed, or incomplete receipt rather than infer a result.

The state records the exact repository, `HEAD`, index entries, refs, operation identity, and the file hashes and modes the result depends on. To reuse a receipt, run `node <merge-tool> valid --json --cwd <project-root>` with the whole receipt on standard input, and reuse it only on `success`. A write, checkout, staging, launch, rename, or finalization invalidates the receipts whose dependencies changed. A provenance receipt is immutable historical evidence after the launch: never replace its shas with the current `HEAD` or a moved ref.

## Records

A record is a file outside the repository, in the run directory, written exclusively and identified by its path and sha256. Verify a retained hash before using the record; a missing or changed record stops the work that depends on it. Never overwrite a conflict snapshot to make a failed comparison pass.

## Calls

All calls take `--json --cwd <project-root>`.

| Call | Gives |
| --- | --- |
| `preflight` | the current branch, the dirty paths with their status codes, the unmerged local branches newest first, and whether a merge or rebase is in progress |
| `provenance --source-ref <full-ref> --method merge\|rebase --squash yes\|no\|not-applicable` | after checking the ref, the target, source, and merge-base shas, the source-introduced ADR/DDR records, the governing rules of each side, and the upstream facts: the current branch's upstream, how many commits a rebase or squash would rewrite, and how many of those the upstream already holds (`force_push_needed`) |
| `conflicts --record <file>` | the conflict snapshot: affected files with category, regions, and stage OIDs, and the unrelated-content inventory, captured before any write |
| `bundle`, `write` | the conflict bundle for the worker, and the worker's only way to change an affected file (`steps/common.md`, `steps/apply.md`) |
| `resolution --record --record-hash --source --confirmed [--phase authored\|materialized]` | the check of a written resolution against the snapshot: complete inventory, decisions that match, text only inside the regions, unrelated content untouched, and, in `materialized`, whole-side checkouts equal to their captured stage |
| `correction --record <file>` | a snapshot of explicit byte ranges (array on standard input) that authorizes a correction outside the conflict regions |
| `suite --record <file>` | the project-marker test command, when no documented command exists |
| `verify` | one run of the fixed test command; `--command '<line>'` for a documented command, else `--suite <record> --suite-hash <sha256>` |
| `verify --baseline --record <file>` | the suite before the integration, with the failing tests named when the output allows it |
| `verify --baseline-record <file> --baseline-hash <sha256>` | the suite compared with the baseline: a failure not in the baseline is rerun once, and `comparison.status` is `clean`, `preexisting`, `flaky`, `not-comparable`, `new`, or `unavailable`. `verification_result` is `failed` only for a new failure |
| `collision` (provenance on standard input, `--record <file>`) | the ADR/DDR collision frontier: `not-applicable`, `no-collision`, or `needs-judgment` |
| `status` | `HEAD`, its subject, the current branch, the staged and unmerged paths, and the operation state |

`verify` reports `unavailable` with its reason when no suite is detected, several candidates are ambiguous, or the command cannot start; that is not a failing test and not a pass.
