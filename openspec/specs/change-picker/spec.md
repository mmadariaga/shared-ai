# change-picker Specification

## Purpose

The change-picker capability resolves a missing change name from the invocation envelope. A trimmed, non-empty `arguments_value` is authoritative; when it is empty, the capability uses the existing 0/1/N active-change picker.
## Requirements
### Requirement: Invocation envelope provides change-name authority

The change-picker SHALL use only the invocation envelope's `arguments_value` for direct change-name resolution. After trimming, a non-empty `arguments_value` SHALL be authoritative and SHALL pass through as the resolved change name without an OpenSpec query or user prompt. No wrapper-echo field exists in the active envelope, and the change-picker SHALL NOT resolve a name from conversation history or require a labelled line.

#### Scenario: trimmed arguments value is authoritative
- **WHEN** a change-consuming `sai-*` command supplies an `arguments_value` whose trimmed value is non-empty
- **THEN** the change-picker resolves the trimmed value as the change name and performs no OpenSpec query or user prompt

#### Scenario: no transcript or label is required
- **WHEN** a change-consuming `sai-*` command reaches the change-picker
- **THEN** resolution does not scan conversation history and does not require a labelled value

### Requirement: Invocation Trigger

The change-picker SHALL use the 0/1/N active-change picker only when `arguments_value` is empty after trimming. If it is empty or whitespace-only, the change-picker SHALL activate before any other command processing. There is no alternate wrapper-echo source that can suppress this fallback.

#### Scenario: arguments value is missing
- **WHEN** a change-consuming `sai-*` command supplies an empty or whitespace-only `arguments_value`
- **THEN** the change-picker activates and runs the existing 0/1/N active-change resolution

### Requirement: Consumer scope excludes sai-status

The shared `change-picker.md` instruction SHALL serve exactly the change-consuming `sai-*` commands that need only single-change resolution — `sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, and `sai-pr` (9 consumers). `sai-status` SHALL NOT be a consumer of `change-picker.md`; it resolves change names via the dedicated `status-picker` capability instead. The invocation-envelope precedence and the 0/1/N fallback SHALL remain behaviorally identical for those 9 consumers, and SHALL be decided by `sai/tools/change-picker.js` rather than re-derived in the instruction's prose.

#### Scenario: consumer list enumerates 9 commands without sai-status
- **WHEN** the consumer list in `sai/policies/change-picker.md` is read
- **THEN** it enumerates the 9 change-consuming commands and does not include `sai-status`

#### Scenario: resolution logic unchanged for the 9 consumers
- **WHEN** the resolution the 9 consumers obtain from `change-picker.md` is compared before and after the move to `sai/tools/change-picker.js`
- **THEN** the supplied-name precedence, the 0/1/N branches, the prompts, and the retry and decline semantics are identical, and only the location of the resolution differs

### Requirement: sai-1-spec is a conditional consumer
`sai-1-spec` SHALL fetch `sai/policies/change-picker.md` solely when its trimmed `arguments_value` is empty; a supplied name still selects an existing change to build on, and the picker SHALL never invent a new change. `sai-1-spec` sits outside the twelve-command consumer membership.

#### Scenario:
- **WHEN** `/sai-1-spec` is invoked with an empty arguments_value
- **THEN** the worker fetches the shared change-picker and applies its 0/1/N resolution, while a supplied name bypasses the picker entirely

