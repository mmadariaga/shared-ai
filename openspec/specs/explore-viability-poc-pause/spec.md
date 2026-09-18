# explore-viability-poc-pause Specification

## Purpose
TBD

## Requirements

### Requirement: The viability POC lane is an independently loadable step

The POC lane SHALL be stated in exactly one step file, `sai/commands/explore/steps/poc-lane.md`, which owns the lane from candidate agreement onward: the `C1..Cn` agreement stop, the pinned Direct Build `--no-specs` execution, the reversible isolation, the verdict, and the verdict menu. The trigger — the two motives, the no-fire test, and the go/no-go ask — SHALL be stated once in `sai/commands/explore/steps/common.md` and SHALL NOT be restated or re-litigated in the lane file, which SHALL also name the late explicit entry intent as the lane's second entry without restating that gate's own recognition rules. `sai/commands/explore/steps/crystallization-protocol.md` SHALL own no part of the lane: it SHALL NOT trigger it, SHALL NOT resume a suspended one, and SHALL ask nothing about it; its single exception SHALL be user-authored, an explicit POC request during the `Crystallize` stage that leaves crystallization for the lane under the `common.md` late-entry gate. The lane file SHALL be follow-loaded through `next.follow` and SHALL NOT be reached by a nested `Fetch @` directive. The lane SHALL NOT be a slice of the crystallized set, SHALL NOT appear on the Idea Progress List, SHALL NOT renumber friction or skeleton slices, and SHALL NOT clear the stage TODO. While the lane is the current stage, the pre-crystallization closure SHALL be satisfied by the lane's own pending stop and no stage-aware reminder SHALL be appended. The lane SHALL behave identically whichever entry intent brought it there: the same candidate agreement, the same pinned profile, the same verdict vocabulary, the same verdict menu, and the same return into `Review edge cases`.

#### Scenario: the pause is entered through the lane step

- **WHEN** the user accepts the go/no-go at the close of the `Explore change` stage
- **THEN** the `poc-lane` intent is emitted and the lane is entered through the returned `next.follow` at `poc-lane.md`, with no pause at crystallization and no feature block withheld

#### Scenario: the lane file is the single source of the lane text

- **WHEN** the crystallization protocol is read
- **THEN** it contains no go/no-go option label, no verdict menu entry, no `poc-lane` or `poc-lane-late` intent emit, and no `Fetch` directive naming `poc-lane.md`, while `poc-lane.md` contains the candidate agreement stop, the execution, the verdict, and the verdict menu

#### Scenario: crystallization points at the shared gate instead of restating it

- **WHEN** the crystallization protocol describes what happens if the user asks for a POC during the `Crystallize` stage
- **THEN** it names the `common.md` late-entry gate as the owner and restates neither the intent emit nor the recognition rules

### Requirement: The POC trigger is evaluated at the close of stage 1

`sai-explore` SHALL judge exactly once, before the progression leaves the `Explore change` stage, whether the idea warrants a disposable POC, and that trigger SHALL be stated in exactly one place, `sai/commands/explore/steps/common.md`. A POC is an experiment that discriminates between competing candidates, so the trigger SHALL fire only when competing candidates exist, on either of two motives: **technical viability**, when the technical or integration approach is unproven because the idea depends on a third party, service, or API the project has not integrated and the available documentation, examples, or prior art do not demonstrate the required integration pattern, in which case the candidates are the competing strategies; or **bug diagnosis**, when the idea fixes a bug whose cause is not established and several root-cause theories compete to explain the observed behavior, in which case the candidates are those theories. The trigger SHALL NOT fire for product or UX uncertainty, and SHALL NOT fire when mutually exclusive candidates with a discriminating observable cannot be formulated. When it fires, `sai-explore` SHALL present a go/no-go through the harness-native picker with exactly two options in this order: `Yes, run a POC before continuing`, which emits the `poc-lane` intent to `explore-idea@1` and follows the returned `next.follow`; and `No, continue without a POC`, which continues the progression to `Review edge cases` with the technical risk accepted. Declining SHALL close the automatic prompt for that idea and SHALL NOT close the lane itself: the axis SHALL NOT be re-evaluated and SHALL NOT be raised again for that idea on `sai-explore`'s own initiative, while the user's explicit late entry from stages 2 through 4 SHALL remain available.

#### Scenario: an unproven integration fires the viability motive

- **WHEN** the idea depends on a third party the project has not integrated and the available documentation does not demonstrate the required integration pattern
- **THEN** the go/no-go is presented at the close of `Explore change` with `Yes, run a POC before continuing` and `No, continue without a POC` in that order

