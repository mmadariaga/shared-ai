## MODIFIED Requirements

### Requirement: Chained design phase ends with supervised completion and chains no later phase

When the chained design phase reaches convergence or cap exhaustion, explore SHALL apply the shared artifact feedback gate with `mode = supervised`. If the invocation explicitly supplied `--overview-lang <language>`, the gate SHALL execute the Continue next-action (overview generation) exactly once; if the flag is absent, it SHALL execute the no-generation design terminal exactly once. These routes are mutually exclusive and exactly one SHALL execute per invocation, selected solely by the active design envelope's flag presence. Explore SHALL then emit design-phase supervised completion at most once, emit the design completion sentence at most once, suppress the standalone `/sai-2-design` navigation sentence for this supervised run, emit exactly one `Next step: run /sai-build {name}.` handoff, emit no `sai-3 was not run.` text, and dispatch no later phase. A failed or cancelled design worker SHALL end the supervised run under its lifecycle result without auto-proceeding either route, leave the change retryable, and keep the existing autonomy reporting behavior.

#### Scenario: Chained opted-in design converges

- **WHEN** an opted-in chained design phase converges after its review rounds and feedback handling
- **THEN** overview generation runs once with the explicit language, explore emits design-phase supervised completion, does not relay the standalone `/sai-2-design` navigation sentence, emits exactly one `Next step: run /sai-build {name}.` handoff, and does not emit `sai-3 was not run.`

#### Scenario: Chained unopted-in design converges

- **WHEN** a chained design phase converges without `--overview-lang`
- **THEN** no overview generator is dispatched and no new overview lifecycle state is written, explore emits design-phase supervised completion and the build handoff, and dispatches no later-phase worker

#### Scenario: Chained unopted-in design exhausts the cap

- **WHEN** an unopted-in chained design phase exhausts its three-round cap
- **THEN** cap exhaustion remains a non-failure outcome, the build handoff is emitted, and the no-generation design terminal closes the phase without an overview progress step or later-phase dispatch

#### Scenario: Chained design converges

- **WHEN** the chained design phase reaches convergence after its review rounds
- **THEN** explore emits design-phase supervised completion, emits the build handoff, and does not relay the standalone navigation sentence

#### Scenario: Chained design exhausts the cap

- **WHEN** the chained design phase exhausts its three-round cap
- **THEN** cap exhaustion remains a non-failure outcome, the build handoff is emitted, and the phase closes

#### Scenario: No later phase is ever chained

- **WHEN** the chained design phase reaches any terminal outcome
- **THEN** the supervised run never dispatches implementation or any phase after design
