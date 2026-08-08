---
name: budget-explorer
description: >
  Binds "cheap research subagent" to the opencode explore agent keyword. Model resolved via the explore agent file's model frontmatter (installed under ~/.config/opencode/agents/explore.md) — not hardcoded here.
  TRIGGER when: "use explorer", "use cheap subagent", "delegate research", "run cheap subagent", "spawn explore subagent", "cheap research agent", "use explore agent", "delegate lookup".
license: MIT
compatibility: opencode
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

## Subagent binding

"cheap research subagent" → `explore` (lowercase) when invoked as an OpenCode agent keyword.

## Dispatch mode

The opencode `task` tool has no `run_in_background` parameter; this binding runs synchronously by default. The dispatch-safety invariant defined in `openspec/specs/dispatch-safety-invariant/spec.md` is the containing rule for this case.

## Model resolution

The model for `explore` subagents is controlled by the `model` frontmatter of the explore agent file (`~/.config/opencode/agents/explore.md`), seeded by the installer under the `tunable-seed` lifecycle. This file contains no hardcoded model identifier.

## Tool-call caps

Per-spawn cap for `explore` subagents: ≤30 tool calls. If a task exceeds the cap, spawn an additional subagent rather than raising the cap.

## Cost model

This subagent runs on a commodity model. Its tier is controlled by the `model` frontmatter of the explore agent file (`~/.config/opencode/agents/explore.md`) — that setting is the only lever to change the cost of delegation.

**Why delegate:**
- **Cost:** Bulk I/O (reads, searches, diffs) is processed at a cheaper per-token rate than the main agent's model.
- **Context hygiene:** The subagent starts with a clean context — no task instructions, no conversation history — and returns only a structured summary, keeping the main agent's reasoning context uncontaminated.

**When to use:**
- Use `explore` for lookups, searches, and doc reads when the task is read-only and fits a structured-summary output contract. Reserve synthesis and judgment for the main agent.

## Output contract

Every subagent spawn MUST declare in its prompt:
- Exact fields expected in the response
- A hard length cap (word or line count)
- Explicit "no raw file contents" (or "verbatim excerpts required" for audit mode)
