# ADR 0035: Harness-specific adapter carve-out

## Status

Accepted

## Context

The repo's "Mirror discipline" convention requires that any change to `commands/{claude,opencode,copilot}/` be mirrored to all three harness directories in the same commit. This change edits only `commands/opencode/` because the underlying gap (opencode's `$ARGUMENTS` substitution is wrapper-template-only) is unique to opencode, and the fix (a wrapper-echo line) would be dead noise in Claude Code and Copilot.

## Decision

Introduce a formal "harness-specific adapter" exception category in `harness-universality/spec.md`. A change qualifies as a harness-specific adapter when ALL of the following hold:
1. The change fills a gap in exactly one harness's wrapper or instruction set.
2. The underlying behavior difference is unique to that harness.
3. The fix has no meaning in the other harnesses, or would be actively wrong noise if mirrored.

Adapters MAY be confined to a single harness directory and exempted from mirror discipline. The change proposal SHALL justify the adapter category.

## Alternatives Considered

- **Mirror to all three** — keeps mirror discipline literally but pollutes Claude/Copilot wrappers with dead noise.
- **Self-justify in proposal only** — provides no reusable principle for future asymmetric changes.
- **Formalize the carve-out in the spec** (chosen) — makes the asymmetry principled and discoverable.

## Consequences

- Future harness-asymmetric changes can cite this rule instead of self-justifying.
- The three conditions are conjunctive (ALL must hold), preventing over-citation.
- This change is the first explicit citation of the carve-out.

## Related

- `openspec/changes/fix-opencode-arg-passthrough/design.md` — Decisions D3
- `openspec/specs/harness-universality/spec.md` — "Harness-specific adapter carve-out" requirement
- `AGENTS.md` — updated "Change picker" paragraph references the carve-out
