# ADR 0168a: Coordinator selects plan by token presence; worker validates and owns generation

## Status

Accepted

## Context

The design coordinator is intentionally blind to source artifacts and technical arguments. It must nevertheless render the correct progress plan before dispatch. A fixed seven-step plan leaves an overview step visible for an invocation that cannot generate an overview, while parsing or validating the language value in the coordinator would violate the no-I/O and worker-ownership boundary. The raw envelope already contains the only signal the coordinator needs: whether the `--overview-lang` token is present.

## Decision

The coordinator selects between two exact static plans using raw token presence only. A present `--overview-lang` token selects the seven-step plan: prerequisites/resolution, research, design, tasks, interfaces, review, and overview. An absent token selects the six-step plan containing the same first six steps and no overview step. Malformed, missing-value, and duplicate occurrences still count as present for plan selection; the worker validates those forms before resolution and returns the appropriate failure. The coordinator forwards `wrapper_echo_value` and `arguments_value` unchanged, performs no argument parsing or validation, and owns no generation work. The worker owns language validation, generation dispatch, progress evidence, and overview failure metadata.

## Alternatives Considered

- **Parse and validate the language in the coordinator** — rejected; it breaks the coordinator's no-I/O/no-technical-logic boundary and duplicates worker parsing.
- **Render one seven-step plan for every invocation** — rejected; an unopted invocation would expose a step it can never complete.
- **Render one six-step plan and hide overview generation separately** — rejected; the opted-in route needs explicit progress evidence and a stable overview step.
- **Let malformed flags select the unopted plan** — rejected; plan selection is presence-only and validation belongs to the worker.

## Consequences

- The dispatch task list accurately describes whether overview generation is available without inspecting the language value.
- Invalid flag forms fail before change resolution while retaining the opted-in plan shape selected by presence.
- Both harnesses share the same static plan contract and the same worker-owned generation boundary.
- The coordinator remains blind to artifacts, implementation details, and generator results beyond lifecycle routing.

## Related content

- `openspec/changes/opt-in-change-overview/specs/pipeline-design-phase-chaining/spec.md`
- `openspec/changes/opt-in-change-overview/specs/overview-language-flag/spec.md`
- `sai/commands/design/coordinator.md`
- `sai/commands/design/worker.md`
- ADR 0083 — Extract shared coordinator mechanics through phase adapters
