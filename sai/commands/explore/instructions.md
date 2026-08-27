You are in explore mode — a read-and-discuss context. These restrictions are in effect for the entire session:

1. **No file writes**: Explore has no direct write tool and MUST NOT create, modify, or delete files. Do NOT invoke any write-producing sai-* command, and do NOT use `write`, `edit`, or any other tool that creates or modifies files. Explore mode is strictly read-only — you may only read files, search code, and discuss. This includes prompts, configs, skills, scripts, and documentation. The only exceptions are the user's explicit selections on the crystallization-close pipeline selector (item 10): the **Plan (unattended)** option may dispatch the existing spec-proposal and design workers (item 10): the spec-proposal worker writes only its owned `openspec/changes/{name}/proposal.md`, `specs/**`, and permitted change metadata, and the chained design worker writes only its owned `openspec/changes/{name}/design.md`, `tasks.md`, `interfaces.md`, `change-overview.md`, and permitted change metadata (`.openspec.yaml`); and the **Direct Build (unattended)** option (item 10) may dispatch the existing `sai-direct-build-worker`, `sai-backfill-worker`, and `sai-archive-worker` through their closed build-route execution: the implementer writes only code, tests, and required project configuration under its closed exclusions (never under `openspec/`), backfill writes only the coordinator-validated draft set after an explicit execute continuation, and archive executes only the coordinator-validated sync, archive move, owned staging, and pre-authorized local commit after its explicit execute continuation; either way, this exception grants no direct write tool to Explore and authorizes no out-of-scope delegated write.

   **Supervised artifact-feedback gate parameter pins**: the spec application supplies `artifacts = proposal.md, specs/**`, `proceed-label = Finish step`, `next-action = the spec-to-design phase-transition`, and `mode = supervised`; each design application supplies `artifacts = design.md, tasks.md, interfaces.md`, `proceed-label = Continue`, and a conditional `next-action = post-gate overview-generation and supervised design-terminal` when `overview_language` is a selected non-`None` value, or `next-action = no-generation supervised-terminal` when `overview_language` is `None`, with `mode = supervised`. The shared policy auto-proceeds in supervised mode without a picker, free-text path, or iteration increment; an omitted `mode` remains interactive for standalone coordinators.

2. **Research-tooling check (sai-explore only)**: At session start, before any grep/glob/Read for the user's request — and before the `openspec-explore` skill's own `openspec list --json` and codebase reading — evaluate the code-graph MCP state **once** and print the single matching notice below. This check applies only within `sai-explore`; no other `sai-*` command is affected. It is **non-blocking** (never halts the session, prompts the user, or gates later work) and **read-only** (`Glob` is the only permitted filesystem probe; do NOT use `write`, `edit`, or any other file-modifying tool).

   **Fires**: once per session, at the start, before the first code search. Do NOT repeat the check or reprint the notice on later turns in the same session.

   **Detection** (read-only signals only):
   - **Tools present**: inspect the session's available tools for any name matching `codegraph_*` or `mcp__codegraph__*`. Match **either** form across the full tool list, including deferred/searchable tools not yet loaded — a matching name visible only as a deferred entry still counts as present. Do NOT depend on a single literal prefix, and do NOT call a code-graph tool to probe liveness.
   - **Index present**: at the project root, run a read-only directory-scoped `Glob` with `path: .codegraph` and `pattern: *` (spell the directory literally; match entries *inside* it so an empty-but-present directory is not counted). Consider the index present only when the root-scoped results include an entry other than `.gitignore`; a nested `.codegraph/` under some other directory does not by itself decide the state.

   **States** — print the one that matches, **verbatim** and **always in English** regardless of the conversation language (this narrowly diverges from `remember.md:4` for this notice only; all other output stays on the language policy):
   - **not installed** (no matching code-graph tools present):
     ```
     > ⚠️ **CodeGraph not detected — structural research falls back to grep/glob/Read.** For faster, cheaper structural queries, install CodeGraph, a local code knowledge-graph MCP: https://github.com/colbymchenry/codegraph
     ```
   - **installed but no index** (tools present, but the project-root `.codegraph/` Glob returns no match):
     ```
     > ⚠️ **CodeGraph available but this project has no index — structural research falls back to grep/glob/Read.** Run `codegraph init -i` at the project root to build the index and enable structural queries. (CodeGraph: https://github.com/colbymchenry/codegraph)
     ```
   - **ready** (tools present **and** a project-root `.codegraph/` exists):
     ```
     > ⚠️ **CodeGraph ready — structural research will use codegraph instead of grep/glob/Read.**
     ```

   **Do NOT** restate the global "prefer codegraph over grep" guidance a code-graph MCP already injects into the harness's memory — this check's only added value is the fallback notice and the install/init recommendation.

2a. **Research ladder discard logging (sai-explore only)**: When the `budget-explorer` subagent completes a research task, any ladder levels that were skipped are logged in the `ladder_discards` field of the subagent's structured response. Print these discards to the chat (if any are present) as a single informational notice per subagent result, in the form:

   > Research ladder: [reason 1], [reason 2], …

   This logging helps identify environment constraints (missing tools, unavailable shell) and any caller prompt violations (calls that prescribe tools despite the ladder policy). Print only when discards are present; omit the notice when all ladder levels were attempted. This relay is purely informational and does not gate continued work.

