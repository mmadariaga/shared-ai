# ADR 0110: Extract the decision-record index machinery into an abstract capability with spec-pinned framework values

## Status

Accepted

## Context

Step 3 of the `/sai-3-implement` instruction (`sai/instructions/implement.md`) and the
`adr-index-maintenance` capability spec parameterize only one axis of the decision-record
index: the `<domain unit>` H2 noun, substituted at cold-build time from the project's own
ADR vocabulary. Every other parameter of the index machinery is hardcoded in both surfaces
and restated verbatim in each — the mapping rules and their precedence, the fallback noun,
the cross-cutting thresholds, the relationship-token rules, the link-form rules, and the
index-output invariants. Two sources of truth for the same contract drift independently:
`docs/adr/0000-INDEX.md` hand-curation, the hook text, and the spec each carry their own
copy of the values.

## Decision

Extract the shared machinery into a new abstract `decision-record-index-machinery`
capability that every concrete decision-record index (currently `docs/adr/0000-INDEX.md`,
with future types allowed) inherits. The abstract surface owns the canonical section
skeleton, the `<domain unit>` noun derivation procedure, the cross-cutting threshold
contract, the relationship-token rules (including the family-bound `supersedes` rule and
the `<family>:NNNN` cross-family encoding), the link-form rules, and the index-output
invariants. Its framework values — the closed five-pattern-form mapping list with
precedence, the fallback noun `domain unit`, and the threshold trio
`min_count = 2 / target_range = [8, 12] / collapse_below = 8` — are pinned in the spec,
not in code, and are the contractually-defined defaults for unconfigured projects.
`adr-index-maintenance` declares its three per-index bindings (`docs/adr/`, `0000-INDEX.md`,
`# ADR Index`) and its two type-specific section headings, and delegates every
parameterizable value to the abstract surface by name. The Step 3 hook text is thinned to
reference the abstract surface for the shared contract while keeping every per-ADR
behavior (entry-line form, structured relationship-line emission, annotation token forms,
correction-table header, supersede moves, warm placement rules, idempotency key) inline.

## Alternatives Considered

- Keep the values restated in the hook text (today's state): rejected — the hook and the
  spec carry two copies of the same contract and drift independently; eliminating that
  restatement is the reason this change exists.
- A project-level config block (`decision_record_indexes:` in `openspec/config.yaml`):
  rejected for this slice — the framework values must be visible in the spec and must hold
  as defaults for unconfigured projects; an override mechanism is a future slice.
- A `bin/` script computing the values: rejected — the values must be normative in the
  spec, not hidden in code.

## Consequences

The abstract surface becomes the single source of truth for the shared contract; concrete
specs and the hook reference it by name instead of restating it. The framework values
produce a byte-for-byte equivalent of today's live `docs/adr/0000-INDEX.md` for a project
that changes nothing, so the change is behavior-neutral until a second family (DDR)
instantiates the surface — at which point re-splitting or relocating the framework values
would touch every concrete spec, which is what makes this decision hard to reverse from
then on. The cross-family rules bound now (`supersedes` family-bound; `refs` /
`pair-with` / `amends` / `reframes` / `reverses` may cross; `../<family>/NNNN-slug.md`
link form; `<family>:NNNN` encoding) mean the future DDR slice adds a second concrete
capability against a stable contract rather than re-deriving the family-boundary rules.

## Provenance

User-approved decision recorded in the `parameterize-decision-record-index-machinery`
design (Decision 1).
