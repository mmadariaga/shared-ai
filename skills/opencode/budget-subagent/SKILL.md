---
name: budget-subagent
description: >
  Binds cost-controlled task delegation to the OpenCode `budget-subagent` agent keyword. Model resolved via the budget-subagent agent file's model frontmatter (installed under ~/.config/opencode/agents/budget-subagent.md) — not hardcoded in here. Use for general-purpose task delegation (file operations, searches, writes, code analysis).
  TRIGGER when: "budget subagent", "cheap subagent", "budget task", "cheap task", "budget mode", "cheap mode", "low-cost mode", "economy mode"
license: MIT
compatibility: opencode
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

Fetch `@sai/policies/budget-agent.md`

## OpenCode Binding

- **Agent keyword**: `budget-subagent` (lowercase)
- **Model resolution**: controlled by the `model` frontmatter of the budget-subagent agent file (`~/.config/opencode/agents/budget-subagent.md`), seeded by the installer under the `tunable-seed` lifecycle; this file hardcodes no model.
- **Tool-call cap**: none enforced by the harness; the fetched policy's approximately 30-call behavioral limit governs the task.

## Spawn prompt

Give one task per spawn: what to do, the files or area it covers, and, when you need a specific result, the exact shape to return. Without a shape the subagent returns its structured completion report. Split independent tasks into separate spawns.

## Dispatch mode

Dispatch in the background only from a main agent, routed SAI coordinator, or routed SAI worker whose lifetime outlives the child: `subagent(agent: "budget-subagent", description: "budget-subagent", prompt: <prompt>, background: true)`. Capture the returned `sessionID` and await the completion notification on the dispatcher's own turn, matching each notification to its subagent by `sessionID` when several run at once; never sleep or poll. A continuation passes the same `agent` plus the captured `sessionID` and `background: true`, and only after the previous notification has arrived.

## Warming and dispose

Fetch `@sai/policies/cache-warming.md`
Fetch `@sai/policies/worker-lifecycle.md`

The task message carries no warming line, and the result declares `warming: false`. When the card you follow reuses the subagent after an idle stretch, send it the policy's `warm-up` order first. The coordinator disposes the helper after its result, as `@sai/policies/worker-lifecycle.md` says, whatever its `warming` declaration.

## Cost model

This subagent runs on a commodity model; the `model` frontmatter named in the binding is the only lever on the cost of delegation.

- **Cost:** bulk I/O (reads, searches, writes, and code analysis) is processed at a cheaper per-token rate than the caller's model.
- **Context hygiene:** the subagent starts with a clean context and returns only its report, so scoped work stays out of the caller's context.
- **Scope boundaries:** one task per spawn keeps the delegation cheap and the report parseable. The fetched `budget-agent.md` policy owns the result shape, the permission-block abort, the completion criterion (result achieved or call cap reached, reporting what was tried), and the approximately 30-call behavior.
