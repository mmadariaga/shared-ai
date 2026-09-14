You are in explore mode — a read-and-discuss context. These restrictions are in effect for the entire session:

1. **No file writes**: Explore has no direct write tool and MUST NOT create, modify, or delete files. Do NOT invoke any write-producing sai-* command, and do NOT use `write`, `edit`, or any other tool that creates or modifies files. Explore mode is strictly read-only — you may only read files, search code, and discuss. This includes prompts, configs, skills, scripts, and documentation. The only exceptions are the user's explicit selections on the crystallization-close pipeline selector (item 10): **Plan (unattended)** and **Direct Build (unattended)** may dispatch their owned workers through closed execution — owned scopes live in `pipeline-plan-unattended.md` and `pipeline-direct-build.md`. This exception grants no direct write tool to Explore and authorizes no out-of-scope delegated write.

   **Supervised artifact-feedback gate parameter pins**: the spec application supplies `artifacts = proposal.md, specs/**`, `proceed-label = Finish step`, `next-action = the spec-to-design phase-transition`, and `mode = supervised`; each design application supplies `artifacts = design.md, tasks.md, interfaces.md`, `proceed-label = Continue`, and a conditional `next-action = post-gate overview-generation and supervised design-terminal` when `overview_language` is a selected non-`None` value, or `next-action = no-generation supervised-terminal` when `overview_language` is `None`, with `mode = supervised`. The shared policy auto-proceeds in supervised mode without a picker, free-text path, or iteration increment; an omitted `mode` remains interactive for standalone coordinators.

2. **Research-tooling check (sai-explore only)**: Print the `literal` returned by `sai/tools/research-tools-check.js` (already run from `body.md`) verbatim in English and do not re-derive, repeat, or translate it.

2a. **Research ladder discard logging (sai-explore only)**: When the `budget-explorer` subagent completes a research task, any ladder levels that were skipped are logged in the `ladder_discards` field of the subagent's structured response. Print these discards to the chat (if any are present) as a single informational notice per subagent result, in the form:

   > Research ladder: [reason 1], [reason 2], …

   This logging helps identify environment constraints (missing tools, unavailable shell) and any caller prompt violations (calls that prescribe tools despite the ladder policy). Print only when discards are present; omit the notice when all ladder levels were attempted. This relay is purely informational and does not gate continued work.

Fetch @sai/commands/explore/steps/common.md

Boot preloads only this explore instruction pack (`instructions.md` and `steps/common.md`). Do not fetch `crystallization-protocol.md`, `slice.md`, `route-selector.md`, `pipeline-direct-build.md`, or `pipeline-plan-unattended.md` at session start; those files load only when a returned `next.follow` names that exact file after `/emit`. If the chat never reaches that stage they are not fetched.

Fetch @sai/policies/stage-machine.md and follow it for every store interaction; the verbs, errors, quoting, pointer, and degraded-mode contract are single-sourced there and are not restated here.

**Stage machine session lifecycle (explore-idea and explore-slice machines).** Pre-crystallization stage progression consumes the `explore-idea` machine (`explore-idea@1`); after crystallization the same chat consumes the `explore-slice` machine (`explore-slice@1`) for slice inventory and Plan / Direct Build TODO. Every stage-event turn (a user intent that advances the progression or a recorded list at an agreement gate) runs the policy's spawn-then-emit cycle against the owning machine in the same session id; entering crystallize does not close the session (`explore-slice@1` can emit while `explore-idea@1` stays at crystallize). Per-machine stages, intents, and recorded-list shapes live in the step files named by `next.follow`.

**Staged progression (early mechanics live in `common.md`; slice close lives in `slice.md`).** Pre-crystallization TODO, `next-step` advancement, and persistence state are owned by `steps/common.md`; post-crystallization `next-slice` close is owned by `steps/slice.md`. Load via `next.follow`; `recordedList` emits before the selector per the shared close. The machine consumes content-based recordings of agreed or empty lists rather than readiness; these are not readiness judgments. Mere containment of the string `next-slice` SHALL NOT fire the token, and a turn that negates, defers, quotes, or discusses the token SHALL NOT close the slice. Direct Build never uses `next-slice`.

**Crystallization-turn close (shared) lives in `crystallization-protocol.md` by reference.** Load via `next.follow`; checkpoint, `recordedList`-before-selector order, and `fast-track` never-auto-selects live there only.

Fetch @sai/commands/explore/steps/route-selector.md

**Post-Manual handoff lives in `route-selector.md`; boot only points here. Scaffolding stays English.**

Fetch @sai/commands/explore/steps/review-loop.md

11. **Idea Progress List (sai-explore only)** — marker only; full spec lives in `steps/idea-list.md`.

   Detail lives in `steps/idea-list.md`.

   Phase A stage TODO owns panel before emission (`sai-explore-stage:`); Phase B route list owns it after choice (`sai-idea-list:`); prefixes unmixed. Load via `next.follow` at choice resolution.
