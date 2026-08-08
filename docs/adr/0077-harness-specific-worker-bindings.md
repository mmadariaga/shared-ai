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

Opencode declares the logical coordinator runtime in each routed wrapper and registers its workers and the three generic helper agents as ten managed markdown agent files projected by the install manifest to `~/.config/opencode/agents/` (the explore agent at `~/.config/opencode/agents/explore.md`, plus `executor.md` and `budget.md`): `sai-1-spec-proposal-worker.md`, `sai-2-design-worker.md`, `sai-3-implementation-worker.md`, `sai-5-review-worker.md`, `sai-6-security-worker.md`, `sai-7-performance-worker.md`, and `sai-8-accessibility-worker.md`. Each projected file follows the tunable-seed lifecycle: created when absent with the repository default definition (the shipped tunables are seeded), reused when the body and non-tunable frontmatter match, and overwritten with a console notice when the body or non-tunable frontmatter diverges, while the destination's `model` and `variant` tunable lines are preserved and never emitted inside the `permission:` block. Doctor and uninstall identify a projected file by the body-and-non-tunable identity rule: doctor strips the tunable lines before comparing, reports a missing file with re-run-the-installer remediation and a body divergence as an error, and never emits a sidecar record; uninstall deletes a body-matching file regardless of tunable values and keeps a body-divergent file as a project-local override. No `.<basename>.owner.json` sidecar is written or read. The installer's opencode configuration merge is permission-only — it covers the SAI external-directory permission and nothing else; no agent key is inserted into `opencode.json`/`opencode.jsonc`, and the opencode configuration is excluded from uninstall.

Claude Code and opencode overwrite body-divergent worker agent files with a console notice under the tunable-seed lifecycle, and neither harness writes an ownership sidecar; ordinary managed destinations keep their collision protection and no-overwrite behavior. Uninstall never removes configuration entries and keeps body-divergent worker files as project-local overrides. Copilot receives no routed worker binding and keeps the inline route selected by its wrapper.

## Alternatives Considered

- **Reuse generic budget agents** - reduces new files, but cannot pin the required models, tools, permissions, and lifecycle behavior.
- **Hard-code harness APIs in the shared coordinator** - centralizes prose, but violates harness neutrality and couples every harness to unrelated syntax.
- **Configure only in command wrappers** - keeps routing nearby, but cannot fully express worker permissions, ownership, and continuation semantics.
- **Use namespaced harness binding skills** (chosen) - isolates vendor mechanics while preserving one shared protocol.

## Consequences

- Installer, doctor, version-skew, and uninstall inventories must treat Claude agents and opencode agent files according to their distinct ownership rules.
- Activation requires collision checks and a blocking live opencode capability probe before wrappers switch routes.
- Contract-delivery parity is outcome-based: Claude and opencode may use different harness preambles, but both load the same canonical worker contract before interpreting the opaque invocation envelope.
- Documentation must name all three harnesses and distinguish Copilot's missing portable contract from general subagent availability.

## Related

- `openspec/changes/introduce-implement-coordinator-worker/design.md` - Decision D5
- `openspec/changes/introduce-implement-coordinator-worker/specs/implementation-harness-bindings/spec.md`
- `docs/adr/0074-harness-wrappers-select-coordinator-or-inline-implementation-planning.md`
- `docs/adr/0075-normalized-invocation-envelope-and-lifecycle-payload.md`
- `docs/adr/0076-resume-worker-before-durable-reconstruction.md`
