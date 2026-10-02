# crystallization-close Specification

## Purpose
TBD - created by archiving change fix-crystallization-close-selector. Update Purpose after archive.

## Requirements

### Requirement: Crystallization-close emission guarantee on every crystallization path

The crystallization-close SHALL invoke the shared close exactly once for the complete block set of a single-change turn or a sliced-feature turn. The close SHALL handle the stage panel. It SHALL then send the complete composed block set, in display order, through exactly one block emit (`sai-state emit <id> explore-slice@1 --ready-to-propose -`), which validates the set, extracts each `**Change name**` in display order, and records the ordered inventory before any block is displayed. The close SHALL complete only when that emit succeeds in the `waiting` state and every block has then been printed exactly as sent. When no slice is active, the successful emit SHALL return the route-selector pointer, which SHALL present the native picker after the printed blocks in the same assistant turn. The close SHALL not emit a route intent, create a route entry, or dispatch a worker until a valid picker answer arrives in a later turn. The inline-refusal path SHALL remain outside this close.

#### Scenario: Single crystallization emits selector after recommendation

- **WHEN** a single-change crystallization turn composes its complete `Ready to Propose` block ending at `---`
- **THEN** it invokes one shared close, records the extracted name through the block emit before printing the block, presents the picker after the printed block, and presents no route work before a later valid picker answer

### Requirement: Only native-picker selector counts with fixed English titles

After a successful close checkpoint, the route selector SHALL present one native picker with the fixed English titles `Plan - Unattended`, `Direct Build - Unattended`, and `Manual`, in that order, and their stable identities SHALL remain `plan-unattended`, `direct-build-unattended`, and `manual`. A plain-text route guide, typed route name, cancelled picker, absent response, `Other` or free-text answer, or ambiguous response SHALL not select a route.

#### Scenario: Plain-text list does not satisfy selector

- **WHEN** the selector is reached after a successful checkpoint and the picker is presented without a returned answer
- **THEN** the route remains pending, the inventory is preserved, and no route intent or dispatch occurs

### Requirement: Language gate and fast-track never exempt selector

The item-8 crystallization language gate SHALL not exempt the route picker, fast-track SHALL not exempt or auto-select it, and neither path SHALL create a route before a later explicit picker reply.

#### Scenario: Fast-track still asks selector

- **WHEN** fast-track is active at a crystallization close and the native picker has been presented
- **THEN** the close retains route choice pending and no route is auto-selected

### Requirement: Missing-selector re-emission uses current chat set only

A selector presentation after a missing, cancelled, invalid, or deferred response SHALL use only the current chat `last_crystallization_set`, SHALL not reuse an earlier route answer, SHALL carry no prior handoff, and SHALL not dispatch a stale change.

#### Scenario: Re-emission reuses current set without recommendation

- **WHEN** the selector is reached again after a route result or invalid picker response
- **THEN** it presents a fresh picker for the current first pending slice without reusing the prior answer or dispatching a stale change

### Requirement: Same-turn block guard blocks premature selector

The crystallization close SHALL invoke no route selector when no complete block set was validated by a block emit and printed in the same turn. When a valid block set exists, the close SHALL expose the selector only after the block emit records the inventory and every block is printed. Route interpretation and dispatch SHALL require a later valid picker answer.

#### Scenario: Close without same-turn block emits no selector

- **WHEN** a prior or current turn reaches the close without a same-turn block set validated by the block emit
- **THEN** no route selector, route intent, or dispatch is emitted

### Requirement: Language-gate continuation resumes at block emission

The crystallization close SHALL resume at Ready to Propose block emission after a language-gate answer and SHALL not jump directly to route interpretation. It SHALL ask no overview-language question at emission, reserving that decision for supervised Plan activation; fast-track SHALL skip only the language question without auto-selecting a route.

#### Scenario: Gate answer leads to block emission

- **WHEN** the user answers the crystallization language gate
- **THEN** the flow emits the Ready to Propose block next, records its inventory, presents no route intent before a later picker answer, and preserves the Plan-only overview-language gate

### Requirement: Premature selector discard with single-selector correction

