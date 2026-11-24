# backfill-unattended-intake Specification

## Purpose

TBD — created by archive sync of change unattended-backfill. Describe: pinned-label crystallized-block intake with three-step label → mine → ask field resolution.

## Requirements

### Requirement: Crystallized-block intake replaces intent capture

`/sai-backfill` SHALL detect a change document deterministically, never by inference. It SHALL write the request body, exactly as received, to a file in a private `transfer.js open` directory with the harness-native file-write tool and run `node <tool-path> check --document-file <path>`, where `<tool-path>` resolves `change-document.js` per `sai/policies/tool-resolution.md`. The tool SHALL read the document by its English headings (`Problem`, `Goal`, `Scope`, `Non-goals`, `Capabilities`, `Edge cases`, `Implementation notes`, `Out-of-scope implementation notes`, `Decisions`, `Alternatives considered`, `Trade-offs accepted`, `Research leads`, `Additional notes`, `Change`). A verdict with `"ok": true` SHALL make the command treat the document as supplied structured intent and SHALL NOT present the optional intent-capture choice; the hygiene judgment reflected in the exit code SHALL not gate a backfill, which reads the document as intent and never dispatches it. A verdict with `"ok": false` and a `RETIRED_FORMAT` violation SHALL mean the text is a `Ready to Propose` block: the command SHALL return a terminal `failed` result that says the format is retired and stop, never converting the block. Any other `"ok": false` verdict SHALL let the text fall through intact to the generic flow with no partial parsing; a paste with lost heading markers or a missing title line is not a document. On exit 2 the command SHALL report the tool failure and stop. When no tool candidate exists, the command SHALL name the tried paths and stop, with no prose fallback. The Direct Build prepare envelope SHALL carry `--document-file` and `--document-hash`, verified before any other work, and SHALL use the verified file as the document intake.

#### Scenario: Plain literals route to structured intake

- **WHEN** an invocation's request body is a change document whose title line and English section headings are intact
- **THEN** `change-document.js check` answers `"ok": true` on the document file, the intent-capture choice is never presented, and the flow proceeds directly into intent reconciliation with document-derived records

#### Scenario: Pinned labels route to structured intake

- **WHEN** the Direct Build prepare envelope carries a `--document-file` and `--document-hash` pair that verifies
- **THEN** the verified document is the intake, the intent-capture choice is never presented, and the flow proceeds directly into intent reconciliation with document-derived records

#### Scenario: Unlabeled paste falls through intact

- **WHEN** pasted text is not a change document and is not a `Ready to Propose` block
- **THEN** the check answers `"ok": false` and the command runs the generic flow unchanged, never partially parsing the text as a document

#### Scenario: Missing detector stops backfill

- **WHEN** no `change-document.js` candidate exists under the tool-resolution order
- **THEN** backfill names the tried paths and stops without detecting the document in prose

#### Scenario: Detector failure stops backfill

- **WHEN** `change-document.js` exits 2
- **THEN** backfill reports the tool failure and stops

#### Scenario: Retired block is rejected

- **WHEN** the request body is a `Ready to Propose` block
- **THEN** the check reports `RETIRED_FORMAT` and backfill returns a terminal `failed` result saying the format is retired, without converting the block

### Requirement: Consumed block fields resolve label then mined prose then ask

Every consumed document section SHALL resolve by existence alone, identically with and without `fast_track_active`: when its section exists the command SHALL skip that slot's question by existence, carrying the section value when it carries content and still skipping with no content fallback and no ask when it reads `None.`; otherwise it SHALL mine the answer from the surrounding pasted prose even off-format; otherwise it SHALL restore that question's ordinary ask channel in the interview phase. `Problem` SHALL answer Question 1, and `Trade-offs accepted` together with `Non-goals` SHALL answer Question 2, both required to skip it. Mined answers SHALL feed proposal prose only and never become normative requirements without qualifying evidence. The change name SHALL come from the `Change name:` line of `## Change` when the request body carries no explicit kebab-case name.

#### Scenario: Existing Why literal skips Question 1

- **WHEN** the document contains a `## Problem` section
- **THEN** "What problem does this solve?" is never presented and the section's value serves as the fixed answer

#### Scenario: Labeled Why answers Question 1 without asking

- **WHEN** the document's `## Problem` section carries content
- **THEN** "What problem does this solve?" is answered from that content and is never presented to the user

#### Scenario: Missing limitations fall through to the ask

