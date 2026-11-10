# agent-self-warming Specification

## Purpose
TBD - created by archiving change subagent-cache-warming-core. Update Purpose after archive.

## Requirements

### Requirement: Single cache-warming policy

`sai/policies/cache-warming.md` SHALL be the single source of the rules an agent follows for cache warming: the warming switch, `begin`, the foreground arm check, arming, waking, the `max` window, the `warming: true|false` diagnostic, and the hand-off wait. `skills/sai-cache-warmer/wait.js` SHALL own the protocol mechanics: the chain, the timings, the foreground arm check, the owner lease and single live wait of a chain, and the window. The policy SHALL define no `warm-up` order and no "final response" classification. It SHALL NOT define when a worker or helper ends: disposing SHALL belong to `sai/policies/worker-lifecycle.md`, to which `cache-warming.md` SHALL point, and the `warming` diagnostic SHALL gate no stop. Its "Stop your own wait" SHALL end the session's own background wait and then dispose every worker and helper still alive under `worker-lifecycle.md`. Worker binding templates, budget helper skills on both harnesses, helper output contracts, and the coordinator cards that dispatch workers SHALL fetch or point to `cache-warming.md` rather than restate it. The user-invoked `/sai-cache-warmer` SHALL keep its own `prepare` and `wait` behavior.

#### Scenario: Binding template fetches the policy
- **WHEN** a Claude Code or opencode standalone worker binding template is rendered
- **THEN** it carries a `Warm and dispose` section that fetches `@sai/policies/cache-warming.md` and `@sai/policies/worker-lifecycle.md`, states that the coordinator ends every task message and continuation with the warming switch because it disposes the worker, points to the `Warming diagnostic` section, and states that the coordinator disposes the worker whatever the warming setting

#### Scenario: User-invoked warmer is unchanged
- **WHEN** a user runs `/sai-cache-warmer`
- **THEN** `wait.js` still accepts its `prepare` and `wait` subcommands with their existing behavior

#### Scenario: Stopping your own wait disposes live agents
- **WHEN** a session stops the wait it armed itself through "Stop your own wait"
- **THEN** it ends its background wait task and disposes every worker and helper still alive under `worker-lifecycle.md`, whatever their `warming` diagnostic

### Requirement: Arm after each response

An agent whose `begin` returned timings SHALL, before ending each turn with its response, run the foreground arm check `node "<wait-path>" arm --chain <chain>`, and SHALL launch one background wait without awaiting it only when the check prints `launch: true`: `node "<wait-path>" warm --chain <chain>`, through Claude Code `Bash` with `run_in_background: true` and the description `cache-warm`, or the opencode background shell, where `<wait-path>` is the installed `sai-cache-warmer/wait.js`. `warm` SHALL take no `--interval` or `--max`. The JSON forms of `warm` (`--input-file <path>` or stdin) SHALL stay accepted but SHALL NOT be prescribed. It SHALL arm after every response, a result, a question (`needs_input`), and a step report alike, until its dispatcher disposes it or its `max` window closes; a main session, which is never disposed, SHALL keep arming after its closing report until its window closes. When the check or the launch fails (no shell, a permission refusal, a missing script, or an earlier installed `wait.js` that does not know `begin` or `arm`), the agent SHALL stop warming without retrying, a subagent SHALL declare `warming: false` in that same message, and its task outcome and report SHALL NOT otherwise change. The same rule SHALL apply on Claude Code and opencode. A completed wait SHALL return `state_token`, the returned state encoded as one base64url token with no brace or quote, beside `status`, `waited_ms`, and `state`, and a re-arm SHALL pass it unchanged as `--state <state_token>` with no other flag. A hand-off wait (see the requirement "Hand-off wait with a fixed deadline") is the exception for a main session: it arms only at the end of the hand-off close, not after later responses.

#### Scenario: Worker arms after its report
- **WHEN** a worker whose `begin` returned timings returns a step report, a `needs_input` question, or a terminal result
- **THEN** it runs the foreground arm check, launches the one background `warm --chain <chain>` that a `launch: true` answer allows, and ends the turn with its response unchanged except for its `warming: true` line

