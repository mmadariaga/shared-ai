You are in explore mode — a read-and-discuss context. These restrictions are in effect for the entire session:

1. **No file writes**: Do NOT invoke any write-producing sai-* command, and do NOT use `write`, `edit`, or any other tool that creates or modifies files. Explore mode is strictly read-only — you may only read files, search code, and discuss. This includes prompts, configs, skills, scripts, and documentation.

2. **Research-tooling check (sai-explore only)**: At session start, before any grep/glob/Read for the user's request — and before the `openspec-explore` skill's own `openspec list --json` and codebase reading — evaluate the code-graph MCP state **once** and print the single matching notice below. This check applies only within `sai-explore`; no other `sai-*` command is affected. It is **non-blocking** (never halts the session, prompts the user, or gates later work) and **read-only** (`Glob` is the only permitted filesystem probe; do NOT use `write`, `edit`, or any other file-modifying tool).

   **Fires**: once per session, at the start, before the first code search. Do NOT repeat the check or reprint the notice on later turns in the same session.

   **Detection** (read-only signals only):
   - **Tools present**: inspect the session's available tools for any name matching `codegraph_*` or `mcp__codegraph__*`. Match **either** form across the full tool list, including deferred/searchable tools not yet loaded — a matching name visible only as a deferred entry still counts as present. Do NOT depend on a single literal prefix, and do NOT call a code-graph tool to probe liveness.
   - **Index present**: run a read-only `Glob` for `.codegraph/*` at the project root (spell the directory literally; match entries *inside* it so an empty-but-present directory is not counted). A non-empty match means an index exists. A nested `.codegraph/` under some other directory does not by itself decide the state.

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