The crystallization close SHALL discard a premature selector from a prior turn that carried no block and SHALL carry no selection from it. The correction turn SHALL emit the block plus the shared close plus a single native picker in block-then-picker order with no handoff and no recommendation before selection, and the user SHALL select again from `last_crystallization_set`.

#### Scenario: Correction after premature selector

- **WHEN** a prior turn emitted a selector without a block
- **THEN** the correction turn discards that selection and emits one block plus close plus one picker for re-selection in block-then-picker order

### Requirement: Crystallization close ends at block emission with cleared TODO

The shared close SHALL compose the blocks inside the block emit and SHALL NOT print them before it; a printed final `---` SHALL never complete the close by itself. As its first step, it SHALL handle the stage TODO through the existing Phase A panel contract, and the panel SHALL stay logically empty until route-choice resolution. It SHALL record the inventory through exactly one block emit, never through a hand-composed `recordedList`. It SHALL then load the returned pointer, print the blocks exactly as sent, and follow the successful selector pointer when no active slice remains. Presenting the picker SHALL not resolve route-choice; the route remains pending until a later valid picker answer.

#### Scenario: Single crystallization stops after block with empty panel

- **WHEN** a crystallization turn composes its block ending at `---`
- **THEN** the turn clears the stage TODO, records the inventory through the block emit, prints the block, presents the picker after it, and starts no route before the later picker answer

### Requirement: Crystallization protocol carries zero selector references

The crystallization protocol SHALL own block emission, stage-panel handling, ordered inventory recording, and the close checkpoint. It SHALL not interpret a picker answer, emit a route intent, create a route entry, or dispatch a worker. After a successful inventory result it SHALL follow the returned `next.follow`; when that pointer names the route selector, the selector SHALL present the native picker and wait for the later answer. The route-selector step SHALL remain the owner of picker interpretation and route selection.

#### Scenario: Crystallization file holds no selector language

- **WHEN** the crystallization protocol file is inspected after the change
- **THEN** it contains the shared close and pointer-follow behavior while route interpretation and dispatch remain outside the protocol

### Requirement: Same-turn close preserves exclusion paths without fusion

The shared close SHALL preserve the inline-refusal path and the uncertainty POC pause without fusing either path with the native route picker. The inline-refusal path SHALL print its block or blocks without the block emit and SHALL record no inventory. A declared panel-tool unavailability SHALL use the prescribed degradation and continue to the block emit. Any other panel error SHALL be reported in one line, and the close SHALL also continue to the block emit, because the panel is presentation only. After a successful block emit, the normal selector pointer may present the picker. Validation failures, delivery failures, store failures, and step-load failures SHALL keep the stop behavior: no picker and no route.

#### Scenario: Exclusion path keeps current behavior

- **WHEN** a crystallization turn follows the inline-refusal path or the uncertainty POC pause, hits a panel error of any kind, or hits a validation, store, or step-load failure
- **THEN** inline refusal and the uncertainty pause keep their existing paths, a panel error continues to the block emit before normal picker presentation, and the other failures start no picker or route

### Requirement: Pre-selector checkpoint blocks selector until ordered close completes

The shared close SHALL not expose the route selector until three things hold, in order: the stage TODO has been handled; the block emit has validated the complete set and succeeded without an `error` or `rejected` result, entering `waiting`; and every block has then been printed. On an inactive slice, the successful result SHALL return the selector pointer for picker presentation. A later valid picker answer SHALL cause `route-choice` activation. A different successful pointer SHALL be followed according to its `next.follow`. An emit error, rejection, or follow-load failure SHALL stop the close.

#### Scenario: Selector waits for ordered close state

- **WHEN** a crystallization turn reaches the shared close with its block set composed
- **THEN** the turn records the ordered inventory through the block emit, prints the blocks, exposes the selector pointer, and keeps route activation pending until a later valid picker answer

#### Scenario: Machine enforces block-first order

- **WHEN** a Plan or Direct Build intent reaches `explore-slice@1` with no complete inventory or before picker answer activation
- **THEN** the machine rejects it with the applicable closed rejection and no route starts

#### Scenario: Inventory failure blocks route choice