#### Scenario: No arm after a final response
- **WHEN** a `budget-executor` returns its result, or an agent whose `begin` returned `off` returns its final response
- **THEN** it launches no wait and ends the turn with the response unchanged

#### Scenario: Arming fails
- **WHEN** the arm check or the background wait cannot be run because of a missing script or a permission refusal
- **THEN** the agent stops warming without retrying, declares `warming: false` in that message, and its report is otherwise unchanged

#### Scenario: Re-arm with the state token
- **WHEN** a wait completes with `continue` and returns a `state_token`
- **THEN** the agent re-arms with `warm --state <state_token>` unchanged, typing no JSON, brace, or quote

#### Scenario: Malformed state token is rejected
- **WHEN** `warm --state` receives a value that does not decode to a state object
- **THEN** `wait.js` fails with exit 2 and an error that names `--state`, and arms no wait

### Requirement: Wake performs no work

On a wake, an agent SHALL act on the wait result: on `continue` it SHALL re-arm at once with `warm --state <state_token>` carrying the returned token unchanged and reply `ok`; on `finished` it SHALL reply `ok` and arm nothing. `wait.js` SHALL resolve the timings again from the identity in the chain record at every wake: when the setting turned `off`, the wait SHALL return `finished`, and a new `interval` SHALL apply from that wait, with no agent restart. A subagent whose latest real message carried no warming switch SHALL arm nothing after it. A wake SHALL run no tool other than the re-arm, send no report, emit no stage or progress event, and write nothing. A message that is exactly `dispose` SHALL be answered `ok`, and from then on the agent SHALL answer every wake with `ok` and arm nothing. A hand-off wait whose timings came from the user's answers (see the requirement "Hand-off wait with a fixed deadline") keeps those timings at every wake instead of resolving the setting.

#### Scenario: Continue wake re-arms
- **WHEN** a wait completes with status `continue`
- **THEN** the agent re-arms with the unchanged state token and replies only `ok`

#### Scenario: Dispose message ends warming
- **WHEN** an agent receives the message `dispose`
- **THEN** it replies `ok`, arms no further wait, and answers each later wake of a wait it armed with `ok` alone

#### Scenario: Setting turned off while warming
- **WHEN** the `warming` setting turns the agent off while its wait is armed and the agent re-arms after a wake
- **THEN** the re-armed wait returns `finished` and the agent replies `ok` and arms nothing

### Requirement: Bounded warming window

The `warm` subcommand of `wait.js` SHALL wait with the timings in minutes resolved from the chain record, with no target time and no closing margin, and timings that are non-positive or whose `max` is below `interval` SHALL be rejected. Each `warm --chain` SHALL open a window that closes `max` minutes after that arm. A live wait SHALL sleep in short chunks and, after each chunk, renew its owner lease and re-read the chain's generation and closing instant, so it picks up a window the arm check extended and retires within one chunk when it loses ownership. A re-arm after a wake SHALL pass the returned state back unchanged and SHALL keep the closing instant, while a freshly resolved `interval` applies without moving it. Each real task or continuation SHALL start a new window, and a real message that arrives while a wait is armed SHALL be handled as normal work, after which the agent arms again through the arm check; the earlier wait is superseded and retires within one chunk. An agent that is never disposed SHALL stop arming once `max` minutes have passed since its last real message. A chain whose record holds a fixed deadline (see the requirement "Hand-off wait with a fixed deadline") is the exception: every `warm --chain` on it SHALL supersede the earlier wait and keep the window's closing instant at the stored deadline, and an arm at or after the deadline SHALL return `finished` with `waited_ms` 0 and open no new generation.

#### Scenario: Window closes after max
- **WHEN** `max` minutes have passed since the agent's last real task or continuation
- **THEN** the next wake returns `finished` and the agent arms nothing

#### Scenario: Re-arm with a new interval keeps the closing instant
- **WHEN** the setting's `interval` changes while an agent warms and the agent re-arms after a wake
- **THEN** the wait uses the new interval and the window still closes at the original instant

#### Scenario: Arm on a chain with a fixed deadline
- **WHEN** `warm --chain <chain>` runs again on a chain whose record holds a fixed deadline that has not passed
- **THEN** the earlier wait is superseded and the new wait closes at the stored deadline, not `max` minutes after this arm

