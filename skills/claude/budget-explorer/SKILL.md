---
name: budget-explorer
description: >
  Binds "cheap research subagent" to Claude Code subagent dispatch routed through the budget-explorer agent file. Read-only research and lookup with a 40 tool calls ceiling and output-contract discipline; multi-step synthesis stays with the main agent.
  TRIGGER when: "budget explorer", "cheap explorer", "budget mode", "cheap mode", "low-cost mode", "low cost mode", "economy mode"
license: MIT
compatibility: claude
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

## Subagent binding

"cheap research subagent" → `Agent(subagent_type: budget-explorer, run_in_background: true, prompt: <prompt>)`.

## Opencode routing

Fetch `@sai/policies/opencode-dispatch.md`

Before every creation of this agent, run the route query of that policy (§ Route). The query reads the agent file, so never decide the route yourself. It answers `claude`, and the `Agent` call above creates the agent, or `opencode`, and the policy creates, continues, and disposes the agent instead of that call.

## Model resolution

The subagent model is controlled by the `model` frontmatter of the resolved `budget-explorer.md` agent file: `.claude/agents/budget-explorer.md` takes precedence over `~/.claude/agents/budget-explorer.md`. Do not pass a per-spawn model parameter.

## Dispatch mode

Dispatch in the background only from a main agent, routed SAI coordinator, or routed SAI worker whose lifetime outlives the child. Capture the returned agent ID and await the handback on the dispatcher's own turn, matching each reply to its subagent by task ID when several run at once; never sleep or poll. A continuation (`SendMessage` to the captured agent ID) goes as `@sai/policies/worker-lifecycle.md` § Continuation timing says.

## Task boundary

Use this agent for bounded read-only lookup, research, and documentation reads. Multi-step synthesis and cross-file reasoning stay with the caller: the main agent, coordinator, or worker that dispatched it.

## Spawn prompt

Every spawn prompt states the **goal** and the **output contract**: exact response fields, a hard word-or-line length cap, and the raw-content rule (`no raw file contents`, or bounded verbatim excerpts when an audit needs them). State what to find, not how: a spawn prompt MUST NOT prescribe a research tool, a procedure, a numbered sequence of steps, or a method, because the tool-preference ladder in `@sai/policies/explore-agent.md` governs tool choice whatever the prompt says.

Every spawn prompt opens with the line `--report-dir <dir>`, the helper report directory the dispatcher opened with `transfer.js open`; the explorer saves its complete response there and replies with its `{path, sha256}` reference only, and there is no text reply. A Claude Code dispatcher that dispatches an explorer routed to opencode (`harness: opencode`, `@sai/policies/opencode-dispatch.md`) adds `--harness claude` as the second line. Creating the directory, accepting the reference before reading the report, recovering an undelivered report, and closing the directory follow `@sai/policies/worker-report-transport.md` § Budget agents, dispatcher side.

Fetch `@sai/policies/worker-report-transport.md`

## Warming and dispose

Fetch `@sai/policies/cache-warming.md`
Fetch `@sai/policies/worker-lifecycle.md`

A coordinator keeps one live explorer for its whole run and reuses it for its sequential searches, each later search being a continuation on the same handle; parallel searches start additional explorers. Its task message and every continuation end with the warming switch of `@sai/policies/cache-warming.md`, because its coordinator disposes it: the explorer arms after each result and stays warm between searches until then. The coordinator disposes the explorer as `@sai/policies/worker-lifecycle.md` says: not between searches, and at the route end, on abandon or stop, and at run close, whatever its `warming` diagnostic.

## Tool-call ceiling

At most 40 tool calls per execution segment: the spawn and every continuation each get their own 40. A caller may declare a smaller cap for one dispatch. When a task needs more, open another segment or spawn another bounded explorer instead of raising the ceiling.

Fetch `@sai/policies/explore-agent.md`
