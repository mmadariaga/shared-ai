# envelope-only-card-resolution Specification

## Purpose

Define envelope-owned input resolution for the apply, archive, PR, and status cards.

## Requirements
### Requirement: Four fetched cards consume the invocation envelope

The fetched `apply`, `archive`, `pr`, and `status` cards SHALL read their request from the boot-provided `arguments_value` field under either supported harness rather than relying on `$ARGUMENTS` substitution inside the fetched card. They SHALL preserve the existing command-local parsing and downstream instruction order after replacing the input reference.

#### Scenario: Apply and archive receive arguments from any supported harness

- **WHEN** a supported harness boot adapter selects the apply or archive card with a non-empty `arguments_value`
- **THEN** the selected card uses that value for its prerequisite, fast-track, picker, and downstream request handling without scanning conversation history or requiring a substituted `$ARGUMENTS` token

#### Scenario: Claude archive uses arguments_value instead of card substitution

- **WHEN** Claude Code invokes `/sai-archive oauth2-auth --fast-track`
- **THEN** the archive card consumes the forwarded `arguments_value`, parses the flag from that value, and does not depend on `$ARGUMENTS` substitution inside the fetched card

#### Scenario: PR and status receive arguments from any supported harness

- **WHEN** a supported harness boot adapter selects the PR or status card with a non-empty `arguments_value`
- **THEN** the selected card uses that value for change-name resolution and preserves the existing PR parent-branch behavior or status panel behavior respectively

### Requirement: Empty envelope arguments retain picker behavior

When `arguments_value` is empty, the four cards SHALL fall through to their existing picker path; `wrapper_echo_value` alone SHALL not suppress that fallback. The shared 0/1/N behavior, prompt wording, CLI-order options, confirmation and decline semantics, and unbounded invalid-input re-prompt behavior SHALL remain unchanged. The status card SHALL retain its dedicated 2+ "See all" branch and its `> BULK-MODE ACTIVE` signal.

#### Scenario: Empty arguments select through the standard picker

- **WHEN** one of the four cards receives an empty `arguments_value`
- **THEN** it invokes the applicable picker with the existing zero, one, or multiple-change behavior and does not fail merely because `$ARGUMENTS` is unavailable in the fetched card

#### Scenario: Status bulk selection is preserved

- **WHEN** the status card receives an empty `arguments_value` and `openspec list --json` returns two or more changes
- **THEN** "See all" is the first option, selecting it prints `> BULK-MODE ACTIVE`, and the status card renders the existing bulk table instead of a single-change panel

### Requirement: Command-owned flag parsing remains before resolution

The apply and archive cards SHALL continue to parse and remove their supported `--fast-track` token from `arguments_value` before invoking the picker, preserving the existing banner and gate behavior. The archive card SHALL NOT perform the retired post-picker `--fast-track` strip; the cleaned envelope request is the sole input to archive resolution after its normal pre-picker parse.

#### Scenario: Archive fast-track is cleaned before the picker

- **WHEN** archive receives a request containing a change name and `--fast-track` in `arguments_value`
- **THEN** archive activates fast-track, removes the token before picker resolution, and does not run a second post-picker cleanup pass

#### Scenario: Apply fast-track behavior is otherwise unchanged

- **WHEN** apply receives `--fast-track` through `arguments_value`
- **THEN** apply preserves its existing normalized signal, banner, authorization, branch, and human-verification behavior while using the cleaned request downstream

### Requirement: The supported boot envelopes remain two-source and opaque

The supported harness boot adapters SHALL continue to forward `wrapper_echo_value` and `arguments_value` byte-for-byte, and this change SHALL NOT remove either field. The four cards and picker policies SHALL use `arguments_value` authoritatively and SHALL not recover a change name by scanning parent conversation history or by depending on a trailing wrapper label line.

#### Scenario: Opencode fields remain available without a label line

- **WHEN** an opencode wrapper invokes one of the four cards after the wrapper-label removal
- **THEN** the `InvocationEnvelope` still contains `wrapper_echo_value` and `arguments_value`, the card receives both unchanged, and the picker resolves from the cleaned `arguments_value` rather than the wrapper field

#### Scenario: Claude fields remain available without card interpolation

- **WHEN** a Claude Code wrapper invokes one of the four cards
- **THEN** the `InvocationEnvelope` still contains `wrapper_echo_value` and `arguments_value`, the card consumes `arguments_value`, and no fetched-card `$ARGUMENTS` substitution is required
