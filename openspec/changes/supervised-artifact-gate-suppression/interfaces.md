## Step 1: Shared gate mode parameter and supervised auto-proceed

**Interfaces**: Instruction contract only (no code API). `sai/policies/artifact-feedback-gate.md` Parameters surface:

- Required (unchanged): `artifacts`, `proceed-label`, `next-action`
- Optional: `mode` ∈ {`interactive`, `supervised`}; when omitted, behavior ≡ `interactive`
- Invalid non-empty `mode`: STOP and ask for valid mode; do not default; do not auto-proceed
- Supervised branch: on deferred-gate resolution, perform supplied `next-action` exactly once; no option-picker; no free-text channel; iteration counter unchanged (remains 0 for supervised run); no `.openspec.yaml` writes

**Test assertions**:
- Policy documents optional `mode` with closed vocabulary `interactive` and `supervised` — `specs/artifact-feedback-gate/spec.md` (Shared parameterized gate instruction; omitted mode defaults; invalid mode stops; mode declared not detected)
- Missing required parameter still STOP; omitted `mode` does not STOP — same spec (missing required parameter; omitted mode defaults)
- Supervised path executes fetch-site `next-action` exactly once and never writes approval state — `specs/artifact-feedback-gate/spec.md` (Supervised mode is a sequencing auto-proceed…)
- Interactive presentation labels/order/Recommended marker remain available when `mode` is interactive or omitted — `specs/artifact-feedback-gate/spec.md` (Gate presentation; free-text; proceed branches)
- Supervised placement keeps gate after decision summary and does not require reports-before-auto-proceed; fetching-body post-proceed order is preserved — `specs/artifact-feedback-gate/spec.md` (scenario `supervised placement preserves fetching-body post-proceed report order`); design D5
- Structural suites (`test/explore-pipeline-selector.test.js`, `test/spec-coordinator-worker.test.js`, `test/design-coordinator-worker.test.js`) pin the policy strings above in this same step; `node --test` on those three files exits 0
- Policy or explore interruption tests pin no auto-proceed over failed/cancelled — `specs/explore-pipeline-supervision/spec.md` (force-majeure interruptions)

## Step 2: Explore item 10 supplies supervised mode at both gate sites

**Interfaces**: Instruction contract only. Explore item 10 gate application sites supply:

- Spec site: `artifacts = proposal.md, specs/**`, `proceed-label = Finish step`, `next-action = spec-to-design phase transition`, `mode = supervised`
- Design site: `artifacts = design.md, tasks.md, interfaces.md`, `proceed-label = Continue`, `next-action = overview generation + supervised design terminal`, `mode = supervised`
- Standalone coordinators: unchanged; no `mode` token in their gate fetch supply

**Test assertions**:
- Explore instructions contain `mode = supervised` at both supervised gate application sites — `specs/explore-pipeline-supervision/spec.md` (Supervised gate fetch sites supply mode supervised)
- Spec-site next-action remains phase transition (not standalone mandatory stop) — `specs/artifact-feedback-gate/spec.md` (supervised spec proceed chains design); `specs/pipeline-design-phase-chaining/spec.md` / supervision chaining scenarios
- Design-site next-action remains overview generation + supervised terminal (not standalone completion sentence alone) — `specs/pipeline-design-phase-chaining/spec.md` (supervised design convergence auto-continues to overview)
- Active-supervision interval **stage enumeration** (picker → supervised application point) is corrected in the `explore-pipeline-selector` delta, not by new interval prose in `explore/instructions.md` — `specs/explore-pipeline-selector/spec.md` (active interval includes supervised gate application)
- No new suppression-only conversation strings required beyond existing item 10 reports — `specs/explore-pipeline-supervision/spec.md` (gate fetch sites requirement)
- Emission order under Auto remains decision summary → supervised auto-proceed/next-action → item 10 reports (not reports then auto-proceed) — design D5; `specs/artifact-feedback-gate/spec.md` (post-proceed placement scenario)
- `test/explore-pipeline-selector.test.js` in this same step pins all of: both-site `mode = supervised` supply; supervised design Continue → overview generation plus supervised terminal; post-proceed report-order cues where encoded; retained Step 1 policy pins (exact-once, no approval writes, failed/cancelled non-advance as applicable) — one suite entry, complete pin set
- `node --test test/explore-pipeline-selector.test.js` exits 0 after this step

## Step 3: Mode-qualify worker-loop coexistence prose

**Interfaces**: Documentation contract only (no code API, no new worker inputs). Spec and design worker coexistence sentences are reworded to cross-reference the shared gate's mode-dependent post-loop behavior:

- The worker text points at the gate/coordinator fetch-site rule: when the fetch site is interactive (or omits `mode`), the coordinator-owned prose gate still presents at iteration 0 after the worker-owned loop ends; when the fetch site supplies `mode = supervised`, that gate auto-proceeds with no picker
- Workers do **not** receive `mode`, do not branch on mode, and gain no new lifecycle field or picker present/suppress logic
- Workers still do not own or alter `MachineFeedbackAdapter`

**Test assertions**:
- Worker coexistence text is a documentation cross-reference to mode-dependent gate behavior, not a worker-evaluated branch — `specs/planning-artifact-review-loop/spec.md` (coexistence-with-existing-review-surfaces; supervised ending auto-proceeds; interactive still runs)
- No worker input/lifecycle field is added for mode; workers neither present nor suppress the picker — same spec (marking/coexistence scenarios)
- `test/spec-coordinator-worker.test.js` in this same step: standalone spec coordinator omits `mode`; retains interactive artifact triple and Finish step / mandatory stop pairing; coexistence mode-qualification as needed
- `test/design-coordinator-worker.test.js` in this same step: standalone design coordinator omits `mode`; retains `Continue` → existing design completion sentence and stop only (not explore overview generation); coexistence mode-qualification as needed
- Structural pins distinguish standalone sai-2 completion-sentence next-action from explore supervised overview-generation next-action — `specs/artifact-feedback-gate/spec.md` (parameters differ / supervised design fetch site); `specs/pipeline-design-phase-chaining/spec.md`
- `node --test test/spec-coordinator-worker.test.js test/design-coordinator-worker.test.js test/explore-pipeline-selector.test.js` and full `npm test` exit 0 after this step
