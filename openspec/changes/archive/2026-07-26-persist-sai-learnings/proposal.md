**Complexity**: high (6 capabilities, 25 requirements, 8 affected paths, no breaking change)

## Why

Roughly 53% of the deviations recorded across archived `implementation.md` files are ground-truth ignorance — the plan asserted something false about the toolchain, ORM, or test harness — and several are repo-wide facts rediscovered a month apart. The coordinator already holds exactly these facts in its Technical Learnings Memory (`sai/instructions/apply.md:214`), but `docs/adr/0020-ephemeral-in-context-technical-learnings-memory.md` makes that memory deliberately ephemeral, so the knowledge dies with the run.

## What Changes

- Add a project-root `SAI_LEARNINGS.md` holding durable, execution-observed facts about how the repo actually builds, tests, and behaves. Its four sections — **Stack**, **Conventions**, **Avoid**, **Test Command** — carry the same names as the four fields of `tasks.md`'s `## Implementation Context` (`openspec/specs/tasks-implementation-context/spec.md:10`). For **Stack**, **Conventions**, and **Avoid** the merge at the consumption site is field-to-field with no translation layer. **Test Command** is the deliberate exception: the consuming field must hold one directly-executable command string, so the learnings section is specified as single-valued and keyless rather than as a keyed bullet list.
- Add `sai/instructions/sai-learnings-format.md` governing the file, modeled structurally on `sai/instructions/glossary-format.md`: scope, canonical location, file structure, rules, append/supersede rules, bootstrap.
- Extend the `sai-4-apply` coordinator with an end-of-run promotion pass: after the Final sweep (`sai/instructions/apply.md:33`) and before the MANDATORY STOP (`sai/commands/sai-4-apply.md:55`), it promotes qualifying entries from the `## Appendix: Plan vs Final Implementation` it has already written into `SAI_LEARNINGS.md`, in its own commit behind its own authorization gate.
- Extend `apply-coordinator-authority`'s write scope, which today admits only `implementation.md` checkboxes plus the deviations and telemetry appendices, to additionally admit `SAI_LEARNINGS.md` at the project root. ADR 0020 line 28 already names this as the required precondition for durability, so this change follows the path that ADR anticipated rather than reversing it.
- Extend the consumption side: `sai-4-apply` pre-seeds its Technical Learnings Memory from the file at run start under the existing selection and blindness rules (`sai/instructions/apply.md:222`); `sai-2-design` merges the file into `tasks.md`'s `## Implementation Context` (`sai/instructions/design.md:184`), from where it already reaches `sai-3-implement`'s expertise contract and the blind test-writer's injected slice (`sai/instructions/apply.md:125`).
- Wire the two wrappers (`sai/commands/sai-2-design.md`, `sai/commands/sai-4-apply.md`) to fetch the new format file, mirroring how `glossary-format.md` is already fetched.
- Amend ADR 0020 to record that the durable channel was never the ephemeral learnings memory but the deviations appendix — an artifact 0020 did not consider — rather than presenting itself as reversing 0020's ephemerality decision.
- No breaking change: absence of `SAI_LEARNINGS.md` is a silent no-op for every reader, mirroring the `GLOSSARY.md` pattern at `sai/instructions/review.md:93`.

## Capabilities

### New Capabilities

- `sai-learnings-file`: the artifact itself — single canonical project-root location, the four sections Stack / Conventions / Avoid / Test Command, the per-entry shape, and the supersede-by-key rule; governed by a new `sai/instructions/sai-learnings-format.md`.
- `sai-learnings-promotion`: `sai-4-apply`'s end-of-run write — the promotion source, the artifact filter, the dedicated commit gate, and bootstrap-on-first-promotion.
- `sai-learnings-consumption`: `sai-4-apply` pre-seeds its Technical Learnings Memory from the file at run start; `sai-2-design` merges it when authoring `tasks.md`'s `## Implementation Context`.

### Modified Capabilities

- `apply-coordinator-authority`: the coordinator's write scope is extended from `implementation.md` alone to also include the project-root `SAI_LEARNINGS.md`, written only in the end-of-run promotion pass behind its own authorization.
- `apply-technical-learnings-memory`: the memory gains a second source — a run-start pre-seed read from `SAI_LEARNINGS.md` — alongside the existing per-dispatch field-6 accumulation. Selection, non-dump, and blindness rules are unchanged and govern pre-seeded entries identically.
- `tasks-implementation-context`: the section gains a declared second source and a precedence rule. Fresh research wins over a recorded entry on disagreement; within the **Conventions** 2–5 bullet quota, research-derived bullets are placed first and merged bullets are the ones dropped on overflow; **Test Command** is explicitly excluded from field-to-field merging. This capability is modified rather than left silent because the quota and the executability contract it owns are what the second source contends with.

## Impact

**Affected paths (8):**

