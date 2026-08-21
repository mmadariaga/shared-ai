# change-picker Specification

## Purpose

The change-picker capability resolves a missing change name from the invocation envelope. A trimmed, non-empty `arguments_value` is authoritative; when it is empty, the capability uses the existing 0/1/N active-change picker.

## Requirements
### Requirement: Invocation envelope provides change-name authority

The change-picker SHALL use only the invocation envelope's `arguments_value` for direct change-name resolution. After trimming, a non-empty `arguments_value` SHALL be authoritative and SHALL pass through as the resolved change name without an OpenSpec query or user prompt. The `wrapper_echo_value` SHALL remain opaque invocation data, SHALL be forwarded unchanged with the envelope, and SHALL NOT be inspected as a change-name source. The change-picker SHALL NOT resolve a name from conversation history or require a labelled line.

#### Scenario: trimmed arguments value is authoritative
- **WHEN** a change-consuming `sai-*` command supplies an `arguments_value` whose trimmed value is non-empty
- **THEN** the change-picker resolves the trimmed value as the change name, performs no OpenSpec query or user prompt, and forwards the opaque `wrapper_echo_value` unchanged

#### Scenario: opaque wrapper value does not override arguments value
- **WHEN** both `arguments_value` and `wrapper_echo_value` are present
- **THEN** the trimmed `arguments_value` is selected and the `wrapper_echo_value` is not inspected for resolution

#### Scenario: no transcript or label is required
- **WHEN** a change-consuming `sai-*` command reaches the change-picker
- **THEN** resolution does not scan conversation history and does not require a labelled value

### Requirement: Invocation Trigger

The change-picker SHALL use the 0/1/N active-change picker only when `arguments_value` is empty after trimming. If `arguments_value` is empty or whitespace-only, the change-picker SHALL activate before any other command processing; the opaque `wrapper_echo_value` SHALL not suppress this fallback.

#### Scenario: arguments value is missing
- **WHEN** a change-consuming `sai-*` command supplies an empty or whitespace-only `arguments_value`
- **THEN** the change-picker activates and runs the existing 0/1/N active-change resolution

#### Scenario: empty arguments value with opaque wrapper data
- **WHEN** `arguments_value` is empty after trimming and `wrapper_echo_value` is non-empty
- **THEN** the change-picker still runs the existing 0/1/N resolution and forwards the opaque wrapper value unchanged

### Requirement: Consumer scope excludes sai-status

The shared `change-picker.md` instruction SHALL serve exactly the change-consuming `sai-*` commands that need only single-change resolution — `sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, and `sai-pr` (9 consumers). `sai-status` SHALL NOT be a consumer of `change-picker.md`; it resolves change names via the dedicated `status-picker` capability instead. This requirement changes no invocation-envelope precedence or 0/1/N fallback logic, so the 9 consumers stay behaviorally identical.

#### Scenario: consumer list enumerates 9 commands without sai-status
- **WHEN** the consumer list in `sai/policies/change-picker.md` is read
- **THEN** it enumerates the 9 change-consuming commands and does not include `sai-status`

#### Scenario: resolution logic unchanged for the 9 consumers
- **WHEN** the `change-picker.md` invocation-envelope and 0/1/N resolution steps are compared before and after this change
- **THEN** they are identical, and only the consumer enumeration differs
