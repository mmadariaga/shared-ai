# opencode-config-message Specification

## Purpose

Define the parse-failure fallback message the installer prints when an existing opencode config cannot be parsed, realigned to permission verification.

## Requirements

### Requirement: opencode config fallback message SHALL use verification language

When an existing `opencode.json`/`opencode.jsonc` cannot be parsed as JSONC, `copyOpencodeConfig` MUST fall back to displaying a message instructing the user to verify that the SAI external-directory permission is properly configured — not to manually add an `agent` section. The message SHALL NOT contain an `agent` block snippet for `explore`, `executor`, or `budget`, SHALL NOT contain a `model` field or a "trusted low-cost model" comment, and SHALL NOT instruct the user to add agent entries. This message is the parse-failure fallback only; when the existing config parses successfully the permission is merged in place (see the `opencode-config-install` capability) and this message is not printed.

#### Scenario: parse-failure fallback — intro line

- **WHEN** `copyOpencodeConfig` detects an existing config that does not parse as JSONC
- **THEN** the printed intro line reads: `"Opencode config already exists at <base>. Verify that you have these settings properly configured:"`, where `<base>` is the resolved opencode config directory path
- **AND** the verification guidance names the SAI external-directory permission (`~/.config/opencode/sai/**`) as the setting to verify

#### Scenario: parse-failure fallback — no agent snippet or model comment

- **WHEN** the verification message is printed to the console as the fallback
- **THEN** it contains no `"agent"` block, no `model` field, and neither the wording `"Your trusted low-cost model below"` nor `"Put your trusted low-cost model here"` appears

#### Scenario: successful parse suppresses the message

- **WHEN** the existing config parses as JSONC and the SAI permission is merged in place
- **THEN** the verification message is NOT printed
