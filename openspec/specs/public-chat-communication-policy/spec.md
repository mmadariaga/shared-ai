# public-chat-communication-policy Specification

## Purpose

TBD - created by archiving change add-public-chat-communication-policy. Update Purpose after archive.

## Requirements

### Requirement: Covered explanatory messages MUST follow the public-chat policy

The public-chat policy SHALL govern explanatory text authored by coordinators, utility commands, and workers through returned `question`, `message`, and `summary` fields. It SHALL require plain wording, relevant context, brief explanations of non-obvious references, and a clear purpose.

#### Scenario: A worker returns user-facing explanatory text

- **WHEN** a worker returns a question, message, or summary that a coordinator presents to the user
- **THEN** the text MUST follow the shared plain-language and context rules while worker reasoning remains outside public-chat scope

### Requirement: Shared protocol layers MUST load the public-chat policy

The command-runner and worker-core contracts SHALL load `sai/policies/public-chat.md` as the shared source for coordinator, utility-command, and worker-authored explanatory chat text across Claude Code and opencode.

#### Scenario: A shared protocol contract is consumed

- **WHEN** the command-runner or worker-core contract is loaded
- **THEN** the consuming surface MUST receive the same harness-neutral public-chat policy without copying its rules into individual command cards

### Requirement: Required protocol content MUST remain unchanged

The public-chat policy SHALL adapt explanatory prose only and MUST preserve fixed literals, required notices, technical formats, machine-readable content, identifiers, tokens, picker options, panel labels, code, persistent artifacts, and user-requested verbatim text.

#### Scenario: Explanatory prose contains a required fragment

- **WHEN** a visible message mixes explanatory wording with required protocol text
- **THEN** only the explanatory wording MAY be adapted and the required fragment MUST remain unchanged