#### Scenario: Arm after the fixed deadline
- **WHEN** `warm --chain <chain>` runs at or after the chain's fixed deadline
- **THEN** it returns `finished` with `waited_ms` 0 and the chain's generation does not change

#### Scenario: Arm check extends the live window
- **WHEN** the arm check reuses a live wait
- **THEN** it moves the closing instant to now plus `max`, and the live wait picks up that instant within one chunk

### Requirement: Explorer shell grant for the wait

The explorer's shell restriction SHALL allow, besides `git grep`, `codegraph explore`, and the fetch tool of the fetch skill run in the form its `SKILL.md` gives, only the three `wait.js` commands that `cache-warming.md` defines, the foreground `begin`, the foreground arm check, and the background `warm`, and the installed `research` and `coordinator` capability profiles SHALL grant `node {skills}/sai-cache-warmer/wait.js *`.

#### Scenario: Explorer arms its wait
- **WHEN** an explorer whose task message ends with the warming switch ends its response
- **THEN** its shell restriction permits the foreground `wait.js begin`, the foreground `wait.js arm`, and the background `wait.js warm`

### Requirement: Single live wait chain per agent

Each agent SHALL own one chain of waits. `begin` SHALL return the chain id, and `wait.js` SHALL offer no separate `chain` subcommand. `warm` SHALL require `--chain <id>` or `--state <token>`: a `warm` with neither, in the argv form or the JSON forms, SHALL exit 2 as a usage error and arm nothing; `--chain` together with `--state` SHALL be a usage error; a chain with no `begin` record SHALL be rejected as a usage error; and a `warm` with no arguments and no input SHALL fail after a short grace period instead of hanging. The chain record SHALL hold the generation, the owner token of the wait that currently owns the chain, that owner's lease with its last renewal instant, and the waiting window. Each `warm --chain` SHALL take ownership under an exclusive lock on the record: it SHALL store a new random owner token, bump the generation, and start its interval only after the previous owner released its lease or the lease went stale. A live wait SHALL renew its lease every few seconds; a lease that stopped renewing for a fixed small multiple of the renewal period SHALL count as stale. A wait that no longer owns the chain — its generation is no longer current, its owner token differs, its lease cannot be renewed, or a cutoff mark is newer than its arm instant — SHALL return `finished` within one chunk and clear its lease. No PID SHALL be stored and no process SHALL be killed. One agent's arm SHALL NOT supersede another agent's chain. `wait.js` SHALL reject a chain id that is not 16 lowercase hexadecimal characters. It SHALL keep a chain record when that chain's window closes or its setting turns off, so the same agent can arm again with the same chain while the generation keeps counting up; it SHALL refresh the record's modification time at every `begin`, arm, and wake; and it SHALL prune records whose modification time is older than 24 hours, so the prune never reaches a chain that still arms, whatever `max` is. A lock file older than its staleness bound SHALL be removed, so a crashed writer never blocks the chain. The mechanism SHALL be identical on Claude Code and opencode.

#### Scenario: A real message supersedes the earlier wait
- **WHEN** an agent arms again with `warm --chain <chain>` after a real message while an earlier wait of its chain is armed
- **THEN** the earlier wait returns `finished` within one chunk and only the newest generation stays live

#### Scenario: Chains of different agents are independent
- **WHEN** two agents warming in parallel each arm with their own chain id
- **THEN** neither arm supersedes the other agent's wait

#### Scenario: Chain id request
- **WHEN** an agent runs `begin` and the warming is on
- **THEN** `begin` prints a chain id of 16 lowercase hexadecimal characters, which the agent passes with every later `warm --chain`

#### Scenario: Path-like chain id
- **WHEN** a `warm` call carries a chain id that is not 16 lowercase hexadecimal characters
- **THEN** `wait.js` rejects it with exit 2 and writes no chain record

#### Scenario: Warm without a chain
- **WHEN** `warm` runs with neither `--chain` nor `--state`, in the argv form or a JSON form
- **THEN** it exits 2 as a usage error and arms nothing

#### Scenario: Reused agent warms again after its window closed
- **WHEN** an agent's window closed and a later real message reaches the same agent
- **THEN** its chain record still exists and the agent arms again with the same chain id

