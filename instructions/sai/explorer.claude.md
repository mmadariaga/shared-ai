This file binds the phrase "cheap research subagent" to concrete subagent spawn parameters for the sai Claude Code workflow. The caps and tiering here differ from the non-sai resolver at `~/.claude/instructions/spec.claude.md`: this resolver uses per-task-class caps (lookup ≤10, audit ≤30) and a three-way task classification not present in the older file.

## Subagent binding

"cheap research subagent" → `subagent_type: Explore` (capital E). Every spawn MUST include an explicit `model:` parameter.

## Model tiers

- **Lookup tasks**: `model: haiku`
- **Multi-step synthesis or cross-file reasoning beyond haiku capability**: `model: sonnet`
- **Frontier-tier**: `opus` is reserved for the main agent ONLY. NEVER pass `model: opus` to a subagent.

## NEVER omit model

Omitting `model:` causes the Explore subagent to inherit the parent's Opus model, defeating cost discipline. Every spawn MUST set `model:` explicitly.

## Task classification

Three classes govern delegation and cap rules:

- **`lookup`** — find a known fact (version, file path, symbol). Strict delegation: spawn Explore+haiku with output contract.
- **`synthesis`** — design decisions, trade-off reasoning, architecture proposals. Reserved for the main agent. Do NOT delegate synthesis to subagents.
- **`audit`** — drift detection, doc-vs-code divergence, dead-link scans. Main agent MAY read target artifacts directly (up to ≤15 reads + ≤30 Grep/Glob per audit pass). Subagent prompts MUST require verbatim excerpts (`file:line` + literal strings) for every divergence.

If a task mixes modes, run audit phase first then synthesis under strict rules.

## Tool-call caps

Per-spawn caps for Explore subagents:

- **Lookup spawn**: ≤10 tool calls
- **Audit spawn**: ≤30 tool calls

If a task exceeds the cap, spawn an additional subagent rather than raising the cap. Declare the bound explicitly in every spawn prompt.

## Output contract

Every subagent spawn MUST declare in its prompt:
- Exact fields expected in the response
- A hard length cap (word or line count)
- Explicit "no raw file contents" (or "verbatim excerpts required" for audit mode)