- `SAI_LEARNINGS.md` — new; created at the project root of the consuming repo on first promotion (not committed to this repo as content)
- `sai/instructions/sai-learnings-format.md` — new; the format contract
- `sai/instructions/apply.md` — promotion pass, promotion commit gate, run-start pre-seed
- `sai/instructions/design.md` — merge the file into `## Implementation Context`
- `sai/commands/sai-2-design.md` — fetch the format file
- `sai/commands/sai-4-apply.md` — fetch the format file
- `docs/adr/0073-durable-channel-is-the-deviations-appendix.md` — new; records the durable-channel reframing. ADR 0020 itself is NOT edited: no amended ADR in this repository carries a marker (verified against the `0013 amends 0012` and `0062 amends 0026` pairs), so the relationship lives in this ADR's `## Related` section and in the index instead.
- `docs/adr/0000-INDEX.md` — new amends row

The ADR number is 0073, reserved during `/sai-2-design` (current highest: 0072).

**Explicitly NOT touched** (constraints carried from the request):

- `sai/instructions/spec.propose.md` and `sai/instructions/implement.md`
- `openspec/specs/artifact-only-scope/`, `openspec/specs/deduplicate-sai-2-design/`, `openspec/specs/apply-pre-commit-file-report/`
- The subagent report contract stays at 9 fields (`sai/instructions/apply.md:172-180`); no new subagent type, no new dispatch kind.

**Non-goal:** fixing the pre-commit staging contradiction between the per-Step add-list rule and the report's other blocks.

## Proposal Research Documentation

**Local files**:

- `sai/instructions/apply.md` — Final sweep (:33), deviations appendix format (:34-52) with `**Final:**` (:44), telemetry appendix (:54), blind test-writer injected slice (:125), subagent report fields 1-9 (:172-180), Technical Learnings Memory (:214-233) incl. ephemerality (:216) and selection/blindness (:222), pre-commit report trigger (:237), add-list (:244), Plan cross-check (:256), Subagent ↔ git (:257)
- `sai/commands/sai-4-apply.md` — fetch block (:38), the "after the Final sweep and before the MANDATORY STOP" slot (:51), MANDATORY STOP text (:55)
- `sai/commands/sai-2-design.md` — fetch block (:26) showing the `glossary-format.md` precedent
- `sai/instructions/design.md` — `## Implementation Context` four-field authoring (:184), Inputs (:41)
- `sai/instructions/implement.md` — no-fresh-exploration constraints (:31, :211)
- `sai/instructions/review.md` — absent-root-file silent-skip precedent (:93)
- `sai/instructions/glossary-format.md` — structural model for the new format file
- `openspec/specs/apply-coordinator-authority/spec.md` — current write scope (whole file)
- `openspec/specs/apply-technical-learnings-memory/spec.md` — accumulation, non-dump, blindness requirements
- `openspec/specs/tasks-implementation-context/spec.md` — the four-field contract the file's sections mirror (:10)
- `openspec/specs/artifact-only-scope/spec.md` (:11), `openspec/specs/deduplicate-sai-2-design/spec.md` (:12) — boundaries left untouched
- `openspec/specs/apply-pre-commit-file-report/spec.md` — requirement headings, left untouched
- `docs/adr/0020-ephemeral-in-context-technical-learnings-memory.md` — Decision (:15) and Consequences (:27-29), incl. the line pre-authorizing a write-scope extension (:28)
- `docs/adr/0000-INDEX.md` — amends-table format (:243-253)

**External URLs**: none.

## Additional Notes