#### Scenario: Live chain survives the age prune
- **WHEN** a chain keeps arming or waking for longer than 24 hours since its `begin`
- **THEN** each arm and wake refreshes its record, and the prune does not remove it

#### Scenario: Concurrent arms leave exactly one owner
- **WHEN** two `warm --chain` calls run at the same time on one chain
- **THEN** exactly one owns the chain with the later generation and the other returns `finished`

#### Scenario: A wait that loses ownership retires within one chunk
- **WHEN** a later arm takes the chain while an earlier wait sleeps
- **THEN** the earlier wait returns `finished` within one chunk

#### Scenario: A stale lease is replaced
- **WHEN** a wait crashed or was suspended and its lease is stale
- **THEN** the next arm check launches a new wait, and the old process exits with `finished` when it resumes

#### Scenario: A warm without an arm check takes ownership
- **WHEN** `warm --chain <chain>` runs without a preceding arm check
- **THEN** it takes ownership and the previous wait retires within one chunk

#### Scenario: A stale lock does not block the chain
- **WHEN** the chain record's lock file is older than its staleness bound
- **THEN** the next operation removes the lock and continues

### Requirement: Warming cutoff ends earlier chains

On every wake, `wait.js` SHALL read the cutoff mark `warming-cutoff.json` under the harness's SAI temp root, and a wait armed before the recorded cutoff instant SHALL return `finished`, whatever its agent. Waits armed after the cutoff SHALL follow the timings then in force. Because the mark lives in the harness's SAI temp root, it SHALL also end the chains of sessions in other projects on the same harness, which resume cold at their next real message.

#### Scenario: Wait armed before the cutoff
- **WHEN** a wait completes and the cutoff mark is newer than its arm instant
- **THEN** it returns `finished` and the agent arms nothing

#### Scenario: Wait armed after the cutoff
- **WHEN** a wait was armed after the cutoff mark was written
- **THEN** it follows its own window and timings

### Requirement: Wake acknowledgement is not a result

A dispatcher SHALL treat a subagent message that is exactly `ok`, ignoring surrounding whitespace, as the reply of a wake: it SHALL NOT process it as a report, a ready, or a step result, SHALL spend no attempt on it, SHALL send no continuation, and SHALL keep waiting for the real result of the task. The `ok` SHALL NOT be a real message and SHALL carry no warming field. `sai/policies/cache-warming.md` SHALL define this rule for Claude Code and opencode alike.

#### Scenario: Worker replies ok on a wake
- **WHEN** a coordinator waiting for a worker's result receives the message `ok`
- **THEN** it records no result and no attempt and keeps waiting for the real result

### Requirement: Hand-off wait with a fixed deadline

`sai/policies/cache-warming.md` SHALL define a hand-off wait for a command that sends the user to another chat and waits for the user's return: an ordinary `wait.js` chain of the main session whose window is a fixed deadline that `wait.js` owns. The command SHALL settle the timings (from the `warming` setting for the `agent` role, or from the user's answers to its question) and SHALL pass them explicitly as `begin --role agent --provider <provider> [--model <model>] --harness <claude|opencode> --interval <interval> --max <max> --fixed-deadline`. `begin` SHALL read `--interval` and `--max` with the same duration parser that `wait.js` uses for its other intervals (`intervalMilliseconds`), so each value SHALL be a positive number with an optional unit `s`, `sec`, `m`, `min`, `h`, or `hr`, a value with no unit counting in minutes (`20`, `30 min`, `4h`), and a compound such as `1h30` SHALL be refused; `begin` SHALL reject `--interval` and `--max` as a usage error unless both are given in an accepted form with `max` at least `interval`, and the usage message SHALL name the accepted forms. The chain record SHALL then hold the deadline, `max` minutes after that `begin`, and no arm or wake SHALL move it. The command SHALL run the foreground arm check and launch `warm --chain <chain>` only when it prints `launch: true`, only at the end of the hand-off close; the check SHALL reuse a live wait and never move the deadline, and after the deadline it SHALL launch nothing. A real message other than the event the command waits for SHALL re-arm nothing. A wake SHALL re-arm with `--state <state_token>` carrying the returned token unchanged, and the command SHALL replace the task id it holds with the new background task's id while the chain stays the same. The timings SHALL stay as passed to `begin` at every wake. At the deadline the wait SHALL return `finished` and nothing SHALL be armed. The task id, chain, and answers SHALL live in the conversation only, never in the `sai-state` store or a repository file. The rule SHALL be the same on Claude Code and opencode.