Fetch @sai/commands/explore/steps/common.md

**Pre-crystallization staged progression (sai-explore only).** While a candidate idea is under active exploration (Closure State `active-uncrystallized`), render a four-item stage TODO on the native task panel with the labels `Explore change`, `Review edge cases`, `Implementation details`, and `Crystallize`, in that order. The current stage renders `in_progress`, completed stages render `completed`, and remaining stages render `pending`. The TODO renders from the first turn in which a candidate idea exists, re-renders exactly once per turn that changes stage state, and does not render while no candidate idea exists. Rendering goes through the per-harness idea-list render binding's phase-A machinery (item 11); the stage TODO clears at crystallization, when the idea progress list takes the panel.

The stage progression advances only when the user explicitly requests it: the literal token `next-step` — recognized by the same bare-token/dominant-intent machinery as the `review-loop` token (item 9), firing when the turn is a bare token (optionally with trivial punctuation or a greeting) or when advancing the progression is the turn's dominant intent — clear natural-language intent naming the next stage or requesting crystallization, or semantic confirmation of the proposed list at the `Review edge cases` or `Implementation details` stage. Mere containment of the string `next-step` SHALL NOT fire the token, and a turn that negates, defers, quotes, or discusses the token SHALL NOT advance the progression. At either list stage, semantic confirmation records the current ordered list as agreed and advances to the next stage within the same turn. `sai-explore` SHALL NOT advance a stage on its own judgment that the idea is solid or ready. The sole exceptions are the deterministic empty-set rules of the `Review edge cases` and `Implementation details` stages (below), which are content-based rules, not readiness judgments. The one-line readiness signal never advances a stage. Entering `Crystallize` counts as the explicit crystallization request and immediately starts the slicing assessment and language-gate sequence described below.

The stage progression state — the current stage, completed stages, agreed lists, pending crystallization request, Closure State, and readiness tracking — is held in conversation only. When the idea materially changes into a new stable idea, reset the progression to `Explore change`, render that stage `in_progress` with the other stages `pending`, discard the prior agreed edge-case and implementation-details lists and any pending crystallization request, and begin a new `active-uncrystallized` lifecycle. The reset alone SHALL NOT start a new edge-case review; the new idea enters that review only on explicit advancement or a premature crystallization request. The session SHALL NOT write this state to any file, artifact, change directory, configuration, or `.openspec.yaml`; `sai-explore` remains read-only.

**Crystallization-turn close (shared):** After the handoff block(s), close the crystallization turn exactly once with this sequence — the sole full statement of the close; items 5, 6, and 7 invoke it by reference and MUST NOT restate the emission sequence:

1. One keep-window-open recommendation outside the handoff block: plain conversational free-text prose rendered in the user's language per item 8 / `sai/policies/remember.md` (only the recommendation is localized — `Ready to Propose` scaffolding and next-step command lines stay English). It tells the user to keep this explore window open and return to it to review and refine the artifacts that `/sai-1-spec` and `/sai-2-design` create next (per the `explore-crystallization-block` capability). It replaces the removed auto-fired review picker (item 9) as the thing that closes the crystallization turn before the selector. The recommendation names the literal token `review-loop` exactly once for the user-triggered review loop; the token is never presented through a picker and is never auto-started or auto-offered. The recommendation names no pipeline token. The standing user-triggered review path remains available while the selector (item 10) governs only delegated execution.

Fetch @sai/commands/explore/steps/review-loop.md

2. After that recommendation, emit the crystallization-close pipeline selector (item 10) exactly once as the **final** emission of this slice's turn.

Fetch @sai/commands/explore/steps/pipeline-selector.md

Path-specific next-step instructions are **not** emitted in the crystallization turn before the selector and are **not** placed between the `---` separator and the close sequence. Selecting **Manual**, or giving an answer that maps to neither selector option, refers to this already-emitted recommendation, MUST NOT re-emit a second recommendation or selector, and receives the path-specific next-step handoff exactly once after the selector response as defined by item 10. Item 10 describes that branch by reference to this shared rule.

11. **Idea Progress List (sai-explore only)** — **Phase A: Stage TODO ownership**:

   **Panel ownership (Phase A).** The panel's declared owner splits into two phases while a `sai-explore` chat is active. Phase A: before the first slice identification, the panel's declared owner is the pre-crystallization stage TODO — each stage-TODO entry carries the stage-ownership marker `sai-explore-stage:<stage-id>` (stage ids `explore-change`, `review-edge-cases`, `implementation-details`, `crystallize`) in the machine-readable panel entry field pinned by the per-harness idea-list render binding (opencode `priority`, Claude Code `description`), so stage entries stay visually distinct from every other surface's entries.

   Phase B and the complete item 11 specification are fetched when the first slice block is emitted.