#### Scenario: competing root-cause theories fire the diagnosis motive

- **WHEN** the idea fixes a bug whose cause is not established and several root-cause theories compete to explain the observed behavior
- **THEN** the same go/no-go is presented at the close of `Explore change` with the theories as the candidates

#### Scenario: product uncertainty never fires the trigger

- **WHEN** the uncertainty concerns product demand, UX preference, or whether users want the proposed behavior
- **THEN** the trigger does not fire and the progression continues to `Review edge cases` without a POC

#### Scenario: no discriminating observable means no POC

- **WHEN** mutually exclusive candidates with a discriminating observable cannot be formulated for the idea
- **THEN** the axis does not fire, no POC runs, and the progression continues to `Review edge cases`

#### Scenario: declining the go/no-go is final for that idea

- **WHEN** the user selects `No, continue without a POC`
- **THEN** the progression continues to `Review edge cases` with the technical risk accepted, and the automatic prompt is closed for that idea: the axis is never re-evaluated and the question is never raised again at any later stage transition, leaving only the user's own explicit late request as a way into the lane

### Requirement: The candidate list is agreed before the POC runs

Before running the POC, `sai-explore` SHALL propose the competing candidates as a numbered list `C1` through `Cn`, each one plain sentence naming what would be observed if that candidate were the right one, and SHALL ask one plain conversational question in the ambient conversation language asking whether the list captures the competing candidates or needs adjustment. A candidate SHALL be a strategy to prove under the viability motive or a root-cause theory to rule out under the diagnosis motive, and a single lane run MAY mix both kinds when both motives fired on the same idea, always as one POC and never one POC per motive. The answer SHALL be evaluated by dominant semantic intent with the same mechanics as the `E1..En` gate: clear confirmation or a bare `next-step` turn with a non-empty list records the ordered list as agreed and runs the POC in the same turn; a disagreement, removal, addition, or material revision — including a same-turn revision paired with `next-step` — updates and renumbers the list, keeps the stop open, and re-asks without running the POC; an ambiguous answer stays discussion. The agreed list SHALL be recorded with a `recordedList` emit to `explore-idea@1`, which SHALL NOT advance the stage. The stop SHALL NOT use a native yes/no picker and SHALL NOT require a fixed agreement phrase.

#### Scenario: confirmation runs the POC in the same turn

- **WHEN** the user confirms the proposed `C1..Cn` list or sends a bare `next-step` against a non-empty list
- **THEN** the ordered list is recorded as agreed without advancing the stage and the POC runs in that same turn

#### Scenario: a revision keeps the stop open

- **WHEN** the user adds, removes, or materially changes a candidate, including in the same turn as `next-step`
- **THEN** the list is updated and renumbered, the question is re-asked, and no POC runs

#### Scenario: both motives share one candidate list

- **WHEN** both the viability and the diagnosis motive fired on the same idea
- **THEN** one candidate list mixing strategies and theories is agreed and one POC runs for it

### Requirement: The POC verdict names the winning agreed candidate or none

The POC verdict SHALL be exactly `<Cn> wins` or `none`, where `<Cn>` is one of the agreed candidates. It SHALL NOT be a judgment of the POC's code quality and SHALL NOT name a candidate outside the agreed list: a cause or strategy the POC reveals that was not on the list SHALL make the verdict `none`. `sai-explore` SHALL report the verdict with the concrete observation that produced it and then take exactly one of two branches. On `<Cn> wins` it SHALL present a harness-native picker with exactly two options in order — `Continue with <Cn>`, which emits `next-step` to `explore-idea@1` and advances to `Review edge cases` carrying the proven change when the winner was a strategy or the proposed fix for the confirmed root cause when the winner was a theory; and `Stay here`, which does not advance, does not discard the idea, and runs no crystallization. On `none` it SHALL present no advancement option, SHALL stop the lane, SHALL report what was learned including any cause or strategy outside the agreed candidates, and SHALL wait for instructions with no auto-advance, no progression reset, and no crystallization.

#### Scenario: a winning candidate carries the concrete change into stage 2

- **WHEN** the POC confirms an agreed candidate and the user selects `Continue with <Cn>`
- **THEN** the progression advances to `Review edge cases` with the proven change or the proposed fix on the table

#### Scenario: an unlisted cause makes the verdict none

- **WHEN** the POC reveals a cause or strategy that was not among the agreed candidates
- **THEN** the verdict is `none` rather than a new winner

