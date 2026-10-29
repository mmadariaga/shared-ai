# agent-self-warming Specification

## Purpose
TBD - created by archiving change subagent-cache-warming-core. Update Purpose after archive.

## Requirements

### Requirement: Single cache-warming policy

`sai/policies/cache-warming.md` SHALL be the single source for arming, waking, the `max` window, resolving timings, the `warming: true|false` declaration, the `warm-up` order, and disposing, including the rule that a dispatcher disposes only after a `warming: true` declaration. Worker binding templates, budget helper skills on both harnesses, helper output contracts, and the coordinator cards that dispatch workers SHALL fetch or point to it rather than restate it. The user-invoked `/sai-cache-warmer` SHALL keep its own `prepare` and `wait` behavior.

#### Scenario: Binding template fetches the policy
- **WHEN** a Claude Code or opencode standalone worker binding template is rendered
- **THEN** it carries a `Warm and dispose` section that fetches `@sai/policies/cache-warming.md` and points to its `Warming declaration` section

#### Scenario: User-invoked warmer is unchanged
- **WHEN** a user runs `/sai-cache-warmer`
- **THEN** `wait.js` still accepts its `prepare` and `wait` subcommands with their existing behavior

### Requirement: Dispatcher sends resolved timings

At every dispatch and every continuation of a worker, the dispatcher SHALL resolve the worker's timings with the `subagent` role from the provider and model of its installed agent `model` frontmatter, and, when the result is not `off`, SHALL end the task message with the line `Warming: Fetch @sai/policies/cache-warming.md and follow it as a subagent with interval {interval} and max {max}.` It SHALL send no such line when the result is `off`, in the ready-only dispatch of the two-phase handshake, when the dispatcher cannot dispose (a worker that dispatches its own helpers), or in a helper's task message or continuation: the only order that makes a helper arm SHALL be `warm-up`, which carries that line. A non-zero resolver exit or unreadable output SHALL count as `off`.

#### Scenario: Warming resolved for a worker continuation
- **WHEN** a coordinator continues a worker whose resolved `subagent` timings are interval 4 and max 20
- **THEN** the continuation message ends with the warming line carrying interval 4 and max 20

#### Scenario: Ready-only dispatch carries no warming line
- **WHEN** a dispatcher sends the ready-only first phase of a two-phase dispatch
- **THEN** the message carries no warming line

#### Scenario: Helper task carries no warming line
- **WHEN** a coordinator with active warming sends a task to a budget explorer, executor, or task subagent
- **THEN** the task message carries no warming line

### Requirement: Arm after each response

An agent that holds timings (a subagent whose latest real message carries the warming line, either a worker message or a `warm-up`, or a main session whose `agent`-role resolution is not `off`) SHALL, before ending each turn with its response, launch one background wait without awaiting it: `node <wait-path> warm` with `{"interval", "max"}` on stdin, through Claude Code `Bash` with `run_in_background: true` or the opencode background shell, where `<wait-path>` is the installed `sai-cache-warmer/wait.js`. It SHALL arm after every response except its final response: a question (`needs_input`) and an intermediate step report SHALL keep arming, and after a final response (a coordinator's closing report, or a worker's terminal result `completed`, `failed`, or `cancelled`) it SHALL arm nothing, so a finished session never wakes again. A subagent SHALL report the outcome in the warming field of its message. When arming fails, the agent SHALL stop warming without retrying, a subagent SHALL declare `warming: false` in that same message, and its task outcome and report SHALL NOT otherwise change. The same rule SHALL apply on Claude Code and opencode.

#### Scenario: Worker arms after its report
- **WHEN** a worker holding timings returns an intermediate step report or a `needs_input` question
- **THEN** it launches one background `warm` wait and ends the turn with the report unchanged except for its `warming: true` declaration

#### Scenario: No arm after a final response
- **WHEN** a worker holding timings returns a terminal result, or a coordinator holding timings prints its closing report
- **THEN** it launches no wait and ends the turn with the response unchanged

#### Scenario: Arming fails
- **WHEN** the background wait cannot be launched because of a missing script or a permission refusal
- **THEN** the agent stops warming without retrying, declares `warming: false` in that message, and its report is otherwise unchanged

### Requirement: Wake performs no work

On a wake, an agent SHALL act on the wait result: on `continue` it SHALL re-arm at once with the returned state unchanged and reply `ok`; on `finished` it SHALL reply `ok` and arm nothing. A main session SHALL resolve its `agent` timings again before re-arming, re-arm nothing when the result is `off`, and otherwise pass the resolved `interval` beside the state. A subagent whose latest real message carried no warming line SHALL arm nothing on a wake. A wake SHALL run no tool other than the re-arm, send no report, emit no stage or progress event, and write nothing. A message that is exactly `dispose` SHALL be answered `ok` with no further arming.

