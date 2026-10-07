# slice-path-scope Specification

## Purpose
Defines the read-only tool and policy that record the files already modified before a slice starts and verify a slice's paths against the working tree and a covering list.

## Requirements

### Requirement: Snapshot records the already-modified files

The `snapshot` sub-command of `sai/tools/slice-path-scope.js` SHALL record every path that `git status` reports as modified, with its status and content identity, together with HEAD, and SHALL return an opaque snapshot reference and the sorted list of recorded paths with verdict `clean`.

#### Scenario: Repository with one earlier user edit

- **WHEN** `snapshot` runs in a repository whose only modified file is `notes.txt`
- **THEN** the payload carries verdict `clean`, a 64-character hexadecimal `snapshot` reference, and `modified` equal to `notes.txt`

### Requirement: The tool only reads the repository

The tool SHALL NOT mutate the repository: neither sub-command changes the working tree, the index, or HEAD, and the snapshot record SHALL be stored in the OS temporary directory, outside the repository.

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

- **WHEN** `sai/commands/explore/steps/pipeline-direct-build.md` and `sai/commands/archive/coordinator.md` are read
- **THEN** each references `@sai/policies/slice-path-scope.md` § Commit coverage and neither names `slice-path-scope.js`
