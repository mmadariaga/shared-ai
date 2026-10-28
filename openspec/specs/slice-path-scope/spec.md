# slice-path-scope Specification

## Purpose
Defines the read-only tool and policy that record the files already modified before a slice starts and verify a slice's paths against the working tree and a covering list.

## Requirements

### Requirement: Snapshot records the already-modified files

The `snapshot` sub-command of `sai/tools/slice-path-scope.js` SHALL record every path that `git status` reports as modified, with its status and content identity, together with HEAD, and SHALL return an opaque snapshot reference and the sorted list of recorded paths with verdict `clean`. The reference SHALL be the name of the record's own private directory, `slice-path-scope-` followed by six letters or digits, so two snapshots of the same state receive different references and records.

#### Scenario: Repository with one earlier user edit

- **WHEN** `snapshot` runs in a repository whose only modified file is `notes.txt`
- **THEN** the payload carries verdict `clean`, a `snapshot` reference matching `slice-path-scope-` plus six letters or digits, and `modified` equal to `notes.txt`

#### Scenario: Simultaneous snapshots do not collide

- **WHEN** `snapshot` runs twice against the same unchanged repository
- **THEN** the two references differ, each names its own `record.json` under the SAI temp root, and `verify` returns `clean` for both

### Requirement: The tool only reads the repository

The tool SHALL NOT mutate the repository: neither sub-command changes the working tree, the index, or HEAD, and each snapshot record SHALL be stored as `record.json` in a private directory (mode 0700 outside Windows) under the SAI temp root that `sai/tools/temp-root.js` resolves for the harness the tool is installed under, outside the repository.

#### Scenario: Snapshot and verify leave the repository untouched

- **WHEN** `snapshot` and then `verify` run against a repository
- **THEN** the `git status` output and HEAD are identical to their values before the two runs

### Requirement: Verify reports foreign changes

The `verify` sub-command SHALL read the slice paths from standard input, one repository-relative path per line, and SHALL report as `foreign` every path whose status or content changed since the snapshot and that lies outside the slice paths. A path that was already modified at the snapshot and is unchanged since SHALL NOT be foreign, and an already-modified path that is also a slice path SHALL count as a slice path.

#### Scenario: Change outside the slice paths

- **WHEN** `verify` receives the slice path `src/a.js` after `src/a.js`, `other/new.txt`, and the already-modified `notes.txt` all changed since the snapshot
- **THEN** `foreign` lists `notes.txt` and `other/new.txt`, the verdict is `mismatch`, and the exit code is 1

#### Scenario: Already-modified file left as it was

- **WHEN** `verify` receives the slice path `src/a.js` and the already-modified `notes.txt` is unchanged since the snapshot
- **THEN** `foreign` is empty

#### Scenario: Already-modified file that is a slice path

- **WHEN** `verify` receives the slice path `notes.txt` after the slice edited the already-modified `notes.txt`
- **THEN** the verdict is `clean`

### Requirement: Staging and committing count as changes

The `verify` sub-command SHALL treat a path staged or committed since the snapshot as changed.

#### Scenario: Path committed after the snapshot

- **WHEN** an already-modified path is staged and then committed after the snapshot and `verify` runs with an empty slice path list
- **THEN** `foreign` lists that path

### Requirement: Verify reports uncovered slice paths

When standard input carries a `---` line, `verify` SHALL treat the lines after it as the covering list and SHALL report as `uncovered` every slice path that lies outside that list. Without a `---` line, `uncovered` SHALL be empty and `cover_checked` SHALL be false.

#### Scenario: Covering list misses a slice path

- **WHEN** `verify` receives slice paths `src/a.js`, an archive directory, and a main spec file, followed by `---` and a covering list holding only the archive directory and `openspec/specs`
- **THEN** `uncovered` equals `src/a.js`, `cover_checked` is true, the verdict is `mismatch`, and the exit code is 1

#### Scenario: No covering list supplied

- **WHEN** `verify` receives slice paths and no `---` line
- **THEN** `cover_checked` is false and `uncovered` is empty

### Requirement: A listed directory stands for every path beneath it

In both the slice path list and the covering list, a listed directory SHALL match itself and every path beneath it, and SHALL NOT match a sibling path that merely shares its name prefix.

#### Scenario: Directory entry and a sibling with the same prefix

- **WHEN** the list holds `src` and the candidates are `src/a.js` and `src-old/a.js`
- **THEN** `src/a.js` is matched and `src-old/a.js` is not

### Requirement: Closed verdict vocabulary and exit codes

The tool SHALL emit exactly one of the verdicts `clean`, `mismatch`, or `n/a`. `verify` SHALL return `clean` when `foreign` and `uncovered` are both empty and `mismatch` when either holds a path. The verdict SHALL be `n/a`, with a `reason`, when no check is possible. The exit code SHALL be 0 for `clean` or `n/a`, 1 for `mismatch`, and 2 for a usage or IO error, and an error SHALL print no verdict.

