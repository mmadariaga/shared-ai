# DDR 0143b: Out-of-root budget-explorer access is concrete and purpose-bound

## Status

Accepted

## Context

Root-first research still needs a safe way to inspect a specifically relevant
external tool artifact. A conventional location is not self-justifying, while a
closed destination allowlist would be brittle and would not cover legitimate
task-specific paths.

## Decision

`budget-explorer` may access a filesystem path outside the harness project root
only when the path is concrete and named with a concrete task-relevant purpose.
A task-supplied path qualifies when the task supplies that purpose. A public or
well-known location qualifies only when the explorer identifies the relevant
tool, explains the task relationship, and names the specific artifact sought
there before access. The bounded summary records those three evidence elements
for every such directed access. Speculative sweeps, broad patterns, root
exhaustion, and an irrelevant concrete path do not qualify; this is an evidence
rule, not a closed destination allowlist.

## Alternatives Considered

- **Use a fixed external destination allowlist** — rejected because it cannot
  express every legitimate task-specific location and would turn a policy rule
  into a brittle registry.
- **Treat conventional locations as authorized automatically** — rejected
  because convention alone does not establish which relevant tool or artifact
  the task needs.
- **Permit any concrete external path** — rejected because concreteness without
  an independently relevant purpose would reintroduce speculative access.

## Consequences

Legitimate external reads remain possible without widening the policy into a
destination registry, and the summary makes the authorization evidence auditable
for Claude Code and opencode alike. Dispatches must carry enough concrete
purpose before an external read, and undisclosed discoveries use the escalation
contract instead of being probed.

## Provenance

User — `openspec/changes/explore-agent-search-scope/design.md` records the three
qualification criteria and selects evidence-backed directed access.
