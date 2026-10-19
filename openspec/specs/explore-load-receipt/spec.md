# explore-load-receipt Specification

## Purpose
TBD - created by archiving change explore-load-receipt. Update Purpose after archive.

## Requirements

### Requirement: Explore load ends with a load receipt

The `/sai-explore` load SHALL be the sequence of reads and calls of the command, from the wrapper through `sai-state spawn`, and SHALL end with a load receipt. The load receipt SHALL consist of two tool outputs: the `verdict: pass` of the `prereqs.js` check and the id returned by `sai-state spawn`. Only those two tool outputs SHALL count as the receipt, and only when both were produced after the most recent `/sai-explore` invocation in the chat; a receipt produced before the latest invocation SHALL NOT count. `sai/commands/explore/body.md` SHALL hold this rule in a `## Load receipt` section, its single source.

#### Scenario: Receipt from the latest invocation counts

- **WHEN** the prerequisite check returned `verdict: pass` and `sai-state spawn` returned an id, both after the most recent `/sai-explore` invocation in the chat
- **THEN** the load receipt is present and the explore turn handles its message

#### Scenario: Receipt from an earlier invocation does not count

- **WHEN** the only `verdict: pass` and spawn id in the chat were produced before the most recent `/sai-explore` invocation
- **THEN** the load receipt is treated as missing

### Requirement: Every explore turn checks the load receipt

Every explore turn, meaning any turn after a `/sai-explore` invocation, SHALL start by looking for the load receipt. With the receipt present, the turn SHALL handle its message. With the receipt missing, including after an interrupted load, a compaction that removed the receipt, or a stale cached wrapper, the turn SHALL first complete the load (the prerequisite check, the instruction loads, and `sai-state spawn`, with the invocation's arguments) and then handle its message. A recovery load, meaning a turn that is not an invocation, lacks the load receipt, and completes the load before answering, SHALL run `sai-state spawn` only and SHALL NOT reset either explore machine. It SHALL keep the current stage, the agreed lists, and the slice inventory, because `sai-state spawn` with the same key returns the existing session.

#### Scenario: Missing receipt triggers a recovery load

- **WHEN** an explore turn starts and no load receipt from the latest invocation exists
- **THEN** the turn completes the load first and only then handles the turn's message

#### Scenario: Recovery load keeps progression state

- **WHEN** a recovery load runs within the same invocation after stage progress, agreed lists, or a slice inventory were recorded
- **THEN** the load runs `sai-state spawn` only, no machine reset runs, and the current stage, the agreed lists, and the slice inventory are kept

### Requirement: Deferred messages wait for the load receipt

A user message that arrives while the load is in progress SHALL receive a one-line acknowledgement and SHALL be evaluated once the load receipt exists, in arrival order, for every load including a recovery load. A deferred message that invokes a skill or command SHALL run once the receipt exists, under the explore contract (read-only, with staged progression), and exploration SHALL continue at its current stage when it finishes. Claude Code (a message delivered mid-turn) and opencode (a queued user message) SHALL follow the same deferral rule and the same receipt check.

#### Scenario: Queued command runs after the load

- **WHEN** a `/from-backlog <url>` message arrives while the explore load is in progress
- **THEN** the message is acknowledged in one line, runs once the load receipt exists under the read-only explore contract, and exploration then continues at its current stage

#### Scenario: Multiple deferred messages keep arrival order

- **WHEN** several messages arrive during the load
- **THEN** each is evaluated after the receipt exists, in the order it arrived

### Requirement: Load interruption outcomes

A cancellation during the load SHALL take effect at once: the load SHALL stop and the remaining deferred messages SHALL be discarded. On a prerequisite `verdict: halt`, the command SHALL print the policy's literal for the reported `failed_check` and close, and deferred messages SHALL then be handled as ordinary chat outside explore. When `sai-state spawn` fails during the load, the load SHALL stop with the store error visible, and the next explore turn SHALL retry the load through the turn check.

#### Scenario: Cancellation discards deferred messages

- **WHEN** the user cancels while the load is in progress and deferred messages are pending
- **THEN** the load stops immediately and the pending deferred messages are discarded

#### Scenario: Prerequisite halt closes the command

- **WHEN** the prerequisite check returns `verdict: halt` during the load
- **THEN** the command prints the literal for the reported `failed_check`, closes, and deferred messages are handled as ordinary chat outside explore

#### Scenario: Spawn failure is retried on the next turn

- **WHEN** `sai-state spawn` fails during the load
- **THEN** the load stops with the store error visible and the next explore turn retries the load through the receipt check

### Requirement: Explore wrappers carry a receipt pointer only

The canonical wrapper sources `commands/claude/sai-explore.md` and `commands/opencode/sai-explore.md` SHALL each carry one context-pointer line placed first after the frontmatter, leading with `Receipt:` and pointing to `@sai/commands/explore/body.md § Load receipt`. The wrappers SHALL NOT restate the receipt rule; the rule text SHALL live only in `body.md`. The installed Claude Code and opencode `sai-explore` wrappers SHALL carry the same pointer line.

#### Scenario: Pointer leads the wrapper body

- **WHEN** either wrapper source is read
- **THEN** the first line after the closing frontmatter delimiter starts with `Receipt:` and names `@sai/commands/explore/body.md § Load receipt`, and the wrapper contains no deferred-message rule text

#### Scenario: Installed wrappers keep the pointer

- **WHEN** the Claude Code or opencode installer projects `sai-explore.md`
- **THEN** the installed wrapper contains a line starting with `Receipt:` that names `@sai/commands/explore/body.md § Load receipt`

### Requirement: An invocation resets both explore machines

On an invocation turn, meaning a user message that runs `/sai-explore`, the load in `sai/commands/explore/body.md` SHALL run `sai-state reset <id> explore-idea@1` and `sai-state reset <id> explore-slice@1` right after `sai-state spawn`, on the id that spawn returned. The invocation SHALL start from the initial stage, empty agreed lists, and no slice inventory, even when the chat holds the load receipt of an earlier invocation.

#### Scenario: Second invocation starts fresh

- **WHEN** the user runs `/sai-explore` again in a chat whose earlier invocation recorded stage progress, agreed lists, or a slice inventory
- **THEN** the load runs `sai-state spawn`, then resets `explore-idea@1` and `explore-slice@1` on the returned id, and the new invocation starts at the initial stage with empty lists and no slice inventory
