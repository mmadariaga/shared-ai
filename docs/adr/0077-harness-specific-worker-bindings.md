# ADR 0077: Keep model and continuation mechanics in harness-specific worker bindings

<!-- adr-index: refs 0074; refs 0075; refs 0076 -->

## Status

Accepted

## Context

Claude Code and opencode expose different worker configuration, dispatch, continuation, and permission surfaces. The coordinator and implementation-planning worker also need independently pinned models and reasoning levels. Encoding those details in the shared coordinator would make harness-neutral lifecycle instructions depend on vendor syntax, while reusing generic budget agents would not provide the required model, tool, permission, or continuation contracts.

The bindings introduce globally installed namespaced surfaces, so installation must distinguish managed content from compatible user-owned content and must not overwrite incompatible definitions.

## Decision

Place model selection, dispatch syntax, continuation, and result augmentation in SAI-namespaced harness-specific worker binding skills.

Claude Code uses a low-effort `claude-opus-4-8` coordinator and a high-effort background custom worker with agent-ID continuation through `SendMessage`. Installation creates an ownership sidecar only when SAI creates the agent; uninstall removes only an owned, unchanged agent.

Opencode declares the logical coordinator runtime in each routed wrapper and uses only the current numbered worker entries: `sai-2-design-worker` and `sai-3-implementation-worker`. The repository definitions are bootstrap defaults for missing names. An existing opencode agent name is user-owned: installation preserves its complete definition without comparison or mutation, doctor accepts its own-name presence in a valid agent map, and runtime dispatch uses its configured model, variant, mode, and permissions.

Claude Code continues to block incompatible worker-file collisions. Opencode adds only absent agent names and never removes configuration entries on uninstall. Copilot receives no routed worker binding and keeps the inline route selected by its wrapper.

## Alternatives Considered

- **Reuse generic budget agents** - reduces new files, but cannot pin the required models, tools, permissions, and lifecycle behavior.
- **Hard-code harness APIs in the shared coordinator** - centralizes prose, but violates harness neutrality and couples every harness to unrelated syntax.
- **Configure only in command wrappers** - keeps routing nearby, but cannot fully express worker permissions, ownership, and continuation semantics.
- **Use namespaced harness binding skills** (chosen) - isolates vendor mechanics while preserving one shared protocol.

## Consequences

- Installer, doctor, version-skew, and uninstall inventories must treat Claude agents and opencode entries according to their distinct ownership rules.
- Activation requires collision checks and a blocking live opencode capability probe before wrappers switch routes.
- Documentation must name all three harnesses and distinguish Copilot's missing portable contract from general subagent availability.

## Related

- `openspec/changes/introduce-implement-coordinator-worker/design.md` - Decision D5
- `openspec/changes/introduce-implement-coordinator-worker/specs/implementation-harness-bindings/spec.md`
- `docs/adr/0074-harness-wrappers-select-coordinator-or-inline-implementation-planning.md`
- `docs/adr/0075-normalized-invocation-envelope-and-lifecycle-payload.md`
- `docs/adr/0076-resume-worker-before-durable-reconstruction.md`
