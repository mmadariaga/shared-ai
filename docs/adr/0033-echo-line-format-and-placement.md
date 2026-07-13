# ADR 0033: Echo line format and placement

## Status

Accepted

## Context

opencode's wrapper-template substitution puts `$ARGUMENTS` only into the wrapper file under `~/.config/opencode/commands/`. The body file fetched by `Fetch @sai/commands/sai-X.md` is read separately by the model and sees the literal token `$ARGUMENTS`, never the user-typed value. The change-picker instruction therefore needs a way to recover the wrapper-substituted value from the conversation history.

## Decision

Every opencode change-consuming wrapper SHALL emit exactly one line at the end of the wrapper body, formatted as `**Change-name argument:** $ARGUMENTS` (two literal asterisks, the literal text `Change-name argument:`, a single space, and the literal token `$ARGUMENTS` substituted by opencode at invocation time). The line SHALL be the last line of the wrapper body, immediately after the existing `Fetch @sai/commands/sai-X.md and follow those instructions exactly.` line, with no extra surrounding whitespace, no Markdown link, and no code fence.

## Alternatives Considered

- **Fenced YAML block** — structured but visually noisy and over-engineered for a single substring scan.
- **Free-form prose** — ambiguous to scan because there is no unambiguous anchor prefix.
- **Fenced code block alone** — minimal but loses human readability.
- **Bold markdown label with colon** (chosen) — gives a visible distinct anchor for both humans and the scanner.

## Consequences

- The line is a string contract between the wrapper and the change-picker instruction. Renaming the prefix later would require coordinated edits across 9 wrapper files and the change-picker, making the contract moderately hard to reverse.
- Future opencode wrappers for new change-consuming `sai-*` commands MUST emit the same line.

## Related

- `openspec/changes/fix-opencode-arg-passthrough/design.md` — Decisions D1
- `openspec/specs/opencode-change-arg-passthrough/spec.md` — capability spec
- `sai/instructions/change-picker.md` — consumer of the echo line