#### Scenario: Wake with user-supplied timings
- **WHEN** a hand-off wait whose timings came from the user's answers wakes
- **THEN** the command re-arms with `--state <state_token>` unchanged and no other flag, the wait keeps the timings passed to `begin`, and the command records the new task id

#### Scenario: Deadline reached
- **WHEN** the hand-off wait reaches its deadline
- **THEN** the wait returns `finished`, the command replies `ok`, and nothing is armed

#### Scenario: Timings from the setting
- **WHEN** the hand-off timings come from the `warming` setting for the `agent` role
- **THEN** the command passes that `interval` and `max` to `begin` with `--fixed-deadline`, and a later wake keeps them without resolving the setting again

#### Scenario: Picker forms accepted by begin
- **WHEN** `begin --role agent` runs with `--interval "30 min"` and `--max 4h`, or with `--interval 20` and `--max "20 min"`, and `--fixed-deadline`
- **THEN** it stores a 30-minute interval and a 240-minute deadline, or a 20-minute interval and a 20-minute deadline, and returns a chain

#### Scenario: Compound duration refused by begin
- **WHEN** `begin --role agent` runs with `--max 1h30`
- **THEN** it fails as a usage error that names the accepted forms and writes no chain record

#### Scenario: Hand-off close runs the arm check
- **WHEN** the hand-off close arms its fixed-deadline wait
- **THEN** it runs the foreground arm check first and launches `warm --chain <chain>` only when the check prints `launch: true`, holding the task id only when a wait launched

### Requirement: Stopping an ended wait is harmless

"Stop your own wait" in `sai/policies/cache-warming.md` SHALL apply to the hand-off wait as well as the benchmark measurement, and a stop that finds the background task already ended SHALL be harmless and SHALL spend no attempt.

#### Scenario: Stop after the deadline
- **WHEN** a command stops its hand-off wait after the wait already ended
- **THEN** the stop finds nothing to end, reports no failure, and spends no attempt

### Requirement: Foreground begin resolves the timings

`wait.js begin` SHALL run in the foreground in the first response of an agent that received the warming switch, and of a main session that runs a command, before its first arm. A subagent SHALL call `begin --agent <agent> --harness <claude|opencode>`, and `begin` SHALL read the provider and model from the `model` frontmatter of the installed agent file, searching the project-local agents folder, then the install root, then the user-global folder: on Claude Code the provider is `anthropic` and the model is the value as written; on opencode the value is `<provider>/<model>`. A main session SHALL call `begin --role agent --provider <provider> [--model <model>] --harness <claude|opencode>`. `begin` SHALL resolve the timings from the `warming` setting through `sai/tools/project-settings.js` and the SAI temp root through `sai/tools/temp-root.js`, store the agent's identity in its chain record, and print `{"chain": "<id>", "warming": {"interval", "max"}}`. When the setting has no entry for the agent or turns it off, `begin` SHALL print `{"chain": null, "warming": "off"}` and write no chain record, and the agent SHALL arm nothing for the session. `begin` SHALL reject `--agent` combined with `--role`, `--provider`, `--model`, `--interval`, or `--max`, and a harness other than `claude` or `opencode`, as a usage error with exit 2. `begin` SHALL accept the valueless switch `--fixed-deadline` for a main session only: it SHALL reject the switch as a usage error with exit 2 when `--interval` and `--max` are not both given or when `--agent` is given, and with the switch it SHALL store in the chain record a deadline `max` minutes after that `begin`. An ordinary `begin` of a chain that holds a live wait SHALL keep that wait's owner lease, interval, max, and closing instant, so the next arm check reuses the running wait; a `begin` with `--fixed-deadline` SHALL clear them and set the new deadline. A later `begin` of the same chain without the switch SHALL rewrite the record with no deadline. When the SAI temp root cannot be resolved (on Linux, a missing harness root, which SAI never creates), `begin` SHALL fail in the foreground with a non-zero exit and a message; the agent SHALL print one line naming that message, arm nothing, and finish its task unchanged. A main session's chain SHALL be derived from the harness session identifier (`CLAUDE_CODE_SESSION_ID` on Claude Code, `OPENCODE_SESSION_ID` on opencode, or an explicit `--session <id>`), so a later `begin` in the same chat returns the chain that chat already owns. A main-session `begin`, the hand-off `begin` included, that receives no session identifier SHALL fail as a usage error with a non-zero exit and a message that names the missing variable and states that nothing was armed, SHALL write no chain record, and SHALL NOT open a new chain, because a new chain for each call would allow two live waits of one main session; the session SHALL then run without warming, under the same one-line rule as any other failed `begin`. A subagent `begin` (`--agent`) SHALL need no session identifier and SHALL behave as before.