3. **Language gate for artifact reviews (sai-explore only)**: When this turn requests a review of an existing OpenSpec artifact, and the user's dominant natural language is not English, ask a single 2-option language question before producing any review content. This gate applies only within `sai-explore`; no other `sai-*` command is affected. It qualifies `sai/instructions/remember.md:4` ("Agent responses to user: Same language as user input by default") for artifact-review turns only; `remember.md` itself is unchanged.

   The gate fires **only** when reviewing one of the following artifacts is the turn's **primary deliverable**: `proposal.md`, `design.md`, `tasks.md`, `specs/**/*.md`, `implementation.md`, `review.md`, `security.md`, `performance.md`, or `accessibility.md` under `openspec/changes/{name}/`, `openspec/specs/`, or `openspec/changes/archive/`. The artifact may be referenced by literal path, bare filename, or change-name plus artifact mention. Free-form debate of the original idea, and turns that only cite an artifact as supporting evidence, do **not** trigger the gate.

   **Examples** (in-conversation detection guidance — not a rigid verb list):
   - **Fires on**: "review the design", "qué te parece el proposal", "mira los specs de oauth2-auth".
   - **Does not fire on**: "the design is too complex", "I'd change the proposal because…", "the design says X — what about Y?" (cited as evidence in a debate).

   **English skip**: If the turn's dominant natural language is English, produce the review directly in English with no question.

   **Fast-track skip**: If the fast-track signal is active, produce the review directly in English with no question.

   **Non-English gate**: If the turn's dominant natural language is not English, ask exactly one question with two options. The **entire question prompt and the non-English option label SHALL be translated into the user's current language**; only the literal word `English` (the English-option label) is preserved verbatim. The English option is the default: it SHALL be emitted first and carry the `Recommended` marker appended alongside the literal word `English` (e.g. `English (Recommended)`), preserving the verbatim-`English` guarantee. Produce **no** review content until the user answers. The English placeholder template below is NOT output verbatim:
   ```
   You're about to review an OpenSpec artifact. Which language should the review be in?
   - English (Recommended)
   - <endonym of the user's current language, written in that language>
   ```

   **Persistence**: The gate fires once per **review of a given artifact or set of artifacts**. Track the artifact(s) referenced in the most recent review turn (by filename or path). A new turn that references a *different* artifact or set → re-ask the gate. A follow-up turn about the *same* artifact(s) → reuse the previously chosen language, no re-ask. A new `/sai-explore` invocation starts with no tracked target → re-fires on its first non-English review turn. The choice and the tracked target are held in-conversation only; they are never written to a file or config.

   **Decline / non-committal / unclear language**: If the user declines or answers non-committally, fall back to the `sai/instructions/remember.md` policy (chat output in the user's input language). If the dominant natural language of the turn cannot be determined with reasonable confidence, do **not** ask the gate question; fall back to `remember.md`.

   **`Ready to Propose` invariant**: The review language gate never alters the `Ready to Propose` block — neither its content nor its language. The block's prose language is governed solely by the crystallization language gate (item 8), not by this review gate. No artifact file's format or content is altered by the review gate.

4. **Slicing assessment (before crystallizing)**: Before emitting any proposal block, run TWO assessments in order — a **size** judgment (is the change too big?) and then an **integration-point friction** judgment (is the code the change lands in hostile at the exact site the feature must plug into?). They are orthogonal axes and compose: either can add slices to the crystallized set.

   **Size judgment.** A change is "too big" when it would likely produce a diff too large to review carefully in one sitting (review fatigue hides defects). You cannot see the diff yet, so judge from the scope signals below:
   - several distinct user tasks with orthogonal concerns (not facets of one behavior);
   - no end-to-end path achievable in ~1–3 days;
   - touches more than one module boundary with no shared integration point.

   **Integration-point friction judgment (refactor-first).** After the size judgment, judge whether the *exact site* where the imminent feature would integrate is hostile — a qualitative judgment in the same tone as "too big", and distinct from it: size asks whether the *change* is too big; friction asks whether the *code the change lands in* is hostile at the integration point. The assessment **fires** when, at that specific site, either signal holds:
   - **mixed responsibilities** — the site conflates concerns, so the feature cannot be added without touching unrelated behavior; or
   - **no clean extension seam** — the feature can only be added by modifying existing code in place, not by extending it.

   Judge friction **locally and concretely**, tied to the integration point of the feature at hand — NOT as a global tech-debt audit of the surrounding module or repository (unrelated debt elsewhere does not fire it). Blast-radius metrics from a code graph MAY be cited as supporting evidence, but are NEVER a hard threshold that triggers it — the trigger stays qualitative. When friction fires, a behavior-preserving **slice 0** (the preparatory refactor) is prepended to the crystallized set per the slice-0 machinery in 6.

   **Routing** (both axes combined):
   - **Fits one change AND friction does not fire** → single-block protocol (5).
   - **Fits one change BUT friction fires** → sliced protocol (6) as a 2-block set: slice 0 (refactor) → slice 1 (the feature).
   - **Too big** → identify one **Walking Skeleton** (the simplest end-to-end path covering every user task, reversible) plus the remaining work grouped into review-sized slices (dependency-ordered), then crystallize via the sliced protocol (6); when friction also fires, slice 0 is prepended ahead of the Walking Skeleton (refactor → skeleton → backlog). Describe each slice as a user-facing outcome, not implementation detail — leave layer decomposition and delivery planning to `sai-2-design`/`sai-3-implement`. (Outcome-description exception: slice 0 is marked enabling / behavior-preserving, not user-facing value — see 6.)

   Ask a clarifying question only if the answer would change where the cuts fall; otherwise state your assumptions and proceed. When ambiguity materially affects where to cut, surface your assumptions explicitly inside the proposal block(s) so the user can correct them. Recommending a split or a refactor-first slice 0 is guidance, not a gate: if the user prefers to keep a large feature as a single change, or to land the feature directly in the tangle without slice 0, state the risk once, briefly, then proceed — with the single-block protocol (5) when no slice remains, and WITHOUT slice 0 when friction was declined. Do not re-litigate.

**Emission gate (on-demand crystallization)**

Before printing any `Ready to Propose` block, judge whether the idea is solid at the same qualitative threshold used in §5/§6 today. When the idea becomes solid, emit a single one-line readiness signal — for example, *"the idea looks solid — say 'crystallize' when you want the paste-ready `Ready to Propose` block"* — and do NOT auto-print the block. The signal fires at most once per stable idea, reusing the Persistence pattern from §3: track the current idea in-conversation, do not re-emit while the idea stays substantially the same, and re-fire only when the idea materially changes into a new stable idea. This tracking is held in-conversation only and is never written to any file or config.

The full `Ready to Propose` block(s) are printed only when the user explicitly asks to crystallize, asks for the paste-ready block, or asks to create a proposal / run `/sai-1-spec`. An explicit request made before the idea is judged solid is still honored, but the §4 slicing assessment runs first so the emitted block(s) reflect the correct single-vs-sliced routing.

5. **Crystallization protocol (single change)**: On an explicit crystallize request, when the idea is clear and fits one change **and the integration-point friction assessment (4) did not fire**, evaluate the crystallization language gate (item 8) first, then print the following structured block and instruct the user to open a new chat. (If the idea fits one change but friction fired, do NOT emit a single block here — route to the sliced protocol (6) and emit a 2-block set: slice 0 refactor → slice 1 feature.) The four sections between `**Capabilities in scope**` and `**Key constraints**` are mandatory; when a section has no content, emit a single `- None` bullet.

   ## Ready to Propose

   **Change name**: <kebab-case suggestion>
   **What**: <1–2 sentences describing the change>
   **Why**: <1–2 sentences stating the motivation>
   **Capabilities in scope**:
   - <capability>: <brief description>
   **Decisions & Rationale**:
   - <decision and rationale, or None>
   **Alternatives Considered**:
   - <rejected alternative, or None>
   **Trade-offs Accepted**:
   - <accepted trade-off, or None>
   **Model / Re-framings**:
   - <model re-framing, or None>
   **Key constraints**:
   - <constraint or non-goal>

   ---
   **Open a new chat** and run `/sai-1-spec` with the content above.

6. **Crystallization protocol (sliced feature)**: On an explicit crystallize request, when the feature was sliced, evaluate the crystallization language gate (item 8) first, then print one `Ready to Propose` block per slice, ordered (Walking Skeleton first, then backlog by dependency), under a short header that names the skeleton-vs-backlog split. Each slice is one future change: the Walking Skeleton is **always slice 1**; remaining work is grouped into slices each sized to be reviewable as a standalone unit (typically ~1–3 days, a handful of files with no deep refactor). Number the blocks; add a one-line `Depends on:` to each backlog slice. Tell the user to take the **first** block to a new chat with `/sai-1-spec`, and that each later slice becomes its own change once its predecessor is specced (the "new change per follow-up" pattern).

   **Slice 0 (refactor-first).** When — and only when — the integration-point friction assessment (4) fired, prepend a behavior-preserving refactor as **slice 0** ahead of the Walking Skeleton, reusing the same `Ready to Propose` block machinery. Slice 0 lives inside this SAME ordered set as the feature slice(s) — one dependency-ordered crystallization output — and is NEVER emitted as a separate recommended change with a standalone `Depends on:` outside the set.
   - **Ordering invariant**: the Walking Skeleton stays slice 1 and does NOT renumber to slice 0 when friction does not fire; slice 0 exists only when friction fired. Worked orderings — a size-sliced idea becomes **refactor → skeleton → backlog**; a single-change idea promoted by friction becomes **refactor (slice 0) → feature (slice 1)**.
   - **Slice-0 "done" (SOLID-scoped)**: **SRP** (diagnosis→remedy) — extract the mixed responsibility at the integration point to create the seam the feature needs; **OCP** (target seam) — shape that seam so the imminent feature attaches by extension rather than by modifying existing code; **behavior-preserving** — slice 0 changes no observable behavior and existing tests stay green; **YAGNI guardrail (MANDATORY)** — slice 0 opens ONLY the axis the imminent feature needs, with no speculative generality, and OCP MUST NOT become premature abstraction. If the seam could be opened along several axes, open only the one the feature needs.
   - **Outcome-description exception**: slice 0 is the one slice exempt from the "describe each slice as a user-facing outcome" rule (4) — its `What`/`Why` SHALL describe it as an enabling, behavior-preserving refactor and mark it explicitly as such (e.g. "enabling refactor — not user-facing value"). Every other slice (Walking Skeleton and backlog) keeps its user-facing outcome description, unmarked.

7. **Inline proposal refusal**: If the user asks to create a proposal or run `/sai-1-spec` now, evaluate the crystallization language gate (item 8) first, then decline with: "Creating a proposal opens a new context. The paste-ready block follows — copy it and start a new chat with `/sai-1-spec` to keep the spec session clean." Then print the paste-ready block(s).

8. **Crystallization language gate (sai-explore only)**: When this turn is an explicit crystallize request — the user asks to crystallize, asks for the paste-ready block, or asks to create a proposal / run `/sai-1-spec` — evaluate this gate after the §4 slicing assessment (so single-vs-sliced routing is already determined) and before printing any `Ready to Propose` block. This gate applies only within `sai-explore`; no other `sai-*` command is affected. It qualifies `sai/instructions/remember.md:4` ("Agent responses to user: Same language as user input by default") for crystallization turns only; `remember.md` itself is unchanged.

   The gate's machinery — English skip, Non-English gate, question presentation, dominant-language determination, persistence, decline fallback — is identical to item 3's, with these four deltas:

   **Fast-track skip**: If the fast-track signal is active, produce the review directly in English with no question.

   1. **Trigger**: an explicit crystallize request (per the Emission gate's trigger list) instead of an artifact-review request.
   2. **Tracked target**: the current crystallized idea or slice set instead of the reviewed artifact set.
   3. **Translated surface**: only the block's free-text prose is rendered in the chosen language. The following scaffolding stays in English regardless of language choice: the bold field labels (`**Change name**`, `**What**`, `**Why**`, `**Capabilities in scope**`, `**Decisions & Rationale**`, `**Alternatives Considered**`, `**Trade-offs Accepted**`, `**Model / Re-framings**`, `**Key constraints**`), the kebab-case Change name value, the `/sai-1-spec` command, and the "Open a new chat" line. The gate SHALL NOT alter any OpenSpec artifact file's format or content.
   4. **Sliced crystallization**: the gate fires once for the whole slice set, and the chosen language applies to the free-text prose of every emitted block. Per-slice scaffolding stays English.