#### Scenario: Outside a git repository

- **WHEN** `snapshot` runs in a directory that is not a git repository
- **THEN** the payload carries verdict `n/a`, snapshot `n/a`, reason `not-a-git-repository`, and the exit code is 0

#### Scenario: Verify with an n/a reference

- **WHEN** `verify` runs with `--snapshot n/a`
- **THEN** the payload carries verdict `n/a` with reason `snapshot-unavailable` and the exit code is 0

#### Scenario: Path that leaves the repository

- **WHEN** `verify` receives the line `../outside.txt` on standard input
- **THEN** the exit code is 2 and no verdict is printed

#### Scenario: Unknown snapshot reference

- **WHEN** `verify` runs with a well-formed reference that has no stored record
- **THEN** the exit code is 2 and no verdict is printed

### Requirement: The policy is the single source of the invocation

`sai/policies/slice-path-scope.md` SHALL be the single source of the tool invocation, the verify payload fields, and the commit coverage rule, and SHALL resolve the tool copy through `sai/policies/tool-resolution.md`. Route cards SHALL reference the policy and SHALL NOT restate the tool invocation.

#### Scenario: Route cards reference the policy

- **WHEN** `sai/commands/explore/direct-build-coordinator.md` and `sai/commands/archive/coordinator.md` are read
- **THEN** each references `@sai/policies/slice-path-scope.md` § Commit coverage and neither names `slice-path-scope.js`

### Requirement: Snapshot watches listed target paths

With `--targets`, the `snapshot` sub-command SHALL read target paths from standard input, one repository-relative path per line, and SHALL also record the content of everything at or beneath each target straight from the file system, whatever its git-ignore status. `verify` SHALL then report a target that was created, modified, or removed since the snapshot as a change. `--targets` SHALL be a `snapshot` flag only: `verify` with `--targets` SHALL be a usage error with exit code 2.

#### Scenario: An ignored target left untouched

- **WHEN** `snapshot --targets` lists a git-ignored path and `verify` runs with empty standard input after nothing changed
- **THEN** the verdict is `clean`

#### Scenario: An ignored target is created

- **WHEN** a git-ignored target path that was absent at `snapshot --targets` exists when `verify` runs with empty standard input
- **THEN** `foreign` lists that path and the verdict is `mismatch`

#### Scenario: Verify receives the targets flag

- **WHEN** `verify` runs with `--targets`
- **THEN** the exit code is 2 and no verdict is printed

### Requirement: The policy defines the foreign-change check and the no-effect check

`sai/policies/slice-path-scope.md` SHALL define two checks. The foreign-change check SHALL run `verify` with `slice_snapshot` and the slice paths, without a covering list, after a recovery attempt; a path in `foreign` is a repository file foreign to the slice that changed, and the caller reports those exact paths. The no-effect check SHALL take a `snapshot --targets` immediately before an execute order is sent, with every path the order may create, modify, move, or remove on standard input, and hold its reference as `order_snapshot` in conversation state; when the order fails, `verify` SHALL run with `order_snapshot` and empty standard input, where `clean` means the order had no effect, `mismatch` means it had an effect that `foreign` names, and `n/a` means the effect is unknown.

#### Scenario: A failed order changed nothing

- **WHEN** an execute order fails and `verify` with `order_snapshot` and empty standard input returns `clean`
- **THEN** the order had no effect

#### Scenario: A failed order changed a target

- **WHEN** an execute order fails after it created, modified, or removed one of its target paths
- **THEN** `verify` with `order_snapshot` returns `mismatch` and `foreign` names the changed path

### Requirement: Commit coverage returns a prepared-plan gap to the plan owner

`sai/policies/slice-path-scope.md` § Commit coverage SHALL state that an order bound to a prepared plan is not extended. For such an order, the coordinator SHALL run the coverage check on the prepared plan before any order, with the plan's owned paths as the covering list. While `uncovered` holds a path, the coordinator SHALL send the gap back to the plan's owner for a corrected plan and SHALL send no order. An `uncovered` path found at the order check SHALL also leave the order unchanged and return the gap to the plan's owner. The rule that adds uncovered paths to the order's owned paths and verifies again SHALL apply only to an order that no prepared plan binds.

#### Scenario: Gap in a prepared plan

- **WHEN** the coverage check on a prepared plan returns an `uncovered` path
- **THEN** the coordinator sends no order and returns the gap to the plan's owner for a corrected plan

#### Scenario: Gap found at the order check of a bound order

- **WHEN** the coverage check on an order bound to a prepared plan returns an `uncovered` path
- **THEN** the order stays unchanged and the gap returns to the plan's owner

#### Scenario: Order that no prepared plan binds

- **WHEN** the coverage check on an order that no prepared plan binds returns an `uncovered` path
- **THEN** the coordinator adds those paths to the order's owned paths and verifies again
