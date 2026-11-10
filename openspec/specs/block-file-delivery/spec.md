# block-file-delivery Specification

## Purpose
TBD - created by archiving change explore-block-file-emit. Update Purpose after archive.

## Requirements

### Requirement: Block and verdicts travel as files in a private transfer directory

`sai/policies/ready-to-propose-format.md` § Block and verdict delivery SHALL prescribe, for block registration, block amendment, and every `ready-to-propose.js check` call, on both Claude Code and opencode, that the block and its verdicts travel as files and that no block content passes through a shell command (no stdin pipe, heredoc, or here-string). It SHALL prescribe this order: run `transfer.js open --harness <claude|opencode>` to create one private directory under the SAI temp root; write the block set as UTF-8 to `<dir>/blocks.md`, exactly as it will be displayed, with the harness-native file-write tool (`Write` on Claude Code, `write` on opencode); run `ready-to-propose.js check --profile dispatchable --block-file <dir>/blocks.md`; write the verdicts as one JSON array to `<dir>/verdicts.json`, `[]` when no line is flagged, and run `check` again with `--verdicts-file` when verdicts exist; run `sai-state emit <id> explore-slice@1 --ready-to-propose [--amend <name>] --block-file <dir>/blocks.md --verdicts-file <dir>/verdicts.json`; and run `transfer.js close --dir <dir>` once the registration or amendment is recorded. It SHALL state that `transfer.js put` is not used for these files because it reads its content on stdin. When the directory cannot be opened or a file cannot be written, the emit or check SHALL stop and report the error, with no stdin fallback.

#### Scenario: A registration with no flagged line passes an empty verdicts file

- **WHEN** a session registers a block set whose `check` reports no flagged line
- **THEN** it writes `blocks.md` and a `verdicts.json` containing `[]` into its `transfer.js` directory with the native file-write tool and runs the emit with `--block-file` and `--verdicts-file`

#### Scenario: Unwritable block file stops without a stdin fallback

- **WHEN** the transfer directory cannot be opened or the block file cannot be written
- **THEN** the emit or check stops and reports the error, and no stdin delivery is attempted

### Requirement: Prescribed block checks pass the block as a file

Every `ready-to-propose.js check` call that the instructions prescribe for a block SHALL pass the block with `--block-file <path>` and SHALL add `--verdicts-file <path>` when judgment verdicts exist, letting the tool compose the `<<<VERDICTS>>>` line itself. This SHALL hold for the `ready-to-propose.js` entry of `sai/policies/tool-resolution.md`, the verdict delivery of `sai/policies/block-hygiene-judgment.md`, the format-validator comment of `sai/policies/ready-to-propose-format.md`, and the crystallization close.

#### Scenario: Tool resolution names the file form of check

- **WHEN** a reader consults the `ready-to-propose.js` entry of `sai/policies/tool-resolution.md`
- **THEN** it shows `check --profile loose|strict|dispatchable --block-file <path>` with `--verdicts-file <path>` when verdicts exist, and no stdin text for `check`

### Requirement: Explore writes block files only outside the repository

`sai/commands/explore/instructions.md` SHALL state that the one direct write of `/sai-explore` is the block file and verdicts file of a `Ready to Propose` registration, amendment, or check, written with the harness-native file-write tool into a private `transfer.js open` directory under the SAI temp root and never into the repository. `/sai-explore` SHALL otherwise create, modify, and delete no file. The `explore-command` capability profile in `sai/install-manifest.json` SHALL carry a write grant, whose scope by contract is that transfer directory.

#### Scenario: The explore command grants the native write tool

- **WHEN** the projected `sai-explore` Claude command is read
- **THEN** its allowed tools include `Write`, and its instructions confine that write to the private transfer directory outside the repository

### Requirement: Non-block deliveries keep stdin

Events that are not blocks SHALL travel per `sai/policies/stage-machine.md` § Event delivery. Identifier events, such as intents, recorded lists, and `step_ids`, SHALL travel as `sai-state emit` flags (`--set <field>=<id>`, repeatable `--add <field>=<id>`, `--set-path <field>="<path>"`). An event that holds free text or a path the flags reject, and a progress payload sent in its input form, SHALL travel as an input file: the JSON written with the harness-native file-write tool to a unique file in a `transfer.js open` directory and passed with `--input-file <path>`, with the stdin `-` form still accepted by the tool but not prescribed. `sai/commands/explore/steps/issue-intake.md` § Conversion SHALL describe the `ready-to-propose.js convert` input delivery itself: the issue text exactly as it entered the conversation, written as literal text with the harness-native file-write tool in a directory from `transfer.js open` and passed with `--input-file <path>`, with no heredoc, here-string, or stdin pipe.

#### Scenario: Conversion keeps its stdin delivery

- **WHEN** Explore runs `ready-to-propose.js convert` on an imported issue
- **THEN** it passes the issue text in an input file as `issue-intake.md` § Conversion describes, without citing the block emit delivery of `stage-machine.md`

#### Scenario: Explore intent travels as flags

- **WHEN** an Explore stage-event turn emits an intent to `explore-idea@1`
- **THEN** it sends `--set intent=<name>` with no input file
