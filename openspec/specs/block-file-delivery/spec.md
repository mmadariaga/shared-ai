# block-file-delivery Specification

## Purpose
TBD - created by archiving change explore-block-file-emit. Update Purpose after archive.

## Requirements

### Requirement: Block and verdicts travel as files in a private transfer directory

For change document registration, amendment, and every `change-document.js check` call, on both Claude Code and opencode, each change document and its verdicts SHALL travel as files and no document content SHALL pass through a shell command (no stdin pipe, heredoc, or here-string). The session SHALL run `transfer.js open --harness <claude|opencode>` to create one private directory under the SAI temp root; write each document of the set, exactly as it will be displayed, to its own file there with the harness-native file-write tool (`Write` on Claude Code, `write` on opencode); run `change-document.js check --document-file <path>` on each file (with `--slice` for a member of a slice set); write each document's verdicts as one JSON array to its own verdicts file, `[]` when no line is flagged; and register the set with one `sai-state emit <id> explore-slice@1 --document-file <path> [--verdicts-file <path>] [--document-file <path> [--verdicts-file <path>] ...]` call in display order, each verdicts file belonging to the document file named before it, or amend one document with `sai-state emit <id> explore-slice@1 --amend <name> --document-file <path> [--verdicts-file <path>]`. The emit SHALL store `{text, hash, verdicts}` per change name. An amendment that changes only the `Backlog origin:` or `Explore origin:` lines of `## Change` SHALL answer `amend_kind: "metadata"`, and any other change `amend_kind: "content"`. A verdicts file with no document file before it, or an amendment with more than one document, SHALL be refused with no transition. When the directory cannot be opened or a file cannot be written, the emit or check SHALL stop and report the error, with no stdin fallback.

#### Scenario: A registration with no flagged line passes an empty verdicts file

- **WHEN** a session registers a document set whose checks report no flagged line
- **THEN** it writes each document file and a verdicts file containing `[]` into its `transfer.js` directory with the native file-write tool and runs one emit with a `--document-file` and `--verdicts-file` pair per document

#### Scenario: Unwritable block file stops without a stdin fallback

- **WHEN** the transfer directory cannot be opened or a document file cannot be written
- **THEN** the emit or check stops and reports the error, and no stdin delivery is attempted

#### Scenario: Origin-only amendment is metadata-only

- **WHEN** an amended document differs from the stored one only in its `Backlog origin:` or `Explore origin:` line of `## Change`
- **THEN** the emit answers `amend_kind: "metadata"` and, when the machine accepts the amendment, stores the amended text and its new hash for that slice

### Requirement: Prescribed block checks pass the block as a file

Every `change-document.js check` call that the instructions prescribe for a change document SHALL pass the document with `--document-file <path>` and SHALL add `--verdicts-file <path>` when judgment verdicts exist. This SHALL hold for the verdict delivery of `sai/policies/block-hygiene-judgment.md`, the crystallization close, and the `/sai-1-spec` intake. `sai/policies/tool-resolution.md` SHALL carry no `change-document.js` invocation form of its own. A whole slice set SHALL be checked with `change-document.js check-set` and one `--document-file <path>` per document.

#### Scenario: Tool resolution names the file form of check

- **WHEN** a reader consults `sai/policies/tool-resolution.md` for `change-document.js`
- **THEN** it carries no `change-document.js` invocation form and states that the tool always prints one JSON verdict and takes no `--cwd`

### Requirement: Explore writes block files only outside the repository

`sai/commands/explore/instructions.md` SHALL state that the one direct write of `/sai-explore` is the document file and verdicts file of a change document registration, amendment, or check, written with the harness-native file-write tool into a private `transfer.js open` directory under the SAI temp root and never into the repository. `/sai-explore` SHALL otherwise create, modify, and delete no file. The `explore-command` capability profile in `sai/install-manifest.json` SHALL carry a write grant, whose scope by contract is that transfer directory.

#### Scenario: The explore command grants the native write tool

- **WHEN** the projected `sai-explore` Claude command is read
- **THEN** its allowed tools include `Write`, and its instructions confine that write to the private transfer directory outside the repository

### Requirement: Non-block deliveries keep stdin

Events that are not change documents SHALL travel per `sai/policies/stage-machine.md` § Event delivery. Identifier events, such as intents, recorded lists, and `step_ids`, SHALL travel as `sai-state emit` flags (`--set <field>=<id>`, repeatable `--add <field>=<id>`, `--set-path <field>="<path>"`). An event that holds free text or a path the flags reject, and a progress payload sent in its input form, SHALL travel as an input file: the JSON written with the harness-native file-write tool to a unique file in a `transfer.js open` directory and passed with `--input-file <path>`, with the stdin `-` form still accepted by the tool but not prescribed. `sai/commands/explore/steps/issue-intake.md` SHALL describe the `change-document.js sections` input delivery itself: the issue text exactly as it entered the conversation, written as literal text with the harness-native file-write tool in a directory from `transfer.js open` and passed with `--input-file <path>`, with no heredoc, here-string, or stdin pipe.

#### Scenario: Conversion keeps its stdin delivery

- **WHEN** Explore runs `change-document.js sections` on an imported issue
- **THEN** it passes the issue text in an input file as `issue-intake.md` describes, without citing the document emit delivery of `stage-machine.md`

#### Scenario: Explore intent travels as flags

- **WHEN** an Explore stage-event turn emits an intent to `explore-idea@1`
- **THEN** it sends `--set intent=<name>` with no input file
