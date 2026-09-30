# crystallization-close Specification

## Purpose
TBD - created by archiving change fix-crystallization-close-selector. Update Purpose after archive.

## Requirements

### Requirement: Crystallization-close emission guarantee on every crystallization path

The crystallization-close SHALL invoke the shared close exactly once after the final `Ready to Propose` block in a single-change turn or after the final block in a sliced-feature turn. The close SHALL retain each emitted change name in display order, handle the stage panel, emit exactly one ordered inventory event, and complete only when that event succeeds in the `waiting` state. When no slice is active, the successful event SHALL return the route-selector pointer, which SHALL present the native picker after the checkpoint in the same assistant turn. The close SHALL not emit a route intent, create a route entry, or dispatch a worker until a valid picker answer arrives in a later turn. The inline-refusal path SHALL remain outside this close.

#### Scenario: Single crystallization emits selector after recommendation

- **WHEN** a single-change crystallization turn emits its complete `Ready to Propose` block ending at `---`
- **THEN** it invokes one shared close, records the emitted name, exposes the selector pointer after successful recording, and presents no route work before a later valid picker answer

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

The crystallization close SHALL invoke no route selector when no complete block ending at `---` was emitted in the same turn. When a complete block exists, the close SHALL expose the selector only after inventory recording succeeds; route interpretation and dispatch SHALL require a later valid picker answer.

#### Scenario: Close without same-turn block emits no selector

- **WHEN** a prior or current turn reaches the close without a same-turn block ending at `---`
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

The shared close SHALL treat the final `---` as the start of completion rather than the end of the turn. It SHALL handle the stage TODO through the existing Phase A panel contract, keep the panel logically empty until route-choice resolution, emit exactly one ordered `recordedList` event, and follow its successful selector pointer when no active slice remains. The picker presentation SHALL not resolve route-choice; the route remains pending until a later valid picker answer.

#### Scenario: Single crystallization stops after block with empty panel

- **WHEN** a crystallization turn emits its block ending at `---`
- **THEN** the turn continues through stage-TODO handling and successful ordered inventory recording, presents the picker after the checkpoint, and starts no route before the later picker answer

### Requirement: Crystallization protocol carries zero selector references

The crystallization protocol SHALL own block emission, stage-panel handling, ordered inventory recording, and the close checkpoint. It SHALL not interpret a picker answer, emit a route intent, create a route entry, or dispatch a worker. After a successful inventory result it SHALL follow the returned `next.follow`; when that pointer names the route selector, the selector SHALL present the native picker and wait for the later answer. The route-selector step SHALL remain the owner of picker interpretation and route selection.

#### Scenario: Crystallization file holds no selector language

- **WHEN** the crystallization protocol file is inspected after the change
- **THEN** it contains the shared close and pointer-follow behavior while route interpretation and dispatch remain outside the protocol

### Requirement: Same-turn close preserves exclusion paths without fusion

The shared close SHALL preserve the inline-refusal path and the uncertainty POC pause without fusing either path with the native route picker. A declared panel-tool unavailability SHALL use the prescribed degradation and continue to inventory recording; after successful recording, the normal selector pointer may present the picker. Other panel errors, store failures, and step-load failures SHALL preserve the no-picker and no-route stop behavior.

#### Scenario: Exclusion path keeps current behavior

- **WHEN** a crystallization turn follows the inline-refusal path, the uncertainty POC pause, panel-unavailable degradation, or another panel, store, or step-load failure
- **THEN** inline refusal and the uncertainty pause keep their existing paths, panel unavailability may continue inventory recording before normal picker presentation, and other failures start no picker or route

### Requirement: Pre-selector checkpoint blocks selector until ordered close completes

The shared close SHALL not expose the route selector until the final block or blocks are visible, the stage TODO has been handled, and the `recordedList` emit succeeds without an `error` or `rejected` result and enters `waiting`. On an inactive slice, the successful result SHALL return the selector pointer for picker presentation. A later valid picker answer SHALL cause `route-choice` activation; a different successful pointer SHALL be followed according to its `next.follow`, and an emit error, rejection, or follow-load failure SHALL stop the close.

#### Scenario: Selector waits for ordered close state

- **WHEN** a crystallization turn reaches the shared close with blocks emitted
- **THEN** the turn records the ordered inventory successfully, exposes the selector pointer, and keeps route activation pending until a later valid picker answer

#### Scenario: Machine enforces block-first order

- **WHEN** a Plan or Direct Build intent reaches `explore-slice@1` with no complete inventory or before picker answer activation
- **THEN** the machine rejects it with the applicable closed rejection and no route starts

#### Scenario: Inventory failure blocks route choice

- **WHEN** the inventory emit returns an error or rejection, or its returned step cannot be loaded
- **THEN** the close follows the existing error path, waits for instructions, and presents no route selector or picker

### Requirement: Single shared checkpoint runs once after last separator

The checkpoint SHALL run once after the last `---` for single and sliced paths alike and SHALL never run once per block. It SHALL record the complete ordered set and, after success, follow the actual pointer so the selector may present the picker. It SHALL not select or dispatch a route in the block-emission turn.

#### Scenario: Sliced path uses one checkpoint after last block

- **WHEN** a sliced crystallization turn emits several blocks ending at separators
- **THEN** one shared checkpoint runs after the final separator, records the inventory once, and presents no route work before a later picker answer

### Requirement: Checkpoint preserves exclusion and failure behavior

The shared close SHALL keep the inline-refusal path outside the checkpoint with its immediate handoff. When the stage panel tool is unavailable, it SHALL record exactly `> Panel rendering unavailable; continuing without task-panel updates.`, disable further panel calls for the chat, and continue to inventory recording. Other panel errors, state-store failures, and returned-step load failures SHALL stop the close before picker presentation. Fast-track SHALL neither skip the checkpoint nor auto-select the route.

#### Scenario: Failure and fast-track keep checkpoint guarantees

- **WHEN** the close encounters an unavailable panel, another panel or store failure, a step-load failure, or runs under fast-track
- **THEN** unavailable-panel degradation may continue to inventory recording, other failures keep picker presentation or route selection from starting, and fast-track preserves the checkpoint without auto-selection

### Requirement: Shared close single-source lives in crystallization protocol

`sai/commands/explore/steps/crystallization-protocol.md` SHALL hold the sole full shared crystallization-turn close sequence, including the ordered completion condition and fast-track behavior. After successful inventory recording, `route-selector.md` SHALL consume the returned pointer to present the native picker and SHALL not duplicate the close procedure. A later valid picker answer SHALL be required before route intent or dispatch.

#### Scenario: Close sequence resolves from protocol

- **WHEN** the block set is emitted
- **THEN** the protocol's single-source sequence governs the ordered close, exposes the selector picker only after success, and the selector consumes the later picker answer without repeating the close
