## MODIFIED Requirements

### Requirement: opencode config fallback message SHALL use verification language

When `opencode.jsonc` already exists, `bin/install.js` MUST display a message instructing the user to verify that the agent settings are properly configured — not to manually add a section.

#### Scenario: existing config — intro line

- **WHEN** `copyOpencodeConfig` detects an existing `opencode.jsonc`
- **THEN** the printed intro line reads: `"Opencode config already exists. Verify that you have these settings properly configured:"`

#### Scenario: existing config — inline comment wording

- **WHEN** the agent config snippet is printed to the console
- **THEN** the comment above each `model` field reads: `"// Your trusted low-cost model below"`
- **THEN** the previous wording `"// Put your trusted low-cost model here"` MUST NOT appear
