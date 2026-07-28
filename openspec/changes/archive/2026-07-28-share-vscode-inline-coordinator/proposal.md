**Complexity**: medium
<!-- First line of the file. Derive per `## Complexity Derivation Rubric` in sai/instructions/spec.propose.md, after specs/**/*.md are written. Optional trailing parenthetical, e.g. `medium (3 files, no breaking change)` — parsers ignore everything from the first `(`. Any change that adds content above `## Why` must re-anchor this line in openspec/specs/proposal-complexity/spec.md rather than displace it. -->

## Why

VS Code currently maintains separate inline orchestration bodies for design and implementation, so shared invocation behavior must be updated in two places. A single inline coordinator adapter can dispatch to the existing phase cores while preserving VS Code's one-context execution model and the phase-specific policies that routed workers require.

## What Changes

- Add `sai/orchestration/inline-invocation.md` as the shared inline coordinator adapter.
- Dispatch the adapter from the exact phase markers `phase: sai-2-design` and `phase: sai-3-implement`.
- Reuse `sai-2-design-core` and `sai-3-implementation-core` for their respective phase invocations.
- Make the adapter the sole owner of the shared inline envelope and the phase-specific caller lifecycle around each core, including checks, feedback, and completion navigation; keep the cores as technical invocation shells.
- Reduce the two VS Code prompt entrypoints to minimal adapters that provide the phase marker and forward the user's arguments.
- Preserve existing phase-specific prerequisites, change selection, fast-track behavior, feedback gates, artifact paths, and completion messages.
- Keep the VS Code path inline; do not add routed worker identifiers, worker continuation state, or `subagent_depth`.

## Capabilities

### New Capabilities

- `inline-coordinator-adapter`: Shared phase-dispatching orchestration for the VS Code inline design and implementation prompts.

### Modified Capabilities

- None.

## Impact

- `sai/orchestration/inline-invocation.md` — new shared inline invocation contract.
- `sai/commands/sai-2-design-inline.md` — thin design entrypoint or compatibility loader.
- `sai/commands/sai-3-implement-inline.md` — thin implementation entrypoint or compatibility loader.
- `commands/copilot/sai-2-design.prompt.md` — minimal VS Code design prompt.
- `commands/copilot/sai-3-implement.prompt.md` — minimal VS Code implementation prompt.
- `sai/install-manifest.json` — projection of the shared adapter and any retained inline loaders.
- `openspec/changes/archive/2026-07-28-consolidate-routed-sai-coordinators/` — accepted dependency precedent; not modified by this change.

No external dependency or application runtime API is introduced. The adapter is projected only for Copilot's VS Code path; Claude Code and opencode routed worker bindings remain outside this change.

## Proposal Research Documentation

**Local files**:
- `commands/copilot/sai-2-design.prompt.md`
- `commands/copilot/sai-3-implement.prompt.md`
- `sai/commands/sai-2-design-inline.md`
- `sai/commands/sai-3-implement-inline.md`
- `sai/compat/sai-2-design-core.md`
- `sai/compat/sai-3-implementation-core.md`
- `sai/instructions/design.md`
- `sai/instructions/implement.md`
- `sai/install-manifest.json`
- `docs/adr/0089-shared-sai-coordinator-profile.md`
- `openspec/changes/archive/2026-07-28-consolidate-routed-sai-coordinators/proposal.md`
- `GLOSSARY.md`

**External URLs**: None.


## Additional Notes

The archived `consolidate-routed-sai-coordinators` change and ADR 0089 establish the shared routed-coordinator precedent while explicitly retaining VS Code as inline. This change extends sharing only across the VS Code invocation shell; design and implementation phase cores remain separate so their policies do not become conditional branches in one core.
