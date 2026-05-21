# ADR 0006: Load commit-rules at Git Operations Section Header in apply.md

## Status

Accepted

## Context

`sai/instructions/apply.md` proposes commit messages at STOP & COMMIT markers but has no
reference to commit message format rules. Adding `Fetch @sai/instructions/commit-rules.md`
somewhere in `apply.md` would fix this. Two placement options exist: (a) once at the top of
the `## Git Operations` section, or (b) inline at each individual STOP & COMMIT marker.

## Decision

Insert `Fetch @sai/instructions/commit-rules.md` once, at the top of the `## Git Operations`
section — as the first line after the `## Git Operations` heading, before the `**CRITICAL:**`
paragraph.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Section header (chosen) | One directive, robust to plan restructuring | Loads rules for all git ops, not only commit proposals |
| Inline at each STOP & COMMIT | Surgical, loads only when needed | Fragile — every future STOP & COMMIT marker must include the directive; omission is easy |

## Consequences

- A single directive covers all commit proposals in `## Git Operations`, including future
  STOP & COMMIT markers added to any plan.
- A reader finding it at the section header immediately understands the scope: all git/commit
  operations in this section apply commit-rules.
- If `## Git Operations` is reorganised, the directive stays at the section entry point.

## Related

- ADR 0005 — Explains why `commit-rules.md` contains verbatim rule text.
