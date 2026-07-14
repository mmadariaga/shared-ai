## Why

The blanket rule "Generate ONLY `design.md` and `tasks.md` for change `$ARGUMENTS`. Do NOT regenerate `proposal.md` or `specs/`." in `sai/instructions/design.md:26` leaves sai-2-design no in-prompt path to correct a spec problem it discovers during design. The emergent workaround is to send the user back to `/sai-1-spec`, which forces a 3-round-trip loop (sai-2 → user → sai-1 → user → sai-2) for fixes the LLM already has full context to apply in one step. This change codifies an in-place amendment path gated on LLM clarity and explicit user consent, and reserves the sai-1 round-trip for the cases where the LLM genuinely cannot resolve the issue.

## What Changes

- Replace the blanket "Do NOT regenerate `proposal.md` or `specs/`" rule in `sai/instructions/design.md` with a **clarity-gated issue-handling procedure**: when sai-2 discovers a spec problem during design (a requirement that contradicts the codebase, a missing or wrong scenario, an internally inconsistent spec, or a spec-vs-source contradiction — the exact enumeration lives in the `design-phase-in-place-amendment` spec), it makes a **binary** classification of its own clarity on the fix, then acts.
  - **Clarity present** → present the problem + the proposed patch (the concrete diff to `proposal.md` and/or `specs/**`) + a **closed-choice** offer: apply in place, or route to `/sai-1-spec`. Never apply by default.
  - **Clarity absent** → route the user to `/sai-1-spec` directly (the existing fallback, now the narrow last resort).
- Widen sai-2-design's write scope from "`design.md` + `tasks.md` + `interfaces.md` + approval audit fields" to **also include `proposal.md` and `specs/**`**, gated on explicit per-amendment user consent.
- When an in-place amendment is applied, **record an audit entry** in `openspec/changes/{name}/.openspec.yaml` under `approval.specs.amendment.{at, notes}`, so the spec's evolution from approval to implementation is auditable. Silent patches are forbidden.
- The change is local to shared-ai instructions + a new capability spec. `sai-1-spec` is untouched; it remains the source of truth for fresh specs and the fallback path. The behavior is harness-agnostic (Claude Code, opencode, GitHub Copilot).

## Capabilities

### New Capabilities
- `design-phase-in-place-amendment`: when sai-2-design discovers a spec problem during design, it classifies its clarity on the fix and either (clarity present) offers the user an in-place amendment vs a route to `/sai-1-spec`, or (clarity absent) routes to `/sai-1-spec` directly. The amendment is always offered, never applied by default.
- `spec-amendment-audit`: when an in-place amendment is applied during design, it is recorded in `.openspec.yaml` under `approval.specs.amendment.{at, notes}`, keeping the approval/amendment split clean and auditable.

### Modified Capabilities
- *(none — the replaced "Do NOT regenerate" rule lives in the sai-2-design instruction body, not in a versioned capability spec, so its replacement is captured by the two new capabilities above plus the Impact edit below rather than as a spec delta; see Impact.)*

## Impact

- `sai/instructions/design.md` — the `## Generation Instructions` section: the blanket **write-scope** rule at line 26 ("Generate ONLY `design.md` and `tasks.md`… Do NOT regenerate `proposal.md` or `specs/`.") is replaced by the clarity-gated issue-handling procedure, which admits `proposal.md` and `specs/**` as amendment targets under the consent gate. The `## Cost discipline reminder` at the file's end is a **read-scope** rule (it gates `Read`, and already lists `proposal.md` and `specs/**/*.md` as permitted reads); it is unaffected by this change and needs no edit.
- `openspec/specs/design-phase-in-place-amendment/spec.md` and `openspec/specs/spec-amendment-audit/spec.md` — new capability specs created by this change.
- `.openspec.yaml` schema (per-change file) — a new optional sub-object `approval.specs.amendment.{at, notes}` is introduced alongside the existing `approval.specs.{approved_at, notes}`. It is written only when an amendment is applied; its absence is the normal state.
- `sai/instructions/spec.propose.md` and `sai/commands/sai-1-spec.md` — **no edit.** sai-1 remains the fresh-spec source of truth and the fallback path.
- Semantic shift: the specs approval gate moves from "frozen at approval" to "checkpoint that may be amended in the next phase with user consent + audit". Readers of `sai-3-implement` onward must understand the spec may have moved between approval and the start of implementation; the `amendment` audit entry is where that movement is recorded.