- **WHEN** the block emit returns an error or rejection, or its returned step cannot be loaded
- **THEN** the close follows the existing error path, waits for instructions, and presents no route selector or picker

### Requirement: Single shared checkpoint runs once after last separator

The checkpoint SHALL run once for the complete set, on the single and sliced paths alike, through one block emit that carries every block. It SHALL never run once per block. The set SHALL be validated as a whole: when any block fails, no name SHALL be recorded. The checkpoint SHALL record the complete ordered set and, after success, follow the actual pointer so the selector may present the picker after the printed blocks. It SHALL not select or dispatch a route in the block-emission turn.

#### Scenario: Sliced path uses one checkpoint after last block

- **WHEN** a sliced crystallization turn composes several blocks ending at separators
- **THEN** one block emit carries the whole set and records the inventory once in display order, the blocks print without pausing, and no route work starts before a later picker answer

### Requirement: Checkpoint preserves exclusion and failure behavior

The shared close SHALL keep the inline-refusal path outside the checkpoint with its immediate handoff. When the stage panel tool is unavailable, it SHALL record exactly `> Panel rendering unavailable; continuing without task-panel updates.`, disable further panel calls for the chat, and continue to the block emit. Any other panel error SHALL be reported in one line, and the close SHALL continue. These SHALL stop the close before picker presentation: validation failures, delivery failures, state-store failures, other emit errors or rejections, and returned-step load failures. Fast-track SHALL neither skip the checkpoint nor auto-select the route.

#### Scenario: Failure and fast-track keep checkpoint guarantees

- **WHEN** the close hits a panel error, a validation, delivery, or store failure, or a step-load failure, or runs under fast-track
- **THEN** a panel error continues to the block emit, the other failures keep picker presentation or route selection from starting, and fast-track preserves the checkpoint without auto-selection

### Requirement: Shared close single-source lives in crystallization protocol

`sai/commands/explore/steps/crystallization-protocol.md` SHALL hold the sole full statement of the shared crystallization-turn close (stage panel, block emit, pointer load, block print, and action on the loaded file), including its failure handling and fast-track behavior. `sai/commands/explore/instructions.md`, `steps/common.md`, `steps/slice.md`, and `steps/route-selector.md` SHALL reference that sequence without contradicting its order. `route-selector.md` SHALL open with the instruction that, after the printed blocks, the native picker is the one remaining action. After a successful block emit, it SHALL consume the returned pointer to present the native picker, and it SHALL not duplicate the close procedure. A later valid picker answer SHALL be required before any route intent or dispatch.

#### Scenario: Close sequence resolves from protocol

- **WHEN** the block set is composed
- **THEN** the protocol's single-source sequence governs the ordered close and exposes the selector picker only after the block emit succeeds and the blocks are printed, and the selector consumes the later picker answer without repeating the close

### Requirement: Block validation failures retry silently and stop without display

When the block emit returns `validation.ok` false, the machine SHALL stay untouched. The close SHALL correct the cited blocks and resend the whole set without showing anything to the user, with at most two retries. When those retries are exhausted, the close SHALL show each violation with its block index, line, and problem, print no block, open no picker, and wait for instructions. A delivery failure (`reason: "EVENT_UNPARSEABLE"` or an emit usage error) SHALL use the stage-machine corrective retry, whose counter of two is separate from the validation counter, and SHALL stop the same way when it is exhausted. Any other emit error or rejection SHALL follow the stage-machine error or acknowledgement path: print the block set, stop the close, and open no picker.

#### Scenario: Invalid set is corrected silently

- **WHEN** the block emit rejects a block set and a corrected resend within two retries validates
- **THEN** the user sees only the final printed blocks and the picker, and the inventory records the names from the corrected set

#### Scenario: Exhausted validation retries stop without blocks

- **WHEN** the third block emit of a set still returns `validation.ok` false
- **THEN** the close shows the violations by block index, line, and problem, prints no block, and opens no picker

#### Scenario: Delivery failure keeps its own counter

- **WHEN** a block emit returns `reason: "EVENT_UNPARSEABLE"` after a validation retry was already used
- **THEN** the corrective retry runs with its own counter of two, independent of the validation retries
