**Complexity**: medium

## Why

SAI's OpenCode setup configures read access for its global prompt directory but does not configure OpenCode's separate `external_directory` permission, causing repeated permission prompts when commands read `~/.config/opencode/sai/**`. The installer should establish the narrow trust rule consistently for fresh and existing configurations without disturbing user-owned settings.

## What Changes

- Add the narrow `~/.config/opencode/sai/**` external-directory permission to the OpenCode configuration projection.
- Merge the permission into fresh and existing `opencode.json` or `opencode.jsonc` configurations using the existing JSONC surgical merge behavior.
- Preserve existing user configuration, comments, formatting, unrelated permissions, and the repository's `opencode.json` precedence when both files exist.
- Respect an existing effective `ask` or `deny` rule that matches the SAI path instead of silently overriding an intentional user restriction.
- Preserve valid scalar OpenCode permission actions and canonicalize equivalent SAI path spellings before deciding whether a rule is missing.
- Make repeated installation idempotent and cover the new behavior with installer tests.
- Document the automatic permission, its narrow security scope, configuration precedence, and installation behavior in the OpenCode installation guide.

## Capabilities

### New Capabilities

<!-- No new capability is introduced; this change extends existing harness-binding contracts. -->

### Modified Capabilities

- `design-harness-bindings`: Extend OpenCode design binding installation and verification to include the narrow SAI external-directory permission.
- `implementation-harness-bindings`: Extend OpenCode implementation binding projection and merge behavior to configure and test the external-directory permission while preserving user settings.

## Impact

- `bin/install-flow.js` — OpenCode configuration merge implementation.
- `configs/opencode.jsonc` — fresh OpenCode configuration defaults.
- `test/install-opencode.test.js` — installation and merge coverage.
- `INSTALL.opencode.md` — OpenCode installation documentation.
- `openspec/specs/design-harness-bindings/spec.md` — modified design-binding contract.
- `openspec/specs/implementation-harness-bindings/spec.md` — modified implementation-binding contract.

## Proposal Research Documentation

**Local files**: `bin/install-flow.js`, `sai/install-manifest.json`, `configs/opencode.jsonc`, `docs/adr/0029-jsonc-parser-surgical-merge-for-opencode-agent-block.md`, `docs/adr/0030-opencode-json-over-jsonc-merge-precedence.md`, `test/install-opencode.test.js`, `INSTALL.opencode.md`, `openspec/specs/design-harness-bindings/spec.md`, `openspec/specs/implementation-harness-bindings/spec.md`

**External URLs**: `https://opencode.ai/docs/permissions/`, `https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/permission/index.ts`, `https://github.com/anomalyco/opencode/blob/dev/packages/core/src/v1/config/permission.ts`

## Additional Notes

- The existing merge mechanism uses `jsonc-parser` surgical edits and targets `opencode.json` when both JSON and JSONC configuration files are present.
- OpenCode evaluates overlapping permission rules in declaration order with the last matching rule winning; the merge must preserve that order and make any intentional user restriction visible rather than silently overriding it.
- Non-fatal merge guidance follows the installer convention of an actionable stdout notice; fatal installer failures remain stderr plus a nonzero exit.
- Runtime no-prompt behavior is a documented post-install manual verification; no new live-probe surface is assumed.
- The trusted path must remain `~/.config/opencode/sai/**`; allowing all external directories is explicitly out of scope.
- This is an installer/configuration defect, not a command-specific SAI behavior change.
