# ADR 0212: Cache warming is tool-owned and ends only on dispose

<!-- adr-index: amends 0202; refs 0210; refs 0211 -->

## Status

Accepted. Amends ADR 0202: its prose protocol, in which each agent resolves, remembers, and applies the chain id, the timings, and the final-response rule by following instructions, is replaced by a protocol that `wait.js` owns. ADR 0210 (unconditional dispose) and ADR 0211 (per-harness warming settings) stay as they are, and archived changes stay unedited.

## Context

ADR 0202 made every agent keep its own prompt cache warm by following `sai/policies/cache-warming.md`: it asked for a chain id with `wait.js chain`, passed its `interval` and `max` to `warm`, and armed after every response except a final one. Every silent failure found came from a model re-interpreting that prose:

- An omitted `--chain` disabled supersession, because `warm` accepted a call without one, and the policy's own arm template left it out.
- A missing Linux harness root surfaced only inside the background wait, where nobody read it, because the root is created by the harness and SAI never creates it.
- A subagent cannot know whether its coordinator will reuse it, so its own judgment of a "final response" (a result, a question, a step report) was a guess that decided whether warming stopped; a separate `warm-up` order and an extra model turn existed only to repair that guess.
- The dispatcher resolved the timings of each worker at every message and had to send them in the message, so every coordinator card carried the resolution.

## Decision

1. **`wait.js` owns the protocol; the prose keeps a few rules.** `skills/universal/sai-cache-warmer/wait.js` has a foreground `begin` subcommand. A subagent runs `begin --agent <name> --harness <claude|opencode>`: the tool reads the `model` of the installed agent file, resolves the timings from `sai/tools/project-settings.js`, writes a chain record that holds the agent's identity, and prints `{chain, warming}`, with `warming` either `off` (no chain, no process) or `{interval, max}`. `begin` runs in the foreground because the agent needs the chain and the timings before it can arm, and a failure is then visible in the same turn without causing a wake. A failed `begin` (for example the missing Linux harness root, whose message names the path) makes the agent print one line, arm nothing, and finish its task unchanged; SAI still never creates the harness root.
2. **`warm` requires a chain or a wake state and resolves the timings again every time.** `warm --chain <id>` arms and `warm --state <token>` re-arms after a wake. It takes no `--interval` or `--max`, and a call with neither flag, an unknown flag, a state with no chain, or a chain with no `begin` record exits 2 and arms nothing, in the argv and the JSON forms. The old `chain` subcommand no longer exists, so an agent running instructions from an earlier install gets exit 2 and loses warming until reinstall, with its task unchanged. Every arm and every wake resolves the timings from the identity in the chain record: a setting turned `off` makes the next wake return `finished`, and a new interval applies from the next wait with no restart. A wake keeps the window set by the arm. Every arm and wake refreshes the record's modification time, so the age prune never reaches a chain that still arms.
3. **Only dispose or the `max` window ends warming.** A dispatcher that disposes an agent adds the line `Warming: on, agent <name>. Fetch @sai/policies/cache-warming.md and follow it as a subagent.` to its task messages and continuations; the line carries no timings and the dispatcher resolves none. Workers, `budget-explorer`, and `budget-subagent` receive it and arm after every response, a result included; `budget-executor` receives none and never arms; the ready-only dispatch carries none; a worker that dispatches its own helpers sends them none. The "final response" classification and the `warm-up` order are retired. An agent nobody disposes (a handle lost to a compaction, a coordinator gone) stops arming `max` minutes after its last real message. The `warming: true|false` line stays as a diagnostic that gates no stop and no dispatch.
4. **The main session keeps arming until `max`.** It runs `begin --role agent --provider <p> [--model <m>] --harness <h>`, and its chain id derives from the harness session id (`CLAUDE_CODE_SESSION_ID`, `OPENCODE_SESSION_ID`, or `--session`), so a new command invocation in the same chat continues the same chain and at most one wait of the main session is live. It is never disposed, so after its closing report it keeps arming until `max` minutes after its last real message.
5. **On Claude Code, `TaskStop` is the whole dispose.** `TaskStop` on a subagent was observed to end its background `wait.js warm` process together with the agent, so no `dispose` message is sent first.
6. **Implementation departures from the plan.**
   - **Chain records of every role survive a closed window (review finding M1).** The plan released a subagent's chain record when its window closed or a wake resolved `off`. Then the next real message ran `warm --chain <id>`, found no record, exited 2, and the agent stopped warming for the rest of its life although each real message must re-arm with the same chain. The code keeps the chain record of every role when a window closes or the setting turns off; the 24-hour modification-time prune is the only remover. A stale wait of a closed window is still superseded, because the next arm bumps the generation.
   - **`begin --role agent` also takes `--interval` and `--max`.** The plan left the hand-off wait of `/sai-explore` to a later slice, but `warm` no longer takes timings, so its existing variant (timings from the user's answers) would have stopped working. `begin` therefore accepts both flags together for the main session and stores them in the chain record as the timings to use instead of the setting; `handoff-warming.md` and the policy's hand-off section call `begin` and then `warm --chain`. The fixed deadline, the consolidation of the hand-off description into the general protocol, and wake telemetry remain for later slices.

## Alternatives Considered

- **Coordinator-side warming (the coordinator pings its workers)** — rejected: each coordinator wake rereads a larger context and costs more than a worker wake.
- **Keep the design and fix only the omitted chain and the root error** — rejected: the class of failure comes from the prose protocol, so the protocol moved into the tool.
- **Create the Linux harness root from SAI** — rejected: the harness owns that root (`sai/tools/temp-root.js`), and an early, clear failure is enough.

## Consequences

- An agent that finishes its task keeps arming until it is disposed or `max` elapses, so a coordinator that disposes late pays wakes bounded by `max`.
- Each agent's first response gains one foreground tool call, `begin`.
- Instructions from an earlier installed version lose warming until reinstall; their task is unchanged.
- The main session keeps waking until `max` after its closing report.
- Chain records of closed windows stay on disk until the 24-hour prune.
- The `warming` setting stays off by default and nothing warms without a configured entry; a warming failure never changes an agent's task outcome. The hand-off wait still arms once and does not move its deadline on a real message.

## Provenance

Change `tool-owned-cache-warming`, decision "Cache warming is tool-owned and ends only on dispose".
