> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Users who prefer Claude Code as their harness can run selected workers on cheaper non-Anthropic models, choosing the model per worker. The earlier closure of #196 only covered the reverse case (opencode using a Claude subscription). With this change a Claude Code coordinator runs any agent whose Claude Code agent file carries a hand-set `harness: opencode` line through the OpenCode CLI, so the model, variant, permissions, and tools come from the OpenCode agent of the same name; agents without the line keep the `Agent` dispatch.

## What Changes

- New deterministic tool `sai/tools/opencode-dispatch.js` with three commands:
  - `route --agent <name> [--cwd <root>]` reads the `harness:` frontmatter key of the agent file Claude Code resolves (project `.claude/agents/` first, then the user-global `agents/` of the Claude Code root) and prints `{route, cause, agent, notice?}`. Only `harness: opencode`, with a runnable `opencode` binary that lists an agent of the same name, routes to `opencode`; every other case routes to `claude`, and a missing binary, missing agent, or unreadable agent listing adds a notice naming the agent and the cause.
  - `start --agent <name> --input-file <path>` and `continue --session <id> --input-file <path> [--agent <name>]` run one `opencode run --format json` turn without a shell and without `--auto`, passing the message file's text unchanged as the single argument after `--`, and print `{status, sessionID, text, tokens, cost, exit_code, error}`. A turn is `failed` on a non-zero exit, an `error` event, or (for `start`) no `sessionID`; exit codes are 0 (`ok`), 1 (`failed`), and 2 (usage error). Stopping the tool stops its `opencode run` process.
- New policy `sai/policies/opencode-dispatch.md`, the single source of opencode dispatch from Claude Code: the route query before every creation (replacements included), creation as a background `Bash` turn with the ready prompt in a file of a per-run message directory, continuation as a new background `continue` turn instead of `SendMessage`, the fallback to `Agent` with one visible notice when the route answers `claude` with a notice or when the ready turn fails, no cache-warming switch and `warming: false`, the `--harness claude` second task line after `--report-dir`, questions only as `needs_input` reports, and dispose with `TaskStop` on the `Bash` task of the running turn.
- The Claude Code routed-worker binding template (`sai/orchestration/workers/bindings/claude/standalone-worker-template.md`), the three Claude Code budget skills (`budget-explorer`, `budget-executor`, `budget-subagent`), and the design overview step (`sai/commands/design/steps/overview.md`) point to the policy for an opencode-routed agent.
- `sai/policies/worker-report-transport.md` § Author boundary defines an optional second task-disclosure line `--harness <claude|opencode>` after `--report-dir`, which a worker strips, retains, and passes as `--harness` to every `temp-root.js` or `transfer.js` call that takes one. This placement replaced an earlier free-standing `--harness claude` instruction appended to the message, which a live opencode agent rejected as an injection.
- `sai/policies/cache-warming.md` states that an opencode-routed agent receives no warming switch and declares `warming: false`; `sai/policies/worker-lifecycle.md` states the Claude Code stop call of an opencode-routed agent.
- `bin/install-flow.js` adds `harness` to `CLAUDE_TUNABLE_KEYS`, and `bin/doctor.js` reads the per-harness tunable-key constants, so install and doctor preserve a hand-set `harness:` line without drift. No agent template or preset ships the line.
- `bin/capabilities.js` grants opencode agents `external_directory` on the Claude Code SAI temp root, so an opencode-routed worker can save reports in the coordinator's report directory.
- `sai/install-manifest.json` adds `node {sai}/tools/opencode-dispatch.js *` to the `coordinator` capability profile shell rules.
- `docs/models.md` documents running a Claude Code agent on an OpenCode model, and `AGENTS.md` lists the new policy and tool.

## Capabilities

### New Capabilities

- `opencode-agent-dispatch`: routing of a Claude Code agent through the OpenCode CLI by the hand-set `harness:` frontmatter key, the `opencode-dispatch.js` route and turn commands, creation, continuation, fallback, warming, report transport, questions, and dispose of an opencode-routed agent.

### Modified Capabilities

- `agent-tunable-ownership`: the Claude Code tunable keys gain the hand-set `harness` key, which doctor reads from the per-harness constants and no shipped agent source carries.
- `opencode-temp-access-grant`: opencode agents are also granted the Claude Code SAI temp root.
- `claude-budget-agent-tunables`: the Claude budget skills point to the opencode dispatch policy for an agent file that carries `harness: opencode`.
- `budget-subagent-platform-bindings`: the Claude Code `budget-subagent` binding routes an opencode-routed agent through the opencode dispatch policy.
- `agent-self-warming`: an opencode-routed agent never receives the warming switch.
- `worker-dispatch-prompt-template`: the Claude binding template creates, continues, and disposes an opencode-routed worker through the opencode dispatch policy.
- `direct-build-report-transport`: the shared worker report policy defines the optional `--harness` line after `--report-dir`.

## Impact

New files:

- `sai/tools/opencode-dispatch.js`
- `sai/policies/opencode-dispatch.md`
- `test/opencode-dispatch.test.js`

Modified files:

- `AGENTS.md`
- `bin/capabilities.js`
- `bin/doctor.js`
- `bin/install-flow.js`
- `docs/models.md`
- `sai/commands/design/steps/overview.md`
- `sai/install-manifest.json`
- `sai/orchestration/workers/bindings/claude/standalone-worker-template.md`
- `sai/policies/cache-warming.md`
- `sai/policies/worker-lifecycle.md`
- `sai/policies/worker-report-transport.md`
- `skills/claude/budget-executor/SKILL.md`
- `skills/claude/budget-explorer/SKILL.md`
- `skills/claude/budget-subagent/SKILL.md`
- `test/agent-tunable-ownership.test.js`
- `test/capability-profiles.test.js`
- `test/claude-default-preset-alignment.test.js`
- `test/uninstall-enumeration.test.js`

Known limitations left behind:

- Each turn pays about 2–4 s of process startup.
- An opencode-routed agent receives no cache warming between turns.
- The agent's effective permissions are those of its OpenCode agent file, and an OpenCode `shell` deny is not a sandbox.
- Behaviour with several concurrent `opencode run` processes on one service is not verified.
- Per-worker token attribution in telemetry is out of scope; the `tokens` and `cost` fields of a turn are printed but not yet consumed.
- With opencode as the main harness, dispatch is unchanged.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Assumption to correct if wrong: the slicing places per-worker token attribution (E12, I7) in a second slice so the first slice stays reviewable; slice 1 does not implement E12. Not verified by the POC: concurrent `opencode run` processes on one service, cost reporting for a priced model (the test model reported `cost` 0, tokens only), and killing a `run --server` client.
