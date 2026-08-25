# Item 4: Slicing assessment (before crystallizing)

Before emitting any proposal block, run TWO assessments in order — a **size** judgment (is the change too big?) and then an **integration-point friction** judgment (is the code the change lands in hostile at the exact site the feature must plug into?). They are orthogonal axes and compose: either can add slices to the crystallized set.

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

   Each identified slice adds its three Idea Progress List items (item 11) — slice-crystallization, reviewed-sai-1, reviewed-sai-2 — in the unmarked state, in the order the assessment identifies the slices. The assessment identifies slices by role and outcome description and does not name them, so no item is added at assessment time: each slice's three items are added at that slice's block emission (items 5/6), where the authored `**Change name**` key binds to them — keyed items only, and no unkeyed item ever enters the list. When the user keeps a large feature as a single change after the assessment recommended a split, only the emitted block's change adds items (`specs/explore-idea-list/spec.md` requirement `slice-crystallization-item-marking`).

   Ask a clarifying question only if the answer would change where the cuts fall; otherwise state your assumptions and proceed.

When a clarifying question is asked, it SHALL reference `@sai/policies/question-context.md` and comply with its anatomy: it states what is being decided (where the slicing cuts fall), why it matters (the cuts determine the change boundaries and their dependency order), and the essential state context of the candidate idea being sliced, in plain wording. The rule that the question is asked only when the answer would change where the cuts fall SHALL be preserved.

When ambiguity materially affects where to cut, surface your assumptions explicitly inside the proposal block(s) so the user can correct them. Recommending a split or a refactor-first slice 0 is guidance, not a gate: if the user prefers to keep a large feature as a single change, or to land the feature directly in the tangle without slice 0, state the risk once, briefly, then proceed — with the single-block protocol (5) when no slice remains, and WITHOUT slice 0 when friction was declined. Do not re-litigate.

**Crystallize stage (stage 4).** Advancing into `Crystallize` is itself an explicit crystallization request: immediately run the slicing assessment, then the crystallization language gate (item 8), then the overview-language gate (gate 9), before any `Ready to Propose` block prints. From `Implementation details`, `next-step`, `crystallize`, natural-language advancement, semantic list confirmation, and deterministic empty-set advancement are equivalent ways to enter this stage. A direct crystallization request from an earlier stage first runs the mandatory edge-case review with no skip path; after agreement, the pending request enters crystallization directly and the emitted block carries `**Implementation Details**: - None` when stage 3 was skipped. `--fast-track` bypasses only the two language questions and never skips, weakens, or auto-completes a stage. At the first slice block emission (the idea list's first render), clear the stage TODO and let the idea progress list take the panel; never re-render the stage TODO afterward.

