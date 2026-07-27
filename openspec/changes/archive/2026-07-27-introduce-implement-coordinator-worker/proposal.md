**Complexity**: high (5 capabilities, 20 requirements, no breaking change, no new dependency)
<!-- First line of the file. Derive per `## Complexity Derivation Rubric` in sai/instructions/spec.propose.md, after specs/**/*.md are written. Optional trailing parenthetical, e.g. `medium (3 files, no breaking change)` — parsers ignore everything from the first `(`. Any change that adds content above `## Why` must re-anchor this line in openspec/specs/proposal-complexity/spec.md rather than displace it. -->

## Why

Refactor `/sai-3-implement` into a user-facing coordinator and a dedicated implementation-planning worker so the pipeline can validate reusable coordinator-worker orchestration without changing the broader interactive design workflow. The bounded implementation phase is the right first slice because its durable output is a single planning artifact and its mandatory-stop behavior is already explicit.

## What Changes

- Make `/sai-3-implement` a thin coordinator that preserves argument handling, user communication, and mandatory-stop behavior while delegating technical work.
- Define a wrapper-level dispatch seam: Claude Code and opencode enter the shared coordinator path, while Copilot bypasses that path and retains its existing inline implementation entry point.
- Add an implementation-planning worker that owns prerequisites, artifact and codebase I/O, technical planning, verification, and direct writes to `implementation.md`.
- Define structured worker completion, input-needed, failure, clean-cancellation, and resumable-session behavior, including native-picker questions, answer forwarding, and invalid-response handling.
- Bind Claude Code to a low-effort `claude-opus-4-8` coordinator and high-effort `claude-opus-4-8` worker, and bind opencode to a GLM 5.2-high coordinator and Kimi K2.6 fixed-reasoning worker.
- Keep Copilot’s existing inline execution path unchanged and document the absence of a portable coordinator-worker contract without claiming that Copilot lacks subagent support.
- Preserve existing implementation artifact format, ADR/DDR evaluation, RED -> GREEN planning, verification, and MANDATORY STOP behavior.

## Capabilities

### New Capabilities

- **implementation-coordinator**: A thin `/sai-3-implement` control-plane command that dispatches the worker and reports its structured result.
- **implementation-planning-worker**: The execution-plane worker that performs the complete implementation-planning phase and writes the durable artifact.
- **worker-lifecycle-protocol**: Structured worker statuses, failure reporting, resumability, and fresh-worker reconstruction from durable artifacts.
- **implementation-harness-bindings**: Claude Code and opencode coordinator-worker model bindings plus the documented Copilot compatibility boundary.
- **implementation-behavioral-parity**: Preservation of current artifact semantics, planning checks, verification, and mandatory-stop behavior across the refactor.

### Modified Capabilities

None.

## Impact

**Affected files and systems**:
- `sai/commands/sai-3-implement.md`
- `sai/commands/sai-3-implement-inline.md`
- `sai/instructions/implement-invocation-core.md`
- `sai/instructions/implement-invocation.md`
- `sai/instructions/implement-worker.md`
- `commands/claude/sai-3-implement.md`
- `commands/opencode/sai-3-implement.md`
- `commands/copilot/sai-3-implement.prompt.md`
- `agents/claude/sai-implementation-planning-worker.md` and install-time `~/.claude/agents/.sai-implementation-planning-worker.owner.json`
- `skills/claude/sai-implementation-planning-worker/SKILL.md`
- `skills/opencode/sai-implementation-planning-worker/SKILL.md`
- `configs/opencode.jsonc`
- `bin/install-flow.js`, `bin/uninstall-flow.js`, and `bin/doctor.js`
- `test/implement-coordinator-worker.test.js` plus affected install, uninstall, doctor-inventory, fetch-resolution, and version-skew tests
- `README.md`, `AGENTS.md`, `INSTALL.claude.md`, and `INSTALL.opencode.md`

**Explicitly not touched**:
- `sai-2-design` and its wrappers or artifacts
- Project source code and runtime dependencies
- Existing task-routing metadata; it remains descriptive only

## Proposal Research Documentation

**Local files**:
- `sai/commands/sai-3-implement.md`
- `sai/instructions/implement.md`
- `sai/instructions/implement-invocation.md`
- `commands/claude/sai-3-implement.md`
- `commands/opencode/sai-3-implement.md`
- `commands/copilot/sai-3-implement.prompt.md`
- `sai/commands/sai-4-apply.md`
- `sai/instructions/remember.md`
- `openspec/schemas/sai-workflow/schema.yaml`
- `openspec/schemas/sai-workflow/templates/implementation.md`
- `GLOSSARY.md`
- `README.md`

**External URLs**:
- https://docs.anthropic.com/en/docs/claude-code/sub-agents
- https://docs.anthropic.com/en/docs/claude-code/tools-reference
- https://docs.anthropic.com/en/docs/claude-code/permissions
- https://docs.anthropic.com/en/docs/claude-code/agent-sdk/subagents
- https://opencode.ai/docs/agents
- https://opencode.ai/docs/commands
- https://opencode.ai/docs/config
- https://opencode.ai/config.json
- https://opencode.ai/docs/models
- https://opencode.ai/docs/permissions

## Additional Notes

The coordinator-worker split is an orchestration change, not execution-policy routing. Claude Code and opencode use a wrapper-level adapter seam to enter the coordinator; Copilot deliberately bypasses that shared coordinator entry path and retains its current inline path until a portable contract exists. Its documentation must distinguish that boundary from the availability of Copilot subagents.

`implementation.md` remains the source of truth; worker context is session-scoped optimization. The Claude binding runs the custom worker in the background, captures its agent ID, forwards answers with `SendMessage`, and waits for the next structured payload; the opencode binding captures and continues the explicit task worker by task ID. These identifiers are binding-owned dispatch metadata, not worker-authored payload fields. A failed continuation must fall back to a fresh worker that reconstructs state from current artifacts. The coordinator forwards a normalized envelope containing both the opencode wrapper-echo value and raw `$ARGUMENTS`; the worker preserves wrapper-echo precedence, performs existing 0/1/N resolution, and returns picker input requests through the coordinator when interaction is needed.

The existing implementation phase already covers prerequisite failures, change-picker behavior, argument and flag handling, glossary use, first-run and re-run planning, audit ingestion, ADR/DDR approval interaction, ADR creation and index maintenance, interface conformance when applicable, RED -> GREEN planning, and verification. The refactor must relocate ownership of those operations and every currently authorized phase write to the worker rather than redesign them. The worker response is intentionally not an artifact transport channel.

The coordinator must not consume task routing metadata, read OpenSpec artifacts, or inspect the codebase. Model metadata that remains descriptive is not an execution input.
