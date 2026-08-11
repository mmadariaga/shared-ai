# ADR 0129: Preserve OpenCode agent frontmatter and append-only local extensions

## Status

Accepted

## Context

Managed OpenCode agent files carry identity metadata and user-controlled model
and variant tunables. Project-local materializations may also append
instructions that are owned by the project rather than by the global SAI
source. Replacing the whole local file during setup would discard those
customizations and would make global behavior updates destructive.

## Decision

Keep each managed entrypoint's agent name, description, `mode: subagent`,
placeholder model, and selected tunable values in frontmatter. Keep
project-local instructions after the canonical Fetch line. Setup reruns may
refresh the managed wrapper and its non-tunable source content, but they must
preserve the local Fetch target, selected `model` and `variant`, and appended
instructions in their existing order.

## Alternatives Considered

- Replace the project-local agent file wholesale: rejected because it destroys
  user-owned instructions and selected tunables.
- Use a project-local policy shadow as the extension mechanism: rejected
  because it hides later updates to the global canonical policy.

## Consequences

Global policy behavior is updated before project-specific instructions while
the project retains its tuning and extension points. The installer must keep
the managed frontmatter boundary and the append-only body contract stable.

## Related

- `openspec/changes/canonicalize-opencode-agent-behavior/design.md` — Decision 2
