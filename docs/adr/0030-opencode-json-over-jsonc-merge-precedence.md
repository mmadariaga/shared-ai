# ADR 0030: Merge `opencode.json` over `opencode.jsonc` when both exist

## Status

Accepted

## Context

`copyOpencodeConfig` checks for `opencode.json` and `opencode.jsonc` independently, so both can exist in the same opencode config directory. The `opencode-config-agent-merge` change must pick exactly one file to merge the `agent` block into, deterministically. Config-loader research shows opencode itself loads **both** files and merges them with `opencode.jsonc` applied last (last-wins on conflicting keys).

## Decision

When both files exist, merge the missing `agent` keys into `opencode.json` and leave `opencode.jsonc` byte-for-byte untouched.

## Alternatives Considered

- **Merge into `opencode.jsonc`** (opencode's last-wins file): would guarantee the inserted keys win even if the other file defined `agent`. Rejected because the capability spec normatively fixes `opencode.json` precedence, and it is unnecessary for the specified scenarios.
- **Merge into `opencode.json`** (chosen): in the specified both-exist scenario neither file defines `agent`, so keys inserted into `opencode.json` survive into opencode's effective merged config (the jsonc file has no `agent` to override them).

## Consequences

- Deterministic, spec-conformant target selection.
- Safe for the specified scenarios (neither file defines `agent`). The edge where a user's `opencode.jsonc` defines a conflicting `agent` — which would shadow the json-merged keys under opencode's last-wins merge — is out of scope and deferred to a future managed-merge iteration.
- The printed add-notice names which keys were added, so the user can verify.

## Related

- `openspec/changes/opencode-config-agent-merge/design.md` — Decision D2
- `openspec/changes/opencode-config-agent-merge/specs/opencode-config-install/spec.md` — "both config files exist — only opencode.json is merged"
