# ADR 0001: Separate per-harness instruction files for the sai subagent resolver

## Status

Accepted

## Context

The sai instruction layer references "cheap research subagent" without binding the phrase to a concrete subagent type, model, or tool-call cap. A single multi-section resolver file (mirroring `spec.claude.md` / `spec.opencode.md`) was viable but would force every harness to load both bodies and risk cross-contamination between harness-specific rules.

## Decision

Ship `explorer.claude.md` and `explorer.opencode.md` as independent files, each covering only its harness.

## Alternatives Considered

- **Single `explorer.md` with `## Harness Context — Claude Code` and `## Harness Context — OpenCode` sections** — Forces every harness to load both bodies; the OpenCode body would re-introduce model identifiers (haiku, sonnet) near the Claude rules and risk cap confusion. Rejected.
- **Inline the resolver into each sai-* command file** — Three duplicates to maintain; `spec.propose.md` would still need its own copy when fetched from a non-sai context. Rejected.

## Consequences

- sai commands fetch by exact filename — renaming or merging the files is a breaking change to those command files.
- The OpenCode resolver remains free of hardcoded model strings, as required by the `explorer-opencode / model-resolution-via-config` spec requirement.
- Caps may diverge between the two files over time; each file states its own rationale inline.
