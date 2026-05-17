This file binds the phrase "cheap research subagent" to concrete subagent spawn parameters for the sai OpenCode workflow. The model is resolved via project configuration (`opencode.jsonc`), not hardcoded in this file.

## Subagent binding

"cheap research subagent" → `explore` (lowercase) when invoked as an OpenCode agent keyword.

## Model resolution

The model for `explore` subagents is controlled by `agent.explore.model` in the project's `opencode.jsonc`. This file contains no hardcoded model identifier.

## Tool-call caps

Per-spawn cap for `explore` subagents: ≤30 tool calls. If a task exceeds the cap, spawn an additional subagent rather than raising the cap.

## Output contract

Every subagent spawn MUST declare in its prompt:
- Exact fields expected in the response
- A hard length cap (word or line count)
- Explicit "no raw file contents" (or "verbatim excerpts required" for audit mode)
