# explore-leave-confirmation Specification

## Purpose
TBD - created by archiving change confirm-before-leaving-explore. Update Purpose after archive.

## Requirements

### Requirement: Explore asks before leaving its flow

On every turn in which no route of the current slice is running, `/sai-explore` SHALL leave its flow only after the user picks `Stay`, `Pause`, or `Close` in a native leave selector. The window SHALL cover the stages from invocation start through the wait for the route selector answer, and again each time `explore-slice@1` is back in `waiting` with the route selector presented for a later or a parked slice. It SHALL end when a route answer starts a route, and running Plan and Direct Build routes SHALL keep their own park and abandon rules. The rule SHALL be written once, as rule 4 of `sai/commands/explore/instructions.md` beside the direct-looking request rule, and the agent SHALL never advise leaving explore on its own: when leaving looks useful, it SHALL ask through the selector. The `openspec-explore` reminder to exit explore mode SHALL be replaced by this rule and SHALL NOT be edited into that skill.

#### Scenario: A message that mainly asks to leave shows the selector

- **WHEN** no route is running and a user message's dominant intent is to stop exploring or to do other work than the idea under exploration
- **THEN** the leave selector is presented before that request runs

#### Scenario: The selector returns for a later or parked slice

- **WHEN** `explore-slice@1` is back in `waiting` with the route selector presented for a later or a parked slice and the session would leave the explore flow
- **THEN** the leave selector is presented

#### Scenario: A running route shows no selector

- **WHEN** a route answer has started a Plan or Direct Build route for the current slice
- **THEN** no leave selector is presented and that route's own park and abandon rules apply

### Requirement: Leaving is recognized by dominant intent

Leaving SHALL be any step that takes the session out of the explore flow: a user message whose dominant intent is to stop exploring or to do other work, recognized as `next-step` is, the agent's own proposal to go elsewhere, or a skill whose close proposes or requires going elsewhere. A side question answered inside explore, a quote, a negation, or a mere mention SHALL NOT be leaving. A skill that ends only by reporting SHALL NOT be leaving, and exploration SHALL continue at its stage. An implementation request SHALL follow the direct-looking request rule and show no selector. An explicit `/sai-*` command invocation SHALL show no selector, and a new `/sai-explore` SHALL reset the exploration, a paused one included.

#### Scenario: A side question stays inside explore

- **WHEN** the user asks a side question, quotes, negates, or merely mentions leaving
- **THEN** no leave selector is presented and the question is answered inside explore

#### Scenario: An implementation request is idea content

- **WHEN** the user writes "Implement …", "Fix …", or "Add …" during explore
- **THEN** the request is treated as idea content and no leave selector is presented

#### Scenario: A report-only skill continues the exploration

- **WHEN** a skill invoked during explore, such as `/from-backlog`, ends only by reporting
- **THEN** no leave selector is presented and the exploration continues at its stage

#### Scenario: An explicit command invocation asks nothing

- **WHEN** the user explicitly invokes a `/sai-*` command during explore
- **THEN** no leave selector is presented, and a new `/sai-explore` resets the exploration, discarding a paused one

### Requirement: The leave selector offers Stay, Pause, and Close

Before the request that leads out runs, the session SHALL present one closed-choice question through the harness-native picker (`AskUserQuestion` on Claude Code, `question` on opencode) in the chat language, with the options `Stay` (`stay`), `Pause` (`pause`), and `Close` (`close`) in that order. The text SHALL name the request that led out and say what each option does, including that Pause suspends the read-only rule so the chat may write files under the other request's own rules. A cancelled, dismissed, or ambiguous answer SHALL count as Stay. Stay SHALL change nothing and SHALL NOT run the request: the session asks its pending question again or shows its turn closure.

#### Scenario: Both harnesses use their native picker

- **WHEN** the leave selector is presented on Claude Code or on opencode
- **THEN** it uses `AskUserQuestion` or `question` respectively, with `Stay`, `Pause`, and `Close` in that order

#### Scenario: A dismissed selector counts as Stay

- **WHEN** the user cancels, dismisses, or answers the leave selector ambiguously
- **THEN** the exploration continues unchanged and the request that led out does not run

### Requirement: Pause keeps the exploration and suspends its contract

On Pause the session SHALL emit `intent=pause` to `explore-idea@1`, keeping the stage, the sections, the agreed lists, and after crystallization the blocks and the slice inventory in the store. It SHALL then dispose the live explorers, stop an active hand-off wait, and retire the main session's cache-warming chain when it has one, tell the user in one line that `resume-explore` returns to the exploration, and handle the request that led out under that request's own rules. While paused, a turn SHALL NOT be an explore turn: no explore contract applies, the read-only rule included, and explore tokens such as `next-step`, `review-loop`, `poc-lane`, and `goto` SHALL be ordinary text.

#### Scenario: Pause keeps the stage and lists

- **WHEN** the user picks Pause at a stage with agreed lists
- **THEN** the stage and lists stay in the store, the explorers are disposed, the warming chain is retired, and the request that led out runs

#### Scenario: Explore tokens are ordinary text while paused

- **WHEN** the user writes `next-step` or another explore token while the exploration is paused
- **THEN** no stage moves and no explore contract applies

### Requirement: Resume returns to the paused exploration

A paused exploration SHALL resume only on the literal token `resume-explore` or a clear request to go back to the exploration, recognized by the same bare-token and dominant-intent rule as `next-step`. On resume the session SHALL reload the explore instructions when they left context, complete the recovery load, emit `intent=resume`, start cache warming again when the session holds no chain, and return to the saved stage with the full explore contract, read-only rule included. When the pause happened with the route selector pending, the selector SHALL be presented again and no earlier answer SHALL be reused. A `resume-explore` without a paused exploration SHALL change nothing, and the session SHALL answer in one line that no exploration is paused.

#### Scenario: Resume restores the saved stage

- **WHEN** the user writes `resume-explore` while the exploration is paused
- **THEN** the exploration returns to the stage it was paused in with its full contract

#### Scenario: A pending route selector is presented again

- **WHEN** the exploration was paused with the route selector pending and the user resumes it
- **THEN** the route selector is presented again and no earlier answer is reused

#### Scenario: Resume without a pause changes nothing

- **WHEN** the user writes `resume-explore` and no exploration is paused
- **THEN** nothing changes and the session answers in one line that no exploration is paused

### Requirement: Close ends the exploration

On Close the session SHALL emit `intent=close-explore` to `explore-idea@1`, which discards the explore state and leaves the `closed` mark, then reset `explore-slice@1` and `direct-build-run@1` so the slice inventory, the parked cursors, the publication answer, and the Direct Build run state go too. It SHALL then end what the exploration holds as Pause does, clear its panel entries, and handle the request that led out. A closed exploration SHALL have no resume: only a new `/sai-explore` invocation starts a new one.

#### Scenario: Close discards the explore and slice state

- **WHEN** the user picks Close after crystallization with a slice inventory recorded
- **THEN** the explore state is discarded with the `closed` mark, both `explore-slice@1` and `direct-build-run@1` are reset, and the request that led out runs

#### Scenario: A closed exploration cannot be resumed

- **WHEN** the user writes `resume-explore` after Close
- **THEN** nothing changes and the session answers that no exploration is paused
