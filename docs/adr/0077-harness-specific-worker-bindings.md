# ADR 0077: Keep model and continuation mechanics in harness-specific worker bindings

<!-- adr-index: refs 0074; refs 0075; refs 0076 -->

## Status

Accepted

## Context

Claude Code and opencode expose different worker configuration, dispatch, continuation, and permission surfaces. The coordinator and implementation-planning worker need independently configurable models and reasoning levels. Encoding those details in the shared coordinator would make harness-neutral lifecycle instructions depend on vendor syntax, while reusing generic budget agents would not provide the required model, tool, permission, or continuation contracts.

The bindings introduce globally installed namespaced surfaces, so installation must distinguish managed content from user-owned tunables.

## Decision

Place dispatch syntax, continuation, and result augmentation in SAI-namespaced harness-specific worker bindings. Coordinator model defaults live in the respective `commands/claude/` and `commands/opencode/` wrapper frontmatter. Worker seeds live in `sai/install-manifest.json`'s `worker-matrix`, and the resolved installed agent file supplies the runtime model and effort or variant. These are the model authorities; this ADR pins no model IDs or effort levels.

Claude Code dispatches a background custom worker with agent-ID continuation through `SendMessage`. Its coordinator and worker use separately configured tunables. Managed worker files follow the tunable-seed lifecycle: installation preserves destination tunables, doctor checks the body and non-tunable frontmatter, and uninstall removes body-matching definitions regardless of tunable values.

Opencode declares its coordinator model in each routed wrapper and projects managed worker and generic helper agent files under `~/.config/opencode/agents/` (`explore.md`, `executor.md`, and `budget.md` for the generic agents). Each projected worker follows the tunable-seed lifecycle: created when absent with the worker-matrix seed, reused when the body and non-tunable frontmatter match, and overwritten with a console notice on body divergence while preserving user-owned `model` and `variant` lines. Doctor and uninstall compare by body and non-tunable frontmatter. No `.<basename>.owner.json` sidecar is written or read. The installer keeps its opencode configuration merge permission-only — only the SAI external-directory rule is merged, never an agent registration — and excludes `opencode.json`/`opencode.jsonc` from uninstall.

Claude Code and opencode overwrite body-divergent worker agent files with a console notice under the tunable-seed lifecycle; ordinary managed destinations keep their collision protection. Uninstall keeps body-divergent worker files as project-local overrides and never removes opencode configuration entries.

## Alternatives Considered

- **Reuse generic budget agents** - reduces new files, but cannot pin the required models, tools, permissions, and lifecycle behavior.
- **Hard-code harness APIs in the shared coordinator** - centralizes prose, but violates harness neutrality and couples every harness to unrelated syntax.
- **Configure only in command wrappers** - keeps routing nearby, but cannot fully express worker permissions, ownership, and continuation semantics.
- **Use namespaced harness binding skills** (chosen) - isolates vendor mechanics while preserving one shared protocol.

## Consequences

- Installer, doctor, version-skew, and uninstall inventories must resolve each harness's managed agents from the worker matrix and compare body and non-tunable frontmatter.
- Activation requires collision checks and a blocking live opencode capability probe before wrappers switch routes.
- Contract-delivery parity is outcome-based: Claude and opencode may use different harness preambles, but both load the same canonical worker contract before interpreting the opaque invocation envelope.
- Documentation must describe both supported harnesses without duplicating their versioned model defaults.

## Related

- `openspec/changes/introduce-implement-coordinator-worker/design.md` - Decision D5
- `openspec/changes/introduce-implement-coordinator-worker/specs/implementation-harness-bindings/spec.md`
- `docs/adr/0074-harness-wrappers-select-coordinator-or-inline-implementation-planning.md`
- `docs/adr/0075-normalized-invocation-envelope-and-lifecycle-payload.md`
- `docs/adr/0076-resume-worker-before-durable-reconstruction.md`
