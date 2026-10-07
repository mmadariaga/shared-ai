# merge-resolution-write Specification

## Purpose
TBD - created by archiving change merge-conflict-bundle-and-tool-write. Update Purpose after archive.

## Requirements

### Requirement: Tool-owned resolution write

The merge tool SHALL provide a `write` action that takes the snapshot's `--record <reference>` and `--record-hash <sha256>` and reads from standard input one `{"conflict_id", "text"}` object or an array of them. It SHALL splice each text into the region that `conflict_id` names and SHALL leave every byte outside the named regions as captured in the pre-write snapshot. The `write` action SHALL be the worker's only way to change an affected file. The write surface SHALL remain conflict regions and coordinator-named correction ranges, and the existing `resolution` check SHALL still validate every write.

#### Scenario: Regions are written separately or together

- **WHEN** the worker sends one region of a two-region file and then both regions in a later call
- **THEN** the first result lists the other region as `pending`, the second lists none, and the file holds both texts with the content outside the regions unchanged

#### Scenario: Region is rewritten

- **WHEN** the worker sends a `conflict_id` that was already written with a new text
- **THEN** the file holds the new text in that region

### Requirement: Encoding, BOM, and line endings come from the pre-write snapshot

The `write` action SHALL store resolved text with the encoding, byte-order mark, and line endings of the pre-write snapshot, whatever the text arrives with. It SHALL convert the text's line endings to the file's dominant line ending, SHALL drop a byte-order mark carried by the text, and SHALL keep the file's own byte-order mark at the start of a file that has one. The `resolution` check SHALL compute its expected bytes with the same conversion.

#### Scenario: CRLF file with a BOM keeps both

- **WHEN** a UTF-8 file with a BOM and CRLF line endings receives a first-line resolution whose text uses LF and carries its own BOM
- **THEN** the written file starts with one BOM and uses CRLF throughout, and the `resolution` check accepts the write from that same text

#### Scenario: LF file receives CRLF text

- **WHEN** a file with LF line endings receives resolved text with CRLF
- **THEN** the written file uses LF throughout

### Requirement: Rejected write places nothing

A `write` call SHALL be whole: when any item is invalid the call SHALL report `outcome: failure`, SHALL write no file, and SHALL record nothing. The tool MUST reject text that holds a conflict marker line, a `conflict_id` that matches no region in the snapshot, an item without text, a file whose encoding is undetermined, a snapshot whose HEAD, index, or operation identity is stale, and a record whose bytes do not match the supplied hash.

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
