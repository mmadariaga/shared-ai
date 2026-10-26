# agent-self-warming Specification

## Purpose
TBD - created by archiving change subagent-cache-warming-core. Update Purpose after archive.

## Requirements

### Requirement: Single cache-warming policy

`sai/policies/cache-warming.md` SHALL be the single source for arming, waking, the `max` window, resolving timings, and disposing. Worker binding templates, budget helper skills on both harnesses, and the coordinator cards that dispatch workers SHALL fetch it rather than restate it. The user-invoked `/sai-cache-warmer` SHALL keep its own `prepare` and `wait` behavior.

#### Scenario: Binding template fetches the policy
- **WHEN** a Claude Code or opencode standalone worker binding template is rendered
- **THEN** it carries a `Warm and dispose` section that fetches `@sai/policies/cache-warming.md`

#### Scenario: User-invoked warmer is unchanged
- **WHEN** a user runs `/sai-cache-warmer`
- **THEN** `wait.js` still accepts its `prepare` and `wait` subcommands with their existing behavior

### Requirement: Dispatcher sends resolved timings

At every dispatch and every continuation of a subagent, the dispatcher SHALL resolve the subagent's timings with the `subagent` role from the provider and model of its installed agent `model` frontmatter, and, when the result is not `off`, SHALL end the task message with the line `Warming: Fetch @sai/policies/cache-warming.md and follow it as a subagent with interval {interval} and max {max}.` It SHALL send no such line when the result is `off`, in the ready-only dispatch of the two-phase handshake, or when the dispatcher cannot dispose (a worker that dispatches its own helpers). A non-zero resolver exit or unreadable output SHALL count as `off`.

#### Scenario: Warming resolved for a worker continuation
- **WHEN** a coordinator continues a worker whose resolved `subagent` timings are interval 4 and max 20
- **THEN** the continuation message ends with the warming line carrying interval 4 and max 20

#### Scenario: Ready-only dispatch carries no warming line
- **WHEN** a dispatcher sends the ready-only first phase of a two-phase dispatch
- **THEN** the message carries no warming line

### Requirement: Arm after each response

An agent that holds timings (a subagent whose latest real message carries the warming line, or a main session whose `agent`-role resolution is not `off`) SHALL, before ending each turn with its response, launch one background wait without awaiting it: `node <wait-path> warm` with `{"interval", "max"}` on stdin, through Claude Code `Bash` with `run_in_background: true` or the opencode background shell, where `<wait-path>` is the installed `sai-cache-warmer/wait.js`. It SHALL arm after every response, a question and a closing report included. When arming fails, the agent SHALL stop warming without retrying and its task outcome and report SHALL NOT change.

#### Scenario: Worker arms after its report
- **WHEN** a worker holding timings returns its terminal report
- **THEN** it launches one background `warm` wait and ends the turn with the report unchanged

#### Scenario: Arming fails
- **WHEN** the background wait cannot be launched because of a missing script or a permission refusal
- **THEN** the agent stops warming without retrying and its report is unchanged

### Requirement: Wake performs no work

On a wake, an agent SHALL act on the wait result: on `continue` it SHALL re-arm at once with the returned state unchanged and reply `ok`; on `finished` it SHALL reply `ok` and arm nothing. A main session SHALL resolve its `agent` timings again before re-arming, re-arm nothing when the result is `off`, and otherwise pass the resolved `interval` beside the state. A subagent whose latest real message carried no warming line SHALL arm nothing on a wake. A wake SHALL run no tool other than the re-arm, send no report, emit no stage or progress event, and write nothing. A message that is exactly `dispose` SHALL be answered `ok` with no further arming.

#### Scenario: Continue wake re-arms
- **WHEN** a wait completes with status `continue`
- **THEN** the agent re-arms with the unchanged state and replies only `ok`

#### Scenario: Dispose message ends warming
- **WHEN** an agent receives the message `dispose`
- **THEN** it replies `ok` and arms no further wait

### Requirement: Bounded warming window

The `warm` subcommand of `wait.js` SHALL take `interval` and `max` in minutes with no target time and no closing margin, SHALL reject a non-positive value or a `max` below `interval`, and SHALL open a window that closes `max` minutes after the first call. A re-arm SHALL pass the returned `state` back unchanged and MAY carry a freshly resolved `interval` without moving the closing instant. Each real task or continuation SHALL start a new window, and a real message that arrives while a wait is armed SHALL be handled as normal work, after which the agent arms again with that message's timings.

#### Scenario: Window closes after max
- **WHEN** `max` minutes have passed since the agent's last real task or continuation
- **THEN** the next wake returns `finished` and the agent arms nothing

#### Scenario: Re-arm with a new interval keeps the closing instant
- **WHEN** a main session re-arms with a freshly resolved `interval`
- **THEN** the wait uses the new interval and the window still closes at the original instant

### Requirement: Explorer shell grant for the wait

The explorer's shell restriction SHALL allow, besides `git grep` and `codegraph explore`, only the background wait that `cache-warming.md` defines, and the installed `research` and `coordinator` capability profiles SHALL grant `node {skills}/sai-cache-warmer/wait.js *`.

#### Scenario: Explorer arms its wait
- **WHEN** an explorer whose task message carries a warming line ends its response
- **THEN** its shell restriction permits the `wait.js warm` background command