#### Scenario: Setting off
- **WHEN** `begin` runs and the `warming` setting has no entry for the agent, or turns it off
- **THEN** it prints `{"chain": null, "warming": "off"}`, writes no chain record, and the agent starts no background process

#### Scenario: Missing Linux harness root
- **WHEN** `begin` runs on Linux with warming on and the harness root does not exist
- **THEN** `begin` exits non-zero in the foreground, the agent prints a one-line notice, arms nothing, and finishes its task unchanged

#### Scenario: Subagent reads its installed agent file
- **WHEN** a subagent runs `begin --agent budget-explorer --harness claude`
- **THEN** the timings are resolved for provider `anthropic`, the model of the installed `budget-explorer.md`, and the `subagent` role

#### Scenario: Later invocation in the same chat
- **WHEN** a second command invocation in the same chat runs `begin --role agent`
- **THEN** it returns the chain the chat already owns, so at most one wait of the main session is live

#### Scenario: Subagent flags mixed with main-session flags
- **WHEN** `begin` receives `--agent` together with `--provider`
- **THEN** it exits 2 and writes no chain record

#### Scenario: Fixed deadline without explicit timings
- **WHEN** `begin --role agent` receives `--fixed-deadline` without both `--interval` and `--max`, or `begin --agent` receives `--fixed-deadline`
- **THEN** it exits 2 as a usage error

#### Scenario: Fixed deadline stored by begin
- **WHEN** `begin --role agent` runs with `--interval`, `--max`, and `--fixed-deadline`
- **THEN** the chain record holds a deadline `max` minutes after that `begin`, and a later `begin` of the same chain without the switch removes it

#### Scenario: Main session without a session id
- **WHEN** `begin --role agent --harness claude` runs with no `--session` and no `CLAUDE_CODE_SESSION_ID`, or `begin --role agent --harness opencode` runs with no `--session` and no `OPENCODE_SESSION_ID`
- **THEN** it fails as a usage error naming that variable, writes no chain record, and the session prints one line and arms nothing

#### Scenario: Subagent without a session id
- **WHEN** `begin --agent <agent>` runs with no harness session identifier
- **THEN** it resolves the timings and returns a chain as before

#### Scenario: Ordinary begin keeps the live wait
- **WHEN** an ordinary `begin` runs on a chain that already holds a live wait with its owner lease and window
- **THEN** the record keeps that lease, interval, max, and closing instant, and the next arm check reuses the running wait

#### Scenario: Fixed-deadline begin clears the live wait
- **WHEN** `begin` runs with `--interval`, `--max`, and `--fixed-deadline` on a chain that holds a live wait
- **THEN** the record clears the owner lease and window and sets the new deadline, so the next arm check launches a new wait

### Requirement: Dispatcher sends the warming switch

