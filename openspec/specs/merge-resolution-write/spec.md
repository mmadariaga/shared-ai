# merge-resolution-write Specification

## Purpose
TBD - created by archiving change merge-conflict-bundle-and-tool-write. Update Purpose after archive.

## Requirements

### Requirement: Tool-owned resolution write

The merge tool SHALL provide a `write` action that takes the snapshot's `--record <reference>` and `--record-hash <sha256>` and reads one region entry or an array of them, from the file named by `--input` or from standard input. Each entry SHALL name a `conflict_id` and carry exactly one of `text`, the region's authored replacement, or `segments`, an ordered non-empty list of pieces in which each piece is `{"side": "ours"}`, `{"side": "theirs"}`, `{"side": "base"}`, or `{"text": "<literal text>"}`. The tool SHALL compose a `segments` entry by copying each side piece from the snapshot's decoded conflict sides, the same versions `bundle` returns, and concatenating the pieces in order with nothing between them. Composed text SHALL be handled exactly like authored text for markers, encoding, byte-order mark, and line endings. The tool SHALL splice each region's text into the region that `conflict_id` names and SHALL leave every byte outside the named regions as captured in the pre-write snapshot. The `write` action SHALL be the worker's only way to change an affected file. The write surface SHALL remain conflict regions and coordinator-named correction ranges, and the existing `resolution` check SHALL still validate every write, composing a region the apply report carries as `segments` again from the snapshot.

#### Scenario: Regions are written separately or together

- **WHEN** the worker sends one region of a two-region file and then both regions in a later call
- **THEN** the first result lists the other region as `pending`, the second lists none, and the file holds both texts with the content outside the regions unchanged

#### Scenario: Region is rewritten

- **WHEN** the worker sends a `conflict_id` that was already written with a new text
- **THEN** the file holds the new text in that region

#### Scenario: Region composed from both sides keeps non-ASCII bytes

- **WHEN** the worker sends a region as `segments` naming `ours`, a separator `text` piece, and `theirs`, and the sides hold non-ASCII characters such as U+2014
- **THEN** the region holds the two sides' bytes joined by the separator, unchanged, and the `resolution` check accepts an apply report carrying the same `segments`

### Requirement: Encoding, BOM, and line endings come from the pre-write snapshot

The `write` action SHALL store resolved text with the encoding, byte-order mark, and line endings of the pre-write snapshot, whatever the text arrives with. It SHALL convert the text's line endings to the file's dominant line ending, SHALL drop a byte-order mark carried by the text, and SHALL keep the file's own byte-order mark at the start of a file that has one. The `resolution` check SHALL compute its expected bytes with the same conversion.

#### Scenario: CRLF file with a BOM keeps both

- **WHEN** a UTF-8 file with a BOM and CRLF line endings receives a first-line resolution whose text uses LF and carries its own BOM
- **THEN** the written file starts with one BOM and uses CRLF throughout, and the `resolution` check accepts the write from that same text

#### Scenario: LF file receives CRLF text

- **WHEN** a file with LF line endings receives resolved text with CRLF
- **THEN** the written file uses LF throughout

### Requirement: Rejected write places nothing

A `write` call SHALL be whole: when any item is invalid the call SHALL report `outcome: failure`, SHALL write no file, and SHALL record nothing. The tool MUST reject text that holds a conflict marker line, a `conflict_id` that matches no region in the snapshot, an item with neither text nor segments, an item with both, an empty or malformed segment list, a segment that names an unknown side or a side absent from that region (including `base` when the region has no base version), a file whose encoding is undetermined, a snapshot whose HEAD, index, or operation identity is stale, and a record whose bytes do not match the supplied hash.

#### Scenario: Conflict markers are rejected

- **WHEN** the resolved text for a region contains a conflict marker line
- **THEN** the call fails naming the region and the file is unchanged

#### Scenario: Unknown region is rejected

- **WHEN** an item names a `conflict_id` outside the snapshot, including a region of a whole-side-only file
- **THEN** the call fails with an unknown-region error and no file is written

#### Scenario: One invalid item rejects the whole call

