# ADR 0145: Routed coordinators receive panel tools with non-blocking runtime degradation

## Status

Accepted

## Context

The seven routed Claude Code coordinator wrappers declare an `allowed-tools` list,
but their contracts require rendering the complete progress plan before worker
dispatch. The Claude panel binding performs that render with `TaskCreate`,
`TaskUpdate`, `TaskGet`, and `TaskList`. Omitting those tools makes the required
pre-dispatch render impossible, while weakening the render-before-dispatch
contract would hide an entrypoint defect. `/sai-4-apply` also consumes the panel
for its Step Projection and previously relied on the absence of an allowlist.

The panel binding declares native-panel availability statically. Static
declaration does not guarantee that a particular runtime exposes every declared
tool, so the contract needs a behavior for a declaration/runtime mismatch.

## Decision

The seven routed Claude Code coordinator wrappers add exactly `TaskCreate`,
`TaskUpdate`, `TaskGet`, and `TaskList` to their existing allowlist. The apply
wrapper declares its own explicit execution allowlist, including its existing
read, write, shell, dispatch, interaction, and panel capabilities, rather than
receiving them through omission.

When a declared panel tool is rejected because it is unavailable at runtime, the
coordinator records exactly one visible notice,
`> Panel rendering unavailable; continuing without task-panel updates.`, disables
panel calls for the rest of that invocation or explore chat, and continues
without panel rendering. It preserves logical plan/list state, does not retry or
probe dynamically, and does not activate the no-native-panel Markdown fallback.
The render attempt or recorded degradation decision remains ordered before a
routed dispatch or continuation. Other tool and contract errors remain failures.
This rule covers routed progress plans, apply's Step Projection, and the cosmetic
read-only `sai-explore` idea list.

The change is Claude Code entrypoint scoping and panel-binding behavior only; the
opencode wrappers remain untouched. The opencode panel binding carries the same
runtime-degradation semantics for its own coordinator-side `todowrite` surface.

## Alternatives Considered

- **Remove the render prerequisite** — rejected: it weakens a correctness and UX contract to fit an incomplete wrapper allowlist.
- **Fail the whole coordinator when panel tools are unavailable** — rejected: panel rendering is presentation state; lifecycle correctness and worker results remain recoverable without it.
- **Probe and dynamically select Markdown fallback** — rejected: it contradicts the declared-not-runtime-detected binding model and creates two render semantics at runtime.
- **Leave apply unrestricted by omission** — rejected: an explicit allowlist makes its broader execution boundary auditable and preserves the same capabilities.

## Consequences

Claude routed coordinators can satisfy their pre-dispatch panel prerequisite under
the enforced tool scope. A runtime missing panel tool produces a visible,
non-blocking degradation and no repeated failing calls. Apply's broader scope is
documented at its entrypoint, while the seven read-only routed coordinators still
exclude `Edit`, `Write`, and shell access.

## Provenance

User — requested resolution of the wrapper/panel contradiction, an explicit apply
decision, and an explicit runtime mismatch route.
