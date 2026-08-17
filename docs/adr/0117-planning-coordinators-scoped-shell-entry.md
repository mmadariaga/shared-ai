# ADR 0117: The three planning-phase coordinators receive the scoped `Bash(date:*)` entry as the sole allowed-tools exception

## Status

Superseded by [ADR 0144](./0144-planning-coordinators-drop-the-scoped-date-shell-entry.md)

## Context

The milestone-stamp capability requires the coordinator session to acquire each stamp with a wall-clock shell call (`stamp-emission-coordinator-only` of `sai-todo-timestamps`), but the applied tool-scoping doctrine — `per-command-tool-scoping`'s exact allowed-tools list plus the `design-coordinator` and `design-subagent-delegation` zero-I/O rules, enforced on Claude Code by the wrappers' `allowed-tools` frontmatter — denies every routed coordinator a shell tool. As specified, no planning-phase task list on Claude Code could ever receive a stamp: the only Claude session with a shell, the worker, is forbidden from stamping. The contradiction was found during design research and resolved by a user-approved in-place amendment (recorded in `.openspec.yaml` `approval.specs.amendment`).

## Decision

The spec, design, and implementation planning-phase coordinator wrappers (`commands/claude/sai-1-spec.md`, `commands/claude/sai-2-design.md`, `commands/claude/sai-3-implement.md`) change their `allowed-tools` frontmatter to `Read, Glob, Skill, Agent, SendMessage, AskUserQuestion, Bash(date:*)`. The scoped entry is the sole exception, limited to at most one call per render act for milestone-stamp wall-clock acquisition and to no other shell use. `Edit`, `Write`, and bare `Bash` remain unavailable everywhere; the review, security, performance, and accessibility coordinator lists are unchanged. On opencode, which has no per-command `allowed-tools` frontmatter contract, the grant is model-discipline: the delta specs permit the coordinator session to run the wall-clock command named by `per-harness-time-command` and no other shell work — the same mechanism by which `sai-explore`'s read-only guarantee is enforced on opencode.

## Alternatives Considered

- **Grant bare `Bash` to the three coordinators** — rejected: it violates the read-only scoping doctrine and the "Write-capable tools remain absent" scenario.
- **Acquire stamps worker-side and carry them in payloads** — rejected: it would change the worker contract and the lifecycle protocol, which the change explicitly preserves, and would break opencode where the shell/`todowrite` surface is coordinator-side.
- **Drop stamps on Claude Code** — rejected: it would defeat the capability on the primary harness.
- **A harness-native non-shell time API** — rejected: no such API is exposed to coordinator sessions.

## Consequences

The exception rides the enforced tool-scoping contract across three wrappers plus their exact-match test pins, so reversing it means editing the wrappers, the delta specs, and the pins together. The decision encodes the mechanism that upholds the coordinator-only stamp invariant — a permission grant, not a domain property — which is why this record is an ADR.

## Provenance

User — the in-place amendment was approved by the user during the design phase and recorded in `.openspec.yaml` `approval.specs.amendment`. Recorded as Decision 3 in `design.md` with the `adr` family marker.
