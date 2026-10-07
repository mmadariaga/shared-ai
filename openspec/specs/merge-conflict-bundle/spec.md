# merge-conflict-bundle Specification

## Purpose
TBD - created by archiving change merge-conflict-bundle-and-tool-write. Update Purpose after archive.

## Requirements

### Requirement: Conflict bundle command

The merge tool SHALL provide a read-only `bundle` action that takes the conflict snapshot's `--record <reference>` and `--record-hash <sha256>` and returns the conflict bundle built from that captured record. For every conflicted file the bundle SHALL carry the path, the file category, a `conflict_category`, the permitted `resolution`, the sides present, whether a whole-side checkout preserves Git-combined content, and each side's commit messages. For every conflict region of a `text` file the bundle SHALL carry the `conflict_id`, the starting line, and the decoded `ours`, `base`, and `theirs` versions, where `ours` and `theirs` denote git stages 2 and 3. The action SHALL write no file and SHALL save no receipt.

#### Scenario: Text conflict carries three versions and commit messages

- **WHEN** `bundle` runs on the snapshot of a merge with one conflicted UTF-8 text file
- **THEN** the file is reported as `text` with `regions-or-whole-side` resolution, its region carries the `ours`, `base`, and `theirs` text with the snapshot's `conflict_id`, and each side lists the commit subjects and bodies that touched the file

#### Scenario: Bundle reports the opposing commit

- **WHEN** `bundle` runs during a merge in progress
- **THEN** the bundle's `sides.theirs` equals `MERGE_HEAD` and `sides.ours` equals `HEAD`

### Requirement: Bounded region context

The bundle SHALL deliver each region with bounded context before and after it instead of the whole file. The context SHALL be 3 lines by default, SHALL be adjustable through `--context` with an integer from 0 to 20, and a value outside that range MUST be refused. The worker SHALL read more of a specific file only when a region's intent needs it.

#### Scenario: Default context excludes the rest of the file

- **WHEN** `bundle` runs without `--context` on a file with twelve unchanged lines on each side of the region
- **THEN** each region carries three lines before and three lines after, and the lines beyond them do not appear in the bundle

#### Scenario: Context outside the range is refused

- **WHEN** `bundle` is called with a context of 21 lines
- **THEN** the call fails and returns no bundle

### Requirement: Base version provenance

Each region SHALL state where its `base` version came from through `base_from`: `markers` when Git wrote the ancestor between the conflict markers, `mapped` when the tool derived it from the captured base stage by line alignment with the `ours` side, and `unavailable` when no base can be established, in which case `base` SHALL be null.

#### Scenario: Ancestor written by Git is taken from the markers

- **WHEN** the conflicted file carries diff3-style ancestor sections
- **THEN** the region's `base` is the ancestor text between the markers and `base_from` is `markers`

#### Scenario: Ancestor is mapped through earlier edits

- **WHEN** Git wrote no ancestor section and the current side added lines before the region
- **THEN** the region's `base` is the matching ancestor lines and `base_from` is `mapped`

#### Scenario: File added on both sides has no base

- **WHEN** both sides added the same path and no base stage exists
- **THEN** the region's `base` is null, `base_from` is `unavailable`, and `sides_present.base` is false

### Requirement: Whole-side-only conflict categories

A conflicted file with no text to compare SHALL appear in the bundle with its category and no content: `binary`, `deleted-on-one-side`, `renamed`, or `no-markers`. A file with conflict regions whose encoding the tool cannot determine safely SHALL appear as `encoding-undetermined`. The tool SHALL treat only UTF-8, with or without a byte-order mark, as a determined encoding. Every category other than `text` SHALL carry `resolution: whole-side-only`, an empty region list, and no encoding fields, and SHALL be resolved by a whole-side choice that the coordinator applies, or escalated.

#### Scenario: Binary, deleted, and renamed files carry no content

- **WHEN** a merge conflicts on a binary file, a file deleted on one side, and a file renamed differently on each side
- **THEN** the bundle reports them as `binary`, `deleted-on-one-side`, and `renamed`, each `whole-side-only` with no regions

#### Scenario: Undetermined encoding admits only a whole side

- **WHEN** a conflicted file with markers holds bytes that are not valid UTF-8
- **THEN** the bundle reports it as `encoding-undetermined` and `whole-side-only` with no regions

### Requirement: Bounded commit messages per side

The bundle SHALL list, for each side of each file, at most 20 commits that touched the file on that side, each with its abbreviated SHA, subject, and body. A longer history SHALL set `more: true`, and a body longer than 2000 characters SHALL be truncated and marked as truncated.

#### Scenario: Each side lists its own commits

- **WHEN** one commit on each branch changed the conflicted file since the merge base
- **THEN** the `ours` list holds the current branch's commit and the `theirs` list holds the selected branch's commit with its body

### Requirement: Bundle requires a valid conflicts snapshot

The `bundle` action MUST refuse a record whose bytes do not match the supplied hash, a snapshot whose HEAD, index, or operation identity no longer matches the repository, and a correction snapshot.

#### Scenario: Correction snapshot is refused

- **WHEN** `bundle` receives a correction snapshot instead of a conflicts snapshot
- **THEN** the call fails stating that a conflicts snapshot is required