A dispatcher that disposes an agent SHALL end the task message and every continuation to it with the line `Warming: on, agent {agent}. Fetch @sai/policies/cache-warming.md and follow it as a subagent.`, naming the agent's installed name and carrying no timings. Workers and `budget-explorer` SHALL receive it, and a `budget-subagent` SHALL receive it only on a continuation that a card sends, because its one-shot task message is followed by its dispose. `budget-executor` SHALL never receive it and SHALL never arm. The ready-only dispatch of the two-phase handshake, a one-shot helper task, and every message of a dispatcher that cannot dispose (a worker that dispatches its own helpers) SHALL carry no switch, so only an agent that disposes another one enables its warming. A message that carries no switch SHALL arm nothing for a subagent and SHALL supersede nothing: an earlier wait of that subagent's chain SHALL keep re-arming at each wake until its window closes or the agent is disposed. The dispatcher SHALL resolve no timings and SHALL keep no state about the agent's warming, except that on opencode it SHALL keep the `warming:` line of each worker's last real message with that worker's handle, which decides only whether a `none` shell listing at dispose still needs the `dispose` message.

#### Scenario: Worker continuation carries the switch
- **WHEN** a coordinator continues a worker it will dispose
- **THEN** the continuation ends with the warming switch naming the worker's installed agent and carries no interval or max

#### Scenario: Ready-only dispatch carries no switch
- **WHEN** a dispatcher sends the ready-only first phase of a two-phase dispatch
- **THEN** the message carries no warming switch

#### Scenario: Executor never receives the switch
- **WHEN** a coordinator sends a task to a `budget-executor`
- **THEN** the task message carries no warming switch and the executor arms nothing

#### Scenario: Helper of a worker
- **WHEN** a worker that cannot dispose dispatches its own helper
- **THEN** it sends no warming switch, so the helper never arms

#### Scenario: Message without a switch to a warming subagent
- **WHEN** a subagent whose wait is armed receives a real message that carries no switch
- **THEN** it arms nothing new, and its earlier wait keeps re-arming at each wake until its window closes or it is disposed

### Requirement: Foreground arm check decides whether to launch

After each response, an agent whose `begin` returned timings SHALL run `node "<wait-path>" arm --chain <chain>` in the foreground before ending the turn. The check SHALL print one JSON decision, `{"launch": true|false}`, and the agent SHALL launch one background `warm --chain <chain>` only when `launch` is `true`. An `arm` without `--chain` SHALL exit 2 as a usage error and launch nothing. The agent SHALL NOT decide itself, and both harnesses SHALL follow the same rule.

#### Scenario: Launch answer starts one wait
- **WHEN** the arm check prints `{"launch": true}`
- **THEN** the agent launches one background `warm --chain <chain>` and ends the turn with its response

#### Scenario: No-launch answer starts nothing
- **WHEN** the arm check prints `{"launch": false}`
- **THEN** the agent launches no wait and ends the turn with its response

#### Scenario: Arm without a chain
- **WHEN** `arm` runs without `--chain`
- **THEN** it exits 2 as a usage error and arms nothing

### Requirement: Arm check reuse and replacement rules

The arm check SHALL reuse a live wait with a fresh owner lease, the resolved interval and max, and an arm instant not earlier than the cutoff mark; it SHALL extend that wait's window to `now` plus `max` and print `launch: false`. Otherwise, with warming on, it SHALL print `launch: true`. A fixed-deadline chain SHALL reuse its wait and never move the deadline, printing `launch: false` after it; warming off SHALL print `launch: false`.

#### Scenario: A live valid wait is reused
- **WHEN** the arm check finds a live wait with a fresh lease, the same interval and max, and no newer cutoff mark
- **THEN** it extends the wait's window to now plus max and prints `{"launch": false}`

#### Scenario: Changed timings launch a new wait
- **WHEN** the resolved interval or max differs from the live wait's
- **THEN** the arm check prints `{"launch": true}` and the agent launches a new wait

#### Scenario: Stale lease launches a new wait
- **WHEN** the live wait's lease is older than the staleness bound
- **THEN** the arm check prints `{"launch": true}`

#### Scenario: Cutoff mark launches a new wait
- **WHEN** the cutoff mark is newer than the live wait's arm instant
- **THEN** the arm check prints `{"launch": true}`

#### Scenario: Warming off launches nothing
- **WHEN** the warming setting resolves to off for the agent
- **THEN** the arm check prints `{"launch": false}`

#### Scenario: Fixed deadline is reused and never moved
- **WHEN** the arm check runs on a fixed-deadline chain before its deadline
- **THEN** it reuses the live wait, keeps the deadline, and prints `{"launch": false}`; at or after the deadline it prints `{"launch": false}` without launching
