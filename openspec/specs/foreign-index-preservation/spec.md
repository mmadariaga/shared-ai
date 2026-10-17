# foreign-index-preservation Specification

## Purpose
TBD - created by archiving change archive-foreign-index-preservation. Update Purpose after archive.

## Requirements

### Requirement: One shared rule keeps foreign index entries out of a slice commit

SAI SHALL define in `sai/policies/foreign-index-preservation.md` the single rule that keeps index entries staged before a slice out of that slice's commit and gives them back afterwards, and both apply and archive SHALL follow it. An owned path is a path that belongs to the slice being committed, a directory standing for every path beneath it; a foreign entry is an index entry already staged when the slice started that is not an owned path. Before the slice stages anything, the staged entries SHALL be listed with `git diff --cached --name-only -z --no-renames`, and every listed path that is not an owned path SHALL be a foreign entry. An owned path SHALL stay staged and enter the commit, even when it was staged before the slice. The foreign entries SHALL be unstaged with `git reset -q -- <foreign paths>`, which changes the index only and keeps every working-tree byte, before the slice stages and commits its own paths.

#### Scenario: A pre-staged owned path enters the commit

- **WHEN** the index holds an owned path and a foreign entry, both staged before the slice started
- **THEN** only the foreign entry is set aside, and the owned path stays staged and enters the slice commit

#### Scenario: Set-aside leaves the working tree unchanged

- **WHEN** foreign entries are set aside before the slice stages its paths
- **THEN** they are removed from the index only, and their working-tree content is unchanged

### Requirement: The set-aside is recorded before any unstaging

Before any unstaging, the record SHALL be written to the file that `git rev-parse --git-path sai-foreign-index` prints, one line per foreign entry carrying the path, its staged mode and object id from `git ls-files -s -z -- <path>` (or `deleted` for a staged deletion), and its entry in `HEAD` (or `absent`). A record that already exists SHALL NOT be overwritten: it is a pending restore, which SHALL be run first, and a failure of that restore SHALL stop the run.

#### Scenario: An existing record is never overwritten

- **WHEN** a run begins its set-aside and a record from an earlier run already exists
- **THEN** it runs the restore of that record first, never overwrites it, and stops when that restore fails

### Requirement: Restore verifies every entry and never overwrites a changed one

After the commit, or at the end of any stopped run, the restore SHALL check every record line before it changes anything: the current index entry of each path MUST still equal the line's recorded `HEAD` entry. When every line matches, it SHALL give each entry back with `git update-index --add --cacheinfo <mode>,<object id>,<path>`, or `git update-index --force-remove -- <path>` for a recorded deletion, and SHALL then delete the record. When any line no longer matches, it SHALL restore nothing, keep the record, and report the exact paths that differ, and it MUST NEVER overwrite, merge, or discard an entry that changed after it was set aside.

#### Scenario: Every entry still matches

- **WHEN** the restore runs and every recorded path's current index entry equals its recorded `HEAD` entry
- **THEN** every foreign entry is staged again with its recorded mode and object id, or removed again for a recorded deletion, and the record is deleted

#### Scenario: A foreign entry changed after set-aside

- **WHEN** the restore runs and at least one recorded path's current index entry no longer equals its recorded `HEAD` entry
- **THEN** no entry is restored, the record stays on disk, and the exact differing paths are reported

### Requirement: A pending record is restored first on recovery

A record on disk SHALL mean that a restore is pending. Any run that finds one SHALL restore it first, before a new order, a no-effect check, or any other action. The restore SHALL be the same whether the commit happened or not and SHALL be repeatable, so an interruption between the commit and the restore leaves the record in place and the next restore completes it; the foreign entries stay set aside until then.

#### Scenario: The run stops between the commit and the restore

- **WHEN** a run created the slice commit and stopped before restoring the foreign entries
- **THEN** the next run that finds the record restores the foreign entries before any other action, or stops and reports without overwriting anything when an entry no longer matches

### Requirement: Apply and archive each realize the shared rule

The archive worker SHALL follow the rule's steps itself in its Direct Build (unattended) execute continuation, between the CLI archive and the staging of its owned paths. Apply SHALL realize the same rule through `apply-step.js restore-unrelated-index`, where the guard's mixed reset is its set-aside and its immutable baseline is its record, verifying that the unrelated content is unchanged before it restores any entry and stopping with work preserved when restoration fails.

#### Scenario: Both commands reference one rule

- **WHEN** the apply coordinator restores initial unrelated index entries or the archive worker sets aside and restores foreign entries
- **THEN** both act under `sai/policies/foreign-index-preservation.md` and no second copy of the rule exists
