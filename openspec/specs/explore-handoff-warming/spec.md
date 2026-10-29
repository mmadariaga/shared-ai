# explore-handoff-warming Specification

## Purpose
TBD - created by archiving change explore-handoff-cache-warming. Update Purpose after archive.

## Requirements

### Requirement: Hand-off warming runs only at a hand-off close with a pending slice

`/sai-explore` SHALL keep its own prompt cache warm, through the step file `sai/commands/explore/steps/handoff-warming.md`, only at a hand-off close: the successful end of a Plan - Unattended slice or of a sliced Manual hand-off, where the user goes to another chat and returns with `next-slice`. The Plan - Unattended close SHALL load the step file as its last step when the design segment completed, and the sliced Manual hand-off SHALL load it as the last step of the turn after the hand-off and the recommendation are printed; the single-change Manual path SHALL load nothing. The step SHALL neither ask nor warm unless the recorded slice set holds at least one slice, other than the one just handed off, that is not done. The Direct Build route SHALL be unaffected. Claude Code and opencode SHALL follow the same behavior.

#### Scenario: Plan close with a pending slice
- **WHEN** a Plan - Unattended slice closes successfully and another slice is still pending
- **THEN** explore runs the hand-off warming step as the last step of that close

#### Scenario: Last slice or failed plan
- **WHEN** the closed slice is the last one, the change has no slices, or the Plan run stopped, blocked, or failed
- **THEN** explore neither asks a warming question nor arms a wait

#### Scenario: Single-change Manual hand-off
- **WHEN** the Manual route prints a single-change hand-off
- **THEN** no hand-off warming step is loaded

### Requirement: The warming setting supplies the hand-off timings

Before asking, the step SHALL run `project-settings.js warming --provider <provider> --model <model> --role agent` with the main session's provider and model. An `origin: none` result, a non-zero exit, or unreadable output SHALL mean no entry applies and SHALL lead to the question. A `warming: "off"` result with any other origin SHALL mean configured off: explore SHALL neither warm nor ask. A `warming: {interval, max}` result SHALL be applied with `max` as the duration, with no question and no TTL notice, and SHALL be resolved again at the next hand-off close.

#### Scenario: Configured agent entry
- **WHEN** the `warming` setting has an entry for the `agent` role with an interval and a `max`
- **THEN** explore arms the hand-off wait with that interval and `max` as the duration, without asking

#### Scenario: Configured off
- **WHEN** the resolved `warming` value is `off` with an origin other than `none`
- **THEN** explore neither asks nor warms

#### Scenario: No applicable entry
- **WHEN** the lookup returns `origin: none`
- **THEN** explore asks the hand-off warming question

### Requirement: Hand-off warming question

When no setting entry applies and no earlier answer exists in the invocation, explore SHALL print a harness cache-lifetime notice in the chat language and then ask both questions in one native picker call. The notice SHALL state, on Claude Code, 1 hour with a Claude subscription and 5 minutes with pay-per-token, and on opencode that the lifetime depends on the provider and that `/sai-context-cache-ttl-benchmark` measures it; it SHALL say that each wake costs two short requests and that an interval longer than the cache lifetime saves nothing. The interval question SHALL offer `30 min (Recommended)`, `4 min`, and `No`, and the duration question SHALL offer `4h (Recommended)`, `2h`, and `1h`; both SHALL accept free text as a positive number of minutes. An interval of `No`, or a dismissed picker, SHALL mean no warming and SHALL ignore the duration. An unanswered duration, or a free-text interval with no duration, SHALL be `4h`. When a free text gives no positive number of minutes or the interval exceeds the duration, explore SHALL ask the two questions once more, and when the second answer is also invalid it SHALL not warm and SHALL say so in one line.

#### Scenario: Recommended answers
- **WHEN** the user picks `30 min (Recommended)` and `4h (Recommended)`
- **THEN** explore arms the hand-off wait with a 30-minute interval and a 240-minute duration

#### Scenario: Interval declined
- **WHEN** the user picks `No` for the interval or dismisses the picker
- **THEN** explore arms no wait and ignores the duration

#### Scenario: Invalid answer twice
- **WHEN** the interval exceeds the duration in both the first answer and the repeated question
- **THEN** explore does not warm and says so in one line

### Requirement: Hand-off answers are invocation-scoped conversation state

The first valid answer, or the decision not to warm, SHALL apply to every later hand-off close of the same `/sai-explore` invocation with no new question. The answers, the wait's chain, and its background task id SHALL live in conversation state only: explore SHALL write nothing to a settings file, the `sai-state` store, or the repository.

#### Scenario: Second hand-off close in the same invocation
- **WHEN** a later hand-off close happens after the user already answered the question
- **THEN** explore applies that answer without asking again

### Requirement: Hand-off wait arms once with a fixed deadline

Explore SHALL arm the hand-off wait once, as the last tool call of the hand-off close turn, with `wait.js warm`, reusing the chain it holds or obtaining one with `wait.js chain`, and SHALL hold the background task id and the chain. The deadline SHALL be `max` minutes after that arm. Only a wake SHALL re-arm the wait, with the state it returned, and each wake re-arm SHALL replace the held task id with the new task's id. A real message other than `next-slice` SHALL neither re-arm the wait nor move the deadline, and a repeated hand-off text while a wait is held SHALL arm nothing. At the deadline the wait SHALL end by itself with no further wake. When arming fails (no shell, a missing `wait.js`, a refused permission), explore SHALL say so in one line and the hand-off close SHALL continue unchanged.

#### Scenario: Real message while away
- **WHEN** the user sends a message other than `next-slice` while the hand-off wait is armed
- **THEN** explore does not re-arm the wait and the deadline stays at the original instant

#### Scenario: Arming fails
- **WHEN** `wait.js` cannot be run at the hand-off close
- **THEN** explore reports it in one line and the hand-off close continues unchanged

### Requirement: next-slice and a new invocation stop the hand-off wait

When `next-slice` fires, explore SHALL stop the hand-off wait before anything else of that turn, whichever route closed the slice, through the cache-warming policy's "Stop your own wait" (`TaskStop` with the held task id on Claude Code, removal of that task's shell on opencode). An invocation turn of a new `/sai-explore` in the same chat SHALL stop the earlier invocation's wait the same way and discard its hand-off answers. With no wait held, nothing SHALL be stopped or reported.

#### Scenario: User returns with next-slice
- **WHEN** the user sends `next-slice` while a hand-off wait is held
- **THEN** explore stops the wait first and then closes the slice

#### Scenario: New explore invocation
- **WHEN** a new `/sai-explore` invocation starts in a chat that holds an earlier invocation's hand-off wait
- **THEN** explore stops that wait and discards the earlier hand-off answers before resetting its stage machines

### Requirement: Hand-off warming documentation

`docs/commands/sai-explore.md` SHALL describe the hand-off warming, its question and options, the fixed deadline, and its stops, and `docs/project-settings.md` SHALL state that `/sai-explore` reads `warming` for the `agent` role at its hand-off closes and writes nothing to the settings file.

#### Scenario: Reader looks up hand-off warming
- **WHEN** a reader opens the `/sai-explore` page or the `warming` setting documentation
- **THEN** it explains when explore warms at a hand-off close and where the timings come from
