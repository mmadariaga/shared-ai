# Design Step — Design

Active step: design. Write `design.md`, then report the `design` step.

## Spec-problem handling during design

While generating design artifacts, if you discover a problem in `proposal.md` or any `specs/**/*.md` (for example: a requirement that contradicts the codebase, a missing or wrong scenario, an internally inconsistent spec, or a spec-vs-source contradiction), classify the problem first, then your clarity on the fix.

Fetch `@sai/policies/artifact-review-contract.md` and apply its § Scope observations, with the approved `proposal.md` and `specs/**` as the approved scope. A scope observation is recorded in `design.md` `## Decisions` as a bullet of the form "out of scope: X — revisit when Y" and named in your report `notes` in the report line form of § Scope observations; design continues from the specs as approved, with no question.

Every other problem is a spec defect and takes the clarity path:

- **Clarity present** — you can state the exact text to change and the exact replacement, grounded in the proposal, the specs, and any codebase facts already gathered. Report `needs_input` with (1) the discovered problem, (2) the concrete diff to `proposal.md` and/or the affected `specs/**/*.md` file(s), and (3) the two options `in-place` (apply the patch) and `route` (leave the specs and name the correction for `/sai-1-spec`). Never apply the amendment by default; wait for the coordinator's answer.
  - If the answer is **in-place**: apply exactly the presented patch, then write `approval.specs.amendment.{at, notes}` to `openspec/changes/{resolved_change_name}/.openspec.yaml`, merging into the existing file content and preserving all prior top-level keys (including `schema:`, `created:`, `approval.specs.approved_at`, and `approval.specs.notes`) verbatim — do NOT truncate or rewrite the whole file. Then continue generating design artifacts from the amended specs.
  - If the answer is **route** (or anything other than in-place): do NOT modify `proposal.md` or `specs/**`, do NOT write an amendment audit entry, continue generating design artifacts from the specs as approved, and name the correction in `notes` so that the closing report can send the user to `/sai-1-spec`.

- **Clarity absent** — you cannot determine the correct amendment (for example, a spec-vs-codebase contradiction where you cannot tell which side is stale, or a fundamentally wrong spec you cannot safely patch). Report `failed`, name the defect and where it is, and say that the correction belongs to `/sai-1-spec`. Do NOT offer an in-place amendment and do NOT modify `proposal.md` or `specs/**`.

## Generate design.md

Write to `openspec/changes/{resolved_change_name}/design.md`. The file is reduced to the sections that have a consumer; `proposal.md` and the specs already state the context, the goals, and the non-goals, so none is repeated here.

Required sections, in this order:
- **Target State** (first, see below): the finished shape of the change, with its file manifest.
- **Decisions**: key technical choices. Fetch `@sai/policies/adr-ddr-criteria.md` and evaluate every decision against the three ADR/DDR criteria it defines. If all three apply, document alternatives-considered and rationale for the chosen approach, and resolve the decision's record family by the ordered routing test defined in that policy. The resolved family is emitted here as the pinned sub-field `**Record family**: adr|ddr` (the label is byte-exact so two independent design runs emit the same parseable token). The design writes no record: the outermost implementing command creates it at close from the final code (`@sai/policies/decision-record-creation.md`), so the sub-field is the hand-off and needs only the decision, its alternatives, and its rationale. A follow-up or a scope observation is recorded here as a bullet of the form "out of scope: X — revisit when Y".
- **Risks / Trade-offs**: known limitations; format: [Risk] → Mitigation. A migration, deploy-order, feature-flag, or rollback concern is a risk with its rollback strategy as the mitigation; a check that no automated test covers and that `/sai-4-review` does not already cover (generated-artifact drift, an end-to-end smoke across real runtimes) is a risk whose mitigation names the manual check and what a correct result looks like. A risk MAY carry an optional **verify-first marker** — the pinned parenthetical `(**Verify-first**: Step N)` placed immediately after the risk text and before `→ Mitigation:` — naming, by its integer `Step N`, a step whose design depends on the risk being resolved or disproven first. The marker MUST cite a concrete `Step N`; unanchored ordering phrases such as "early" or "before implementation" are rejected. The marker is optional: a risk with no ordering dependency carries none and emits no placeholder. A verify-first risk is a known risk with a known resolution point — it is NEVER treated as an Open Question or routed through the blocking Open Questions gate. The `**Verify-first**` label is pinned byte-exact for the same parseability reason as `**Record family**`.
- **Open Questions** (transient): outstanding unknowns that the tasks step resolves and removes before it writes `tasks.md`. A finished `design.md` has none; emit the section only while a question is open.

`## Learnings Corrections` is a fourth section that the design phase never writes: only the `/sai-3-implement` close appends it, when a learnings entry failed on execution. A rerun keeps it as it is.

Reference `proposal.md` for motivation, `specs/**/*.md` for requirements. A change whose `.openspec.yaml` sets `skip_specs: true` has no specs: reference the statements of `proposal.md`'s What Changes for requirements.

## Target State (authored first in design.md)

`design.md` SHALL begin with a `## Target State` section, authored and persisted by the design phase as the authoritative source for the change's finished-shape snapshot, before `## Decisions` and the other design sections.

`## Target State` SHALL present the finished shape the change converges on as **one concrete artifact**: not a per-step narrative and not a restatement of the change's motivation. Interpret "finished shape" by what the change produces: for code changes, the resulting payload, public signature, schema, file layout, or config shape as it will exist after the last step, naming every new or changed public symbol with its exact signature (the plan RED writes its stubs from these signatures and nothing else declares them); for prose, instruction, or documentation changes, the resulting section and field structure of each document the change touches, as it will read after the last step. The section SHALL be written so a reader who reads only `## Target State` knows what the repository looks like when the change is complete, without reading any `## Step N` section. When a change genuinely produces no finished shape expressible under either interpretation, emit `## Target State` with an explicit `None` and a one-line reason — never silently omit it.

After that artifact, `## Target State` carries one subsection, `### File Manifest`, but the design step does not plan or author it: the tasks step writes `tasks.md` and then the deterministic `file-manifest.js` tool folds its `**Files Affected**` entries into this subsection (creating it when absent). Do not hand-write manifest lines or a placeholder here. See `@sai/commands/design/steps/tasks.md` for the tool call. The manifest is a flat, git-status-style list with exactly one line per file the change creates, modifies, deletes, or renames, a target-state view produced by the tool's net fold over the per-step `**Files Affected**` entries of the same change's `tasks.md` — the `A`/`M`/`D`/`R` tokens and the `R <src> -> <dst>` form of those entries: one path, one line, never a concatenation of per-step entries for the same path. Because the plan's pull request shows only tests and stubs, the manifest is where a reviewer sees the documentation, prompts, configuration, and glue code that never pass through the plan RED.

Each non-empty manifest entry is a Markdown bullet prefixed with `- `, one entry per line, including its token, rename paths, and step references. Verification accepts legacy unbulleted entries without rewriting existing artifacts; explicit regeneration emits bullets.

When the net fold produces no lines, carry the exact sentinel `None — no files affected` followed by a one-line reason.
