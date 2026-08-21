# ADR 0034: Resolution precedence — wrapper-echo check runs first

## Status

Accepted

## Context

The change-picker instruction gates itself on `$ARGUMENTS`-emptiness. In opencode, `$ARGUMENTS` inside the body file is a literal text token, never substituted — it is effectively always empty in the body context. In Claude Code and Copilot, `$ARGUMENTS` is substituted into the body file directly and works as intended. The change-picker needs to check both the wrapper-echo line (opencode-specific) and the canonical `$ARGUMENTS` variable (Claude/Copilot).

## Decision

The wrapper-echo line check runs first; if the value is non-empty, it is used as the resolved change name. If the echo line is absent or empty, the change-picker falls through to the existing `$ARGUMENTS` check (which is the load-bearing path in Claude Code and Copilot). If both are absent/empty, the 0/1/N picker runs.

## Alternatives Considered

- **`$ARGUMENTS` first, echo as fallback** — looks more natural because `$ARGUMENTS` is the canonical variable, but in opencode it is always literal in the body, so checking it first would always fall through to the echo check anyway.
- **Echo first, `$ARGUMENTS` as fallback** (chosen) — removes a redundant check for opencode and makes the contract explicit.

## Consequences

- The ordering is a load-bearing mechanism in opencode. Reordering would silently change semantics for any future harness with a similar substitution gap.
- The precedence is documented in `sai/instructions/change-picker.md` with a one-line note explaining the opencode gap.

## Related

- `openspec/changes/fix-opencode-arg-passthrough/design.md` — Decisions D2
- `openspec/specs/change-picker/spec.md` — updated "Invocation Trigger" requirement
