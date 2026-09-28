# ADR 0132: Reconcile the executor capability at the canonical Fetch boundary

## Status

Accepted

## Context

The active `executor-opencode-skill` capability required an inline
`## Universal Behavior` section while the OpenCode executor skill was being
centralized behind its canonical policy. Keeping that requirement would make
the active specification contradict the intended skill structure.

## Decision

Modify the active executor capability so the OpenCode executor skill consumes
exactly one `Fetch @sai/policies/executor-agent.md` directive, does not inline
the universal behavior section, and retains its OpenCode binding, synchronous
dispatch, agent-file model resolution, and no-cap guidance. The structured
failure report and the requested-output raw-output boundary live only in the
canonical policy, so they reach the executor of both harnesses. The change delta
records the same replacement boundary.

## Alternatives Considered

- Preserve the inline section to satisfy the active capability: rejected because
  it keeps a duplicate of the canonical executor policy.
- Defer the capability update: rejected because the change would remain
  internally and normatively inconsistent.

## Consequences

The active capability, change delta, executor skill, and regression assertions
share one canonical behavior boundary. The generic executor agent and the
Claude Code executor skill keep only their harness-specific binding contracts;
every behavior rule, including the raw-output boundary, comes from the policy.
