# public-chat-communication-policy Specification

## Purpose

Sets how coordinators, utility commands, and workers word the explanatory text a user reads in the conversation, while required protocol text stays byte-for-byte.

## Requirements

### Requirement: Covered explanatory messages MUST follow the public-chat policy

The public-chat policy SHALL govern explanatory text authored by coordinators, utility commands, and workers through returned question, message, and summary fields, including when authoring worker fields, and the presenting coordinator SHALL forward those fields unchanged. It SHALL require plain wording, relevant context, definitions of specialized terms before use, and a clear purpose, while worker reasoning, worker session text, payloads, code, paths, panel labels, and persistent artifacts SHALL remain outside its scope.

#### Scenario: A worker returns user-facing explanatory text

- **WHEN** a worker returns a question, message, or summary that a coordinator presents to the user
- **THEN** the text follows the shared plain-language, terminology, and context rules while worker reasoning remains outside public-chat scope

### Requirement: Shared protocol layers MUST load the public-chat policy

The command-runner and worker-core contracts SHALL load `sai/policies/public-chat.md` as the shared source for coordinator, utility-command, and worker-authored explanatory chat text across Claude Code and opencode.

#### Scenario: A shared protocol contract is consumed

- **WHEN** the command-runner or worker-core contract is loaded
- **THEN** the consuming surface MUST receive the same harness-neutral public-chat policy without copying its rules into individual command cards

### Requirement: Required protocol content MUST remain unchanged

The public-chat policy SHALL adapt explanatory prose only and MUST preserve fixed messages and literals, STOP messages, required notices, text the user asked to keep verbatim, technical formats, machine-readable content, lifecycle statuses, payload fields, identifiers, tokens, picker options and their order, panel labels and other harness-owned labels, code, paths, technical payloads, and persistent artifacts. When a message mixes explanatory prose with required protocol text, only the prose around it MAY be adapted, and where exact protocol wording conflicts with clarity rules the protocol wording SHALL win.

#### Scenario: Explanatory prose contains a required fragment

- **WHEN** a visible message mixes explanatory wording with required protocol text
- **THEN** only the explanatory wording is adapted and the required fragment remains unchanged

### Requirement: Visible terminology definitions MUST precede specialized use

The public-chat policy SHALL require a visible Terminology section before the main explanation when a message introduces any specialized, internal, or potentially ambiguous term. Each such term SHALL receive one short definition in plain language before its first meaningful use in that explanation, and the defined term SHALL be used consistently without confusing synonyms. A message with no specialized, internal, or potentially ambiguous terms MAY omit the Terminology section. The section SHALL NOT rename, rewrite, or replace required technical text, and a required literal that must appear before the section SHALL be preserved exactly.

#### Scenario: Specialized term triggers a terminology block

- **WHEN** an explanatory message introduces a specialized term that affects comprehension
- **THEN** a visible Terminology section defines the term in plain language before the main explanation uses it

### Requirement: Explanatory prose MUST follow a controlled plain-language profile

Explanatory prose SHALL use an ASD-STE100-inspired profile without claiming formal ASD-STE100 compliance. It SHALL prefer familiar precise words, short direct sentences, one main idea per sentence, active voice with a clear actor and action, and concrete next steps, and SHALL avoid unnecessary abbreviations, vague references, and ambiguous words. Necessary technical terms SHALL be kept and defined under Terminology when they matter. The explanation SHALL be written in the user's language with these clarity rules adapted to that language, while required technical literals SHALL remain unchanged.

#### Scenario: Explanatory prose follows the plain-language profile

- **WHEN** a coordinator or worker authors user-facing explanatory text
- **THEN** the prose uses short direct sentences in the user's language while preserving every required literal unchanged

### Requirement: Policy wording MUST NOT grant write authorization

The public-chat policy SHALL govern wording only and SHALL NOT authorize file writes in Explore nor change any command's write scope.

#### Scenario: Explore stays read-only under the policy

- **WHEN** an Explore session presents explanatory text under this policy
- **THEN** the read-only contract remains authoritative and no write is authorized by the policy
