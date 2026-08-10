# ADR 0125: Preserve project-local agent content with a line-oriented frontmatter patch

## Status

Accepted

## Context

Project-local agent files are user-owned extension points. Replacing an
existing file with the installed global source would discard project-specific
prompt bodies and unrelated frontmatter such as permissions. The repository
does not need a new frontmatter dependency for changing two or three scalar
keys in the first frontmatter block.

## Decision

For an existing project-local agent, patch only top-level harness tunable
lines in the first frontmatter block. Replace selected values, insert missing
selected keys, and remove an unselected opencode `variant`; preserve all other
frontmatter lines, the body, and the original line-ending style. For a missing
destination, clone the same-named installed source first and apply the same
patch.

## Alternatives Considered

- Replace the local file wholesale from the installed source: rejected because
  it destroys user-owned content.
- Add a frontmatter parsing dependency: rejected because a bounded line-level
  patch is sufficient and preserves bytes more narrowly.

## Consequences

The materializer has explicit insertion, replacement, and removal behavior for
top-level scalar keys. Malformed or absent frontmatter must be surfaced as a
classified persistence failure rather than silently rewriting nested content.

## Related

- `openspec/changes/persist-project-agent-overrides/design.md` — Decision
  “Preserve local agents with a line-preserving tunable patch”.
