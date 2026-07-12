## MODIFIED Requirements

### Requirement: opencode config fallback message SHALL use verification language

When an existing `opencode.json`/`opencode.jsonc` cannot be parsed as JSONC, `copyOpencodeConfig` MUST fall back to displaying a message instructing the user to verify that the agent settings are properly configured — not to manually add a section. This message is the parse-failure fallback only; when the existing config parses successfully the agent block is merged in place (see the `opencode-config-install` capability) and this message is not printed.

#### Scenario: parse-failure fallback — intro line

- **WHEN** `copyOpencodeConfig` detects an existing config that does not parse as JSONC
- **THEN** the printed intro line reads: `"Opencode config already exists at <base>. Verify that you have these settings properly configured:"`, where `<base>` is the resolved opencode config directory path

#### Scenario: parse-failure fallback — inline comment wording

- **WHEN** the agent config snippet is printed to the console as the fallback
- **THEN** the comment above each `model` field reads: `"// Your trusted low-cost model below"`
- **THEN** the previous wording `"// Put your trusted low-cost model here"` MUST NOT appear

#### Scenario: successful parse suppresses the message

- **WHEN** the existing config parses as JSONC and the agent block is merged in place
- **THEN** the verification message is NOT printed
