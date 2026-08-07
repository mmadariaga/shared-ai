# ADR 0088: Implementation harness projection boundaries

<!-- adr-index: refs 0084; refs 0085; refs 0074 -->

## Status

Accepted

## Context

Implementation planning has routed Claude Code and opencode worker bindings but keeps GitHub Copilot on the caller-neutral inline path. The managed installer must project only the active routed binding for each routed harness, retain Copilot compatibility assets, and preserve ownership, collision, doctor, uninstall, and opencode JSONC safeguards.

## Decision

The single installation manifest remains the source of truth for implementation projections. Claude Code receives the shared lifecycle sources, implementation worker, Claude binding, forwarding skill, and managed worker agent. Opencode receives the shared lifecycle sources, implementation worker, opencode binding, and the namespaced `sai-3-implementation-worker.md` agent file projected to `~/.config/opencode/agents/`. Copilot receives the inline command and caller-neutral compatibility assets but no routed orchestration or routed worker-agent surfaces.

Installer, doctor, and uninstall consume the same expanded projection graph. Exact-compatible unowned Claude agents remain user-owned, incompatible non-opencode destinations stop without overwrite, and unrelated opencode JSONC content remains unchanged. For opencode worker agents specifically, the projected `sai-3-implementation-worker.md` agent file follows the tunable-seed lifecycle — created when absent with the canonical definition and the shipped tunables, reused when body and non-tunable frontmatter match, overwritten with a console notice when they diverge while the destination's `model` and `variant` lines are preserved — and doctor validates the projected file against its bundled `agents/opencode/sai-3-implementation-worker.md` source by the body-and-non-tunable identity rule.

## Alternatives Considered

- **Maintain separate installer lists per harness** - simpler locally but creates drift between install, doctor, and uninstall.
- **Project routed orchestration to Copilot** - reduces projection distinctions but violates the intentional inline adapter boundary.
- **Rewrite complete opencode configuration files** - easier to implement but destroys comments and unrelated user settings.

## Consequences

- Harness boundaries are explicit and testable in one manifest.
- Installer safety behavior remains generic rather than implementation-specific.
- Adding another routed harness requires a separate binding, projection, and parity decision.
- Opencode worker agent files bootstrap missing files with the canonical definition and preserve the user's `model` and `variant` tunables across overwrites, while uninstall keeps body-divergent files as project-local overrides.

## Related

- `docs/adr/0074-harness-wrappers-select-coordinator-or-inline-implementation-planning.md`
- `docs/adr/0084-hybrid-declarative-installation-manifest.md`
- `docs/adr/0085-generic-handlers-for-declared-projection-strategies.md`
