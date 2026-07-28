# ADR Index

This index groups the ADRs in `docs/adr/` by **<domain unit>** and by **cross-cutting category**. An ADR may appear in more than one category: the filesystem already lists them alphabetically; the value here is the relational map (amends, supersedes, sibling pairs, refs).

> Cold-build source for `sai/instructions/implement.md` Step 3's index-maintenance hook. This file is a **project-agnostic section skeleton** — it carries NO baked-in domain-unit or category snapshot. The cold build derives the `### <domain unit reference>` subsection names under `## By <domain unit>` and the `### <category>` subsection names under `## Cross-cutting categories` from the ADRs' own content at cold-build time. A consumer project's cold build therefore produces that project's own domain-unit/category subsections, never another project's snapshot.

## Conventions

- Each entry references the ADR by its original title (as it appears in the file).
- *Note* indicates a relationship using pinned entry-line token forms: `— Pair with NNNN`, `— Refs NNNN`, `— **Amends** NNNN`, `— **Reframes** NNNN`, `— **Reverses** NNNN`, `— Supersedes NNNN`.
- *Superseded* marks ADRs whose decision was replaced; the content remains historically accurate.
- The cold build is the sole branch that recomputes global structural thresholds: a cross-cutting category appears as its own `### ` subsection only when ≥2 ADRs reference it; fewer than 8 cross-cutting ADRs collapse to a single list; the 8–12 target subsection count is a cold-build-time recomputation. The warm path does NOT recompute these — minor category/threshold drift between cold builds is accepted.

---

## By <domain unit>

<!-- cold-build: derive the ### <domain unit reference> subsection names from the ADRs' own content at cold-build time. Do NOT snapshot any project's domain units here. Insert one ### <domain unit reference> subsection per distinct domain-unit reference the ADRs mention, then categorise each ADR under the subsection(s) it references. -->

---

## Cross-cutting categories

<!-- cold-build: derive the ### <category> subsection names from the ADRs' own content at cold-build time. Do NOT snapshot any project's categories here. Apply the threshold rules from ## Conventions (≥2 ADRs → own subsection; <8 → collapsed single list). Insert one ### <category> subsection per cross-cutting category that meets the threshold, then categorise each ADR under the subsection(s) it references. -->

---

## ADRs that extend or correct prior ones

<!-- cold-build: populate with one row per ADR that amends, supersedes, reverses, or reframes an earlier ADR. Use exact Action values: supersedes | amends | reverses | reframes. -->

| ADR | Action | Over |
|---|---|---|
| [NNNN](./NNNN-slug.md) | supersedes | [NNNN](./NNNN-slug.md) |

## Superseded ADRs (historical)

<!-- cold-build: move every superseded ADR's entry here with a *Superseded by [NNNN]* note appended to its entry line. Preserve each superseded ADR's exact H1 title and any pre-existing relationship annotations. -->

- [NNNN — {Title}](./NNNN-slug.md) — *Superseded by [NNNN](./NNNN-slug.md)*