#### Scenario: Continue wake re-arms
- **WHEN** a wait completes with status `continue`
- **THEN** the agent re-arms with the unchanged state and replies only `ok`

#### Scenario: Dispose message ends warming
- **WHEN** an agent receives the message `dispose`
- **THEN** it replies `ok` and arms no further wait

### Requirement: Bounded warming window

The `warm` subcommand of `wait.js` SHALL take `interval` and `max` in minutes with no target time and no closing margin, SHALL reject a non-positive value or a `max` below `interval`, and SHALL open a window that closes `max` minutes after the first call. A re-arm SHALL pass the returned `state` back unchanged and MAY carry a freshly resolved `interval` without moving the closing instant. Each real task or continuation SHALL start a new window, and a real message that arrives while a wait is armed SHALL be handled as normal work, after which the agent arms again with that message's timings and its chain id; the earlier wait is superseded and its late wake returns `finished`.

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

### Requirement: Single live wait chain per agent

Each agent SHALL own one chain of waits. `wait.js chain` SHALL print a fresh chain id as `{"chain": "<id>"}` without reading standard input, and an agent SHALL run it once in the foreground before its first arm and pass that id with the arm that follows every real message. The `warm` state SHALL carry the chain id, a generation, and the arm instant. A first `warm` call SHALL bump the chain's generation in a private chain record under the harness's SAI temp root, resolved through `sai/tools/temp-root.js`; a first call without a `chain` id SHALL start a new chain. A wait whose generation is no longer the chain's current one SHALL return `finished` when it completes, whether it was superseded before or during its sleep, and a re-arm after a wake SHALL pass the state, and so its chain, back unchanged. One agent's arm SHALL NOT supersede another agent's chain. `wait.js` SHALL reject a chain id that is not 16 lowercase hexadecimal characters, SHALL remove a chain record when that chain's current wait finishes, and SHALL prune chain records older than 24 hours on a first arm. The mechanism SHALL be identical on Claude Code and opencode.

#### Scenario: A real message supersedes the earlier wait
- **WHEN** an agent arms again with its chain id after a real message while an earlier wait of its chain is armed
- **THEN** the earlier wait returns `finished` at its wake and only the newest generation stays live

#### Scenario: Chains of different agents are independent
- **WHEN** two agents warming in parallel each arm with their own chain id
- **THEN** neither arm supersedes the other agent's wait

#### Scenario: Chain id request
- **WHEN** an agent runs `wait.js chain`
- **THEN** it prints a fresh chain id without reading standard input

#### Scenario: Path-like chain id
- **WHEN** a `warm` call carries a chain id that is not 16 lowercase hexadecimal characters
- **THEN** `wait.js` rejects it and writes no chain record

### Requirement: Warming cutoff ends earlier chains

On every wake, `wait.js` SHALL read the cutoff mark `warming-cutoff.json` under the harness's SAI temp root, and a wait armed before the recorded cutoff instant SHALL return `finished`, whatever its agent. Waits armed after the cutoff SHALL follow the timings then in force. Because the mark lives in the harness's SAI temp root, it SHALL also end the chains of sessions in other projects on the same harness, which resume cold at their next real message.

#### Scenario: Wait armed before the cutoff
- **WHEN** a wait completes and the cutoff mark is newer than its arm instant
- **THEN** it returns `finished` and the agent arms nothing

#### Scenario: Wait armed after the cutoff
- **WHEN** a wait was armed after the cutoff mark was written
- **THEN** it follows its own window and timings

### Requirement: Wake acknowledgement is not a result

A dispatcher SHALL treat a subagent message that is exactly `ok`, ignoring surrounding whitespace, as the reply of a wake: it SHALL NOT process it as a report, a ready, or a step result, SHALL spend no attempt on it, SHALL send no continuation, and SHALL keep waiting for the real result of the task. The `ok` SHALL NOT be a real message: it carries no warming field and leaves the latest declared value unchanged. `sai/policies/cache-warming.md` SHALL define this rule for Claude Code and opencode alike.

#### Scenario: Worker replies ok on a wake
- **WHEN** a coordinator waiting for a worker's result receives the message `ok`
- **THEN** it records no result and no attempt, keeps the worker's latest warming declaration, and keeps waiting for the real result