- **WHEN** a call carries one valid item and one item with an unknown region
- **THEN** nothing is written, the valid item included

#### Scenario: Undetermined encoding is rejected

- **WHEN** the worker sends text for a region of a file whose encoding is undetermined
- **THEN** the call fails stating that only a whole-side choice is admitted and the file is unchanged

#### Scenario: Changed record hash is refused

- **WHEN** `write` receives a record hash that does not match the record's bytes
- **THEN** the call exits with a collection error and the file is unchanged

#### Scenario: Absent base side is rejected

- **WHEN** a `segments` entry names `base` for a region whose bundle reports `base_from: unavailable`
- **THEN** the call fails naming the absent side and the region, and no file is written

#### Scenario: Entry with both forms is rejected

- **WHEN** an entry carries both `text` and `segments`
- **THEN** the call fails stating that exactly one form is admitted, and no file is written

### Requirement: Write ledger protects against outside changes

The `write` action SHALL keep a ledger of every text placed so far beside the snapshot record, as `<record>.writes.json`, and SHALL rebuild each file from the protected pre-write content plus the ledger. Before writing a file it MUST verify that the working file equals the pre-write content with the ledger's texts applied, and it MUST reject the call when anything but the tool changed that file. A rejected call SHALL NOT create or update the ledger.

#### Scenario: Outside change stops the next write

- **WHEN** a file the tool wrote is changed by something else and the worker sends another region of that file
- **THEN** the call fails stating that the file changed outside the tool and the file keeps the outside change

### Requirement: Write serves coordinator-named correction ranges

The `write` action SHALL accept a correction snapshot's reference and hash, in which each `conflict_id` names an authorized byte range of the current file, and SHALL splice the corrected text into exactly that range.

#### Scenario: Correction after staging

- **WHEN** a resolved file is staged, the coordinator captures a correction snapshot for one range, and the worker sends corrected text with that snapshot's reference
- **THEN** the file holds the corrected text in that range and nothing else changes

### Requirement: Standard input tolerates shell text encodings

The merge tool SHALL decode JSON on standard input as UTF-8 with or without a byte-order mark, and as UTF-16 when the input starts with a UTF-16 byte-order mark.

#### Scenario: UTF-16 input from the shell is accepted

- **WHEN** `write` receives its JSON as UTF-16 little-endian with a byte-order mark
- **THEN** the call succeeds and places the text

### Requirement: Write payload from a file

The `write` action SHALL accept `--input <payload-file>` as the alternative to standard input and SHALL decode that file as UTF-8 with or without a byte-order mark, rejecting an invalid UTF-8 byte as an error rather than replacing it. `--input` SHALL apply to `write` only. When `--input` is given, the tool MUST NOT read standard input, and it SHALL treat standard input as a competing payload only when it is a non-empty regular file, which is a usage error; a pipe, socket, device, or terminal on standard input SHALL be ignored. Payloads on standard input SHALL keep working when `--input` is absent.

#### Scenario: Payload file with non-ASCII text is placed byte for byte

- **WHEN** the worker writes a UTF-8 payload file holding U+2014 characters and calls `write --input <file>`
- **THEN** the region holds the U+2014 characters unchanged

#### Scenario: Open silent pipe does not block the call

- **WHEN** `write --input <file>` runs with standard input attached to a pipe that stays open and sends nothing
- **THEN** the call completes from the payload file without reading standard input

#### Scenario: Payload on both channels is a usage error

- **WHEN** `write --input <file>` runs with a non-empty regular file redirected to standard input
- **THEN** the call fails as a usage error and no file is written

### Requirement: Resolution rejection names the first difference

When the `resolution` check finds that an authored file differs from the expected resolution, its error SHALL name the first differing byte offset and the expected and actual characters at that offset as code points, such as `U+2014` and `U+003F`, reporting `end of file` when one side ends there and the byte itself when it is not valid UTF-8.

#### Scenario: Replaced em dash is located

- **WHEN** an apply report's region text holds U+2014 and the working file holds `?` in its place
- **THEN** the rejection names the byte offset of that character, expected `U+2014`, and found `U+003F`
