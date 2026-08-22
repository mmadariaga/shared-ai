# ADR 0153a: Overview dispatch names the budget-subagent binding per harness

<!-- adr-index: -->

## Status

Accepted

## Context

The design worker's overview-generation dispatch must name the budget-routed subagent binding that authors `change-overview.md`. The repository's house pattern (established in `sai/commands/explore/body.md`) names both harness budget bindings explicitly when dispatching a budget subagent: `Agent(subagent_type: budget-subagent)` for Claude Code and `task(subagent_type: budget)` for opencode. Both bindings are already bootstrapped with Fetch and budget behavior (`agents/claude/budget-subagent.md` and `agents/opencode/budget.md`).

Naming only one harness leaves the change incomplete against the pipeline's mirror discipline, which requires every change to a wrapper, shared instruction, skill, or installer to consider both supported harnesses.

## Decision

The design worker's overview-generation dispatch clause names both harness bindings explicitly: `Agent(subagent_type: budget-subagent)` for Claude Code and `task(subagent_type: budget)` for opencode. A single dispatch clause names two harness-specific primitives rather than a generic "dispatch a subagent" instruction.

## Alternatives Considered

- **Name only the Claude Code binding** — rejected; leaves the opencode dispatch incomplete against mirrored-behavior.
- **Name only the opencode binding** — rejected; leaves the Claude Code dispatch incomplete against mirrored-behavior.
- **Use a generic "dispatch a budget subagent" instruction without a harness-specific primitive** — rejected; the two harnesses have distinct dispatch primitives and the worker contract must name them so neither harness improvises a binding.

## Consequences

- The worker contract is coupled to harness-specific dispatch primitives (`Agent(...)` and `task(...)`); swapping a binding is a contract change, not a silent replacement.
- The named binding is the generation vehicle; full synthesis quality is the per-project model and effort override on that named binding, not an unnamed higher tier at dispatch time.

## Provenance

codebase-forced — `sai/commands/explore/body.md` establishes the repository's house pattern for naming both harness budget bindings, and `agents/claude/budget-subagent.md` / `agents/opencode/budget.md` confirm both bindings are already bootstrapped with Fetch and budget behavior.