- **ADR 0020 anticipated this change.** Its Consequences line 28 reads: "If a future change wants durability across sessions, it must first extend `apply-coordinator-authority`'s write scope (or introduce a new spec) before persisting learnings anywhere — this ADR's choice is not a permanent constraint, only the correct minimal scope for this change." The amendment therefore records a reframing, not a reversal.
- **Section reuse is load-bearing for three of four sections.** `SAI_LEARNINGS.md`'s section names match the four fields `tasks.md`'s `## Implementation Context` already mandates, so for **Stack**, **Conventions**, and **Avoid**, `sai-2-design` merges section-into-field with no mapping step. **Test Command** is the exception and is specified separately: the consuming field is contractually a single directly-executable command with a parameterised scoping idiom (`tasks-implementation-context/spec.md:18,22,24,28`), and `apply.md:125` injects it verbatim into the blind test-writer. A keyed bullet list carrying an `*Observed:*` provenance line would hand that dispatch a non-executable command, so the learnings **Test Command** section is single-valued and keyless, its provenance sits on its own line, and only the command string crosses into the field.
- **Field 5 is the promotion source; field 6 is a supplement.** All observed category-A facts in the audit came from deviations, so field 5 has empirical yield; field 6 has never been persisted, so its yield is unobservable. Field 5's `**Final:**` (`apply.md:44`) already carries "what works instead" — the property field 6 was supposed to hold uniquely. The criterion "observed, not inferred" is satisfied by construction: a deviation is by definition something execution surfaced.
- **One classification does three jobs.** "Does this entry name a repo-level artifact rather than a symbol this change introduced?" is simultaneously the promotion filter, the supersede key, and the anchor a reader matches on. The entire judgment budget is spent once — necessary because `sai-4-apply` runs on the cheapest model in the pipeline.
- **Invalidation is supersede-by-key, not delete-authority.** Each entry is keyed on the repo-level artifact it concerns (a package, a build target, a command, a compiler rule); a newer fact about the same key replaces the older one. This converts an active-detection problem into a passive-write property and leaves `artifact-only-scope` and `deduplicate-sai-2-design` untouched.
- **The blindness bypass is held closed by construction.** A promoted fact reaches the blind test-writer via `## Implementation Context`, which sidesteps the coordinator's injection-time blindness filter (`apply.md:222`). The artifact test guarantees a promoted entry never names a symbol the current change introduces, so the bypass cannot leak a GREEN body. This is stated as an explicit invariant rather than left implicit.
- **The promotion commit is deliberately independent of the per-Step add-list rule.** `apply.md:244` is scoped per Step and sourced from subagent field 8; the promotion commit never consults it. This keeps the change decoupled from the separate staging contradiction.
- **The pre-commit file visibility report does not fire for the promotion commit.** It is specified "at every STOP & COMMIT marker" (`apply.md:237`) and this is not one; its add-list, Plan cross-check, and Subagent ↔ git blocks have no referent for a single coordinator-written file after the last Step. A minimal disclosure plus a closed-choice yes/no gate replaces it.
- **`sai-3-implement` never reads the file directly** — only via `## Implementation Context`. `implement.md:31` and `:211` forbid it fresh exploration, so a direct read would contradict its contract.
- **Namespaced filename.** shared-ai installs into third-party repos where a generic `LEARNINGS.md` could collide with existing retrospective or onboarding notes and silently poison the pipeline.
- **Instruction filename follows the all-hyphen convention.** The governing file is `sai-learnings-format.md`, not `sai_learnings-format.md`. Every sibling in `sai/instructions/` is all-hyphen (`glossary-format.md`, `commit-rules.md`, `change-picker.md`, `artifact-feedback-gate.md`), and the hyphenated form also matches this change's own capability names. The artifact keeps its `SAI_` prefix — that prefix exists to avoid collisions at the project root of a consumer repo, a pressure that does not apply inside `sai/instructions/`.
- **Two line citations from the originating request were wrong and are corrected here.** The request cited `apply.md:38` for the Final sweep and `apply.md:36` for the GREEN-conflict halt; the actual lines are `:33` and `:31`, verified against source. The corrected values are the ones used throughout this proposal and should not be reverted.
- **Wrapper wiring is genuinely 2 edits.** A repo-wide search for `glossary-format` confirms `sai/commands/` is the single wrapper source; there are no parallel opencode or Copilot command copies carrying their own fetch lists. Harness parity rides the shared instruction bodies.
- **A class of stale entries is never re-observed, not merely slow to correct.** The originally accepted trade-off was "a stale entry survives until some later run happens to touch its key." The read and write paths interact more sharply than that: promotion fires only from a deviation, a deviation is an execution failure, and `sai-2-design` preferring fresh research is exactly what prevents that failure. So an entry corrected at design time never produces the deviation that would supersede it, and no phase may delete it. The cost is bounded — `sai-2-design` re-corrects it every cycle, so nothing breaks — but it is a distinct and stronger consequence, recorded here as its own trade-off. Two disclosure-only escape hatches are specified rather than granting anyone delete authority: `sai-2-design` prints a contradiction notice naming the key when its research overrides a recorded entry, and the promotion disclosure lists the keys this run's execution contradicted.
- **Alternative rejected — `sai-5-review` as the write site.** It is the strongest model in the pipeline, it sees both the diff and the appendix, and it has precedent for reading a project-root file (`review.md:93`). Rejected because promotion would become contingent on the user choosing to run `/sai-5-review`, and because it would re-summarise facts the coordinator already holds — when the coordinator has the same write authority at the same moment. Recorded here because `proposal.md` is `/sai-2-design`'s input and the schema places alternatives in `design.md`, which does not yet exist.
- **Accepted trade-offs**: a stale entry survives until some later run touches its key; the promotion judgment runs on the cheapest agent (mitigated by making the filter one mechanical classification, not a rubric); the **Avoid** section will dominate the file, which is that section working rather than a defect; and a run that halts before the Final sweep (a GREEN-conflict halt, `apply.md:31`) promotes nothing that run — the facts survive in the committed deviations appendix and can be promoted by a later run.