- **WHEN** neither the `Trade-offs accepted` and `Non-goals` sections nor the surrounding prose yield an answer for "What are the known limitations or technical debt left behind?"
- **THEN** the command asks that question exactly as written, identically in manual and fast-track modes

### Requirement: Direct Build route produces metadata-declaring artifact set

The Direct Build (unattended) backfill route SHALL compose and deliver a draft artifact set that includes `openspec/changes/{name}/.openspec.yaml` in the canonical three-key form (schema, created as YYYY-MM-DD date only, backfilled: true), in addition to `proposal.md` and capability specs, enabling the archive gate to classify the change as backfilled and skip design, tasks, and implementation from the blocking CORE set.

#### Scenario: Metadata file joins backfill artifact set
- **WHEN** the Direct Build route executes its preparation phase (step 3) after the implementer completes with a staged diff
- **THEN** the returned draft set from the backfill worker includes `openspec/changes/{name}/.openspec.yaml` with exactly the three canonical keys

#### Scenario: Metadata file survives to execute order
- **WHEN** the spec-review phase (step 4) validates the returned draft set
- **THEN** the metadata file is accepted as part of the set and validated as the canonical form (schema: sai-workflow, created as YYYY-MM-DD only, backfilled: true)

#### Scenario: Unattended build changes can be archived without planning artifacts
- **WHEN** the archive gate evaluates a change produced by the Direct Build route and reads `backfilled: true` from `.openspec.yaml`
- **THEN** the change can be archived by the standalone path without requiring design, tasks, or implementation artifacts

### Requirement: Backfill copies Request Additional Notes verbatim into the proposal draft

When a detected change document carries an `## Additional notes` section with content, `/sai-backfill` SHALL copy that content byte-for-byte, without rewriting, summarizing, translating, or merging it, into a `## Request Additional Notes` section of the `proposal.md` draft. The section SHALL be placed after `## Impact` and before any `## Additional Notes` section. The section SHALL feed no intent record, fixed answer, or requirement. When the document has no such section, or no document was detected, the draft SHALL omit the section.

#### Scenario: Direct Build backfill carries the notes

- **WHEN** backfill composes a `proposal.md` draft from a detected document that carries `## Additional notes` content
- **THEN** the draft contains that content byte-for-byte in a `## Request Additional Notes` section after `## Impact`

#### Scenario: No field means no section

- **WHEN** backfill runs without a detected document, or with a document that carries no `## Additional notes` section
- **THEN** the `proposal.md` draft contains no `## Request Additional Notes` section

### Requirement: Out-of-scope implementation items never become intent items

When a change document is detected, `/sai-backfill` SHALL map only the items under the `Implementation notes` section onto intent items. Items under `Out-of-scope implementation notes` SHALL be non-normative context and SHALL NOT become intent items.

#### Scenario: Out-of-scope items are excluded from reconciliation

- **WHEN** a detected document lists items under `## Out-of-scope implementation notes`
- **THEN** those items are not classified as intent items and never appear as `stated-but-unevidenced` items or as normative requirements in the drafts

### Requirement: The no-specs composer reads a change document

`sai/tools/backfill-no-specs.js compose` SHALL take `--document-file <path> --document-hash <sha256> --change-name <name> --transfer-dir <dir>`, verify the document against its hash, and derive the `.openspec.yaml` and `proposal.md` drafts from the document's sections: `Goal` and the `Implementation notes` items for What Changes, `Problem` for Why, `Capabilities`, `Edge cases`, `Scope`, and `Non-goals` as listed context, `Decisions` under `## Additional Notes`, `Research leads` paths for the impact, and `## Additional notes` copied into `## Request Additional Notes`. It SHALL take `backlog_origin`, `explore_origin`, and the `Specs: none — <reason>` declaration from the `## Change` lines. A list item reading `None`, `None.`, or `N/A` SHALL count as no item. Missing `--document-file`, `--document-hash`, `--change-name`, or `--transfer-dir` SHALL be an error naming the expected flags.

#### Scenario: No-specs document composes both drafts

- **WHEN** the Direct Build route runs `backfill-no-specs.js compose` on a verified document whose `## Change` section declares `Specs: none — <reason>`
- **THEN** the tool writes the `.openspec.yaml` and `proposal.md` drafts derived from the document's sections into the transfer directory

#### Scenario: Retired block flags are refused

- **WHEN** `backfill-no-specs.js compose` is called with `--block-file` and `--block-hash` instead of `--document-file` and `--document-hash`
- **THEN** it fails with an error naming the expected document flags and writes no draft
