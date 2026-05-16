<glossary_format>

# GLOSSARY.md Format

Canonical structure for `GLOSSARY.md` — the single source of truth for a project's domain language. Adapted from https://github.com/mattpocock/skills/blob/main/skills/engineering/grill-with-docs/CONTEXT-FORMAT.md.

This file is consumed by the spec, plan, and review instructions. Any agent that reads, writes, or audits `GLOSSARY.md` must conform to this format.

## Scope

`GLOSSARY.md` documents domain language and concepts only. It excludes general programming concepts.

## File structure

```markdown
# {Project or Bounded Context Name}

{One or two sentence description of the context this glossary covers.}

## Language

**{TermName}**: "{Concise definition, one sentence max — state what it IS, not what it does.}"
*Avoid*: {comma-separated list of conflicting aliases or synonyms to reject}

**{TermName}**: "{Concise definition.}"
*Avoid*: {aliases}

## Relationships

- **{Term A}** has many **{Term B}** ({notes on cardinality / lifecycle})
- **{Term A}** belongs to one **{Term C}**
- **{Term D}** triggers **{Term E}** when {condition}

## Example dialogue

> **Dev:** {Question using domain terms.}
> **Domain expert:** {Reply that anchors usage of the terms.}

## Flagged ambiguities

- **{Conflict topic}** — {Two or more candidate terms that overlap.} **Resolution:** {chosen term + rationale.}
```

## Rules

- **Be opinionated** about term selection. Always list rejected aliases in `*Avoid*`.
- **Tight definitions.** State what a term IS, not what it does or how it is implemented.
- **Relationships use bold names + cardinality** (one-to-many, belongs-to, triggers).
- **Exclude general programming concepts.** Only project-specific terminology.
- **Flag conflicts explicitly** in `## Flagged ambiguities` with a resolution.

## Append rules (mid-conversation updates)

When a new domain term is resolved during planning:

1. Insert it alphabetically into `## Language` with its `*Avoid*` aliases.
2. If it relates to existing terms, add or update an entry in `## Relationships`.
3. If it conflicts with an existing term or alias, add an entry to `## Flagged ambiguities` with the chosen resolution.
4. Do not batch — append immediately.

## Multi-context repos

For projects with multiple bounded contexts, create a root `GLOSSARY-MAP.md` listing:
- Each context's location (path to its own `GLOSSARY.md`) and purpose
- Cross-context relationships and event flows
- Shared types or conventions

Resolution order: check for `GLOSSARY-MAP.md` first, then fall back to a single root `GLOSSARY.md`.

## Bootstrap (when no `GLOSSARY.md` exists yet)

On the first domain term resolved during planning:

1. Create `GLOSSARY.md` at the project root using the structure above with that single term.
2. Notify the user: "Bootstrapped GLOSSARY.md with {term}. New domain terms will be appended here as they are resolved."
</glossary_format>