#### Scenario: a none verdict waits for instructions

- **WHEN** the verdict is `none`
- **THEN** the lane stops, reports what was learned, and presents no advancement option, with no auto-advance, no reset, and no crystallization

### Requirement: The POC runs in reversible isolation and is discarded when the lane closes

Before the POC runs, `sai-explore` SHALL isolate it reversibly by running it on its own branch or worktree created for it, and SHALL abandon that branch or worktree when the lane closes. Only the verdict SHALL survive the lane. The POC code SHALL be discarded by abandoning the isolation and SHALL NOT be discarded by destructive deletion of the working tree, by `git reset --hard` on the user's branch, or by removing files the user owns. Because the repository the lane leaves behind is the one it found, the size and integration-point friction judgments at the `Crystallize` stage SHALL evaluate the original repository and never one carrying throwaway POC code.

#### Scenario: the isolation is abandoned, not deleted

- **WHEN** the POC lane closes after an execution
- **THEN** the POC's branch or worktree is abandoned, the repository returns to its prior state, and no destructive deletion of the working tree occurs

#### Scenario: stage 4 judges the original repository

- **WHEN** the slicing assessment runs after a POC has been taken for the idea
- **THEN** the size and friction judgments evaluate the repository as it was before the POC

### Requirement: The POC lane can be entered explicitly from stages 2 through 4

`sai-explore` SHALL accept an explicit user request for a POC at the `Review edge cases`, `Implementation details`, and `Crystallize` stages and SHALL enter the lane from wherever the progression currently sits. The gate SHALL be stated in exactly one place, `sai/commands/explore/steps/common.md`, and SHALL be recognized by the same bare-token or dominant-intent machinery that recognizes `next-step`: the literal token `poc-lane`, or a turn whose dominant intent is asking to run a POC before continuing. Mere containment of the string, and a turn that negates, defers, quotes, or discusses it, SHALL NOT enter the lane. When the gate fires, `sai-explore` SHALL emit `{"intent":"poc-lane-late"}` to `explore-idea@1` and SHALL follow the returned `next.follow` at `poc-lane.md`, which owns the candidate agreement, the execution, the verdict, and the verdict menu exactly as it does for a stage-1 entry. A late entry SHALL carry no trigger re-evaluation and no go/no-go, SHALL be available whether or not the stage-1 trigger fired and whether or not its go/no-go was declined, and SHALL close into `Review edge cases` whichever stage it was entered from. Nothing SHALL enter the lane automatically after stage 1, and `sai-explore` SHALL NEVER request the lane on the user's behalf.

The late entry SHALL be a detour, not a reset: it SHALL NOT skip, weaken, or re-open an already agreed `E1..En` or `I1..In` list. When the progression re-enters a stage whose list is already agreed, the agreement SHALL stand — the stage SHALL emit no new list, SHALL run no second review or confirmation question, and SHALL be left by ordinary `next-step` advancement. Only a genuine material change authored by the user SHALL reset the progression and its agreed lists.

#### Scenario: a late request enters the lane from a later stage

- **WHEN** the user explicitly asks for a POC at `Review edge cases`, `Implementation details`, or `Crystallize`
- **THEN** the `poc-lane-late` intent is emitted, the lane is entered through the returned `next.follow` at `poc-lane.md`, and the candidate agreement runs with no go/no-go and no trigger re-evaluation

#### Scenario: a declined go/no-go does not close the door

- **WHEN** the user declined the stage-1 go/no-go and later explicitly asks for a POC at stage 2, 3, or 4
- **THEN** the lane is entered on that explicit request, with the uncertainty axis never re-evaluated and the question never re-asked on `sai-explore`'s own initiative

#### Scenario: an agreed list survives the detour

- **WHEN** the lane is entered late from `Implementation details` and later closes into `Review edge cases` whose `E1..En` list is already agreed
- **THEN** the agreed list stands unchanged, the stage emits no new list and no second confirmation question, and the progression is left by ordinary `next-step` advancement

#### Scenario: a request at Crystallize emits no block

- **WHEN** the user explicitly asks for a POC while the `Crystallize` stage is running
- **THEN** the crystallization sequence is left with no `Ready to Propose` block emitted, the progression returns to `Review edge cases` when the lane closes, and crystallization is re-entered later only through ordinary advancement

#### Scenario: containment and non-advancing uses do not enter the lane

- **WHEN** a turn at stage 2, 3, or 4 merely contains the token, or negates, defers, quotes, or discusses a POC
- **THEN** the lane is not entered and the progression stays at its current stage
