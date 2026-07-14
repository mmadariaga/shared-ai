# ADR 0049: Fast-track flag-strip precedes change-picker; cleaned change-name is authoritative

## Status

Accepted

## Context

Under opencode, the change-picker resolves the change-name from a `**Change-name argument:** $ARGUMENTS` echo line emitted by the wrapper. The echo line reads "the value … to the end of that line," so a raw `oauth2-auth --fast-track` would leak the flag token into the resolved change-name. The body file's pre-picker strip is inert against wrapper-echo resolution because the picker reads conversation history, not the body's `$ARGUMENTS`.

## Decision

The body-file parse block runs before the change-picker fetch and establishes the cleaned change-name as the effective `$ARGUMENTS` for every downstream step. Additionally, after the change-picker resolves a change name, if that value still contains `--fast-track`, the body strips the token and uses the cleaned remainder as the effective change name. This satisfies the requirement that the change-picker receives the change name with no residual flag text.

## Alternatives Considered

- **Teach `change-picker.md` to strip a trailing `--fast-track`** — rejected: `change-picker.md` is out of scope and shared by nine commands; a fast-track concern must not leak into it.
- **Change the opencode echo lines to compute a stripped value** — rejected: wrappers substitute `$ARGUMENTS` verbatim and cannot run logic.

## Consequences

- The change-picker and all downstream steps see a clean change name regardless of token order.
- `change-picker.md` remains untouched and harness-agnostic.
- A small behavioral override (post-picker strip) is added to the two change-consuming body files.

## Related

- `openspec/changes/add-fast-track-flag/design.md` — Decision D2
- `sai/instructions/change-picker.md` — Wrapper-Echo Resolution rules
