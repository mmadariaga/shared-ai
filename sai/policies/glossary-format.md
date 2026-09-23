<glossary_format>

<!-- Format validator: node sai/tools/lint.js glossary-format <file> -->
<!-- Adapted from https://github.com/mattpocock/skills/blob/main/skills/engineering/grill-with-docs/CONTEXT-FORMAT.md -->

# GLOSSARY.md Format

`GLOSSARY.md` is the project's single source of truth for domain language.
Every agent that reads, writes, or audits it follows this format.

## Location

The project root (`./GLOSSARY.md`) is the one canonical location. Every SAI
phase reads and writes the glossary there, never inside
`openspec/changes/{name}/` or any other directory.

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

- **Domain terms only.** A term earns an entry when it is specific to this
  project; general programming concepts stay out.
- **Be opinionated.** Pick one term and list every rejected alias in `*Avoid*`.
- **Tight definitions.** One sentence stating what the term IS, not what it
  does or how it is implemented.
- **Relationships** use bold term names plus cardinality: has many, belongs
  to, triggers.
- **Conflicts** go to `## Flagged ambiguities` with the chosen resolution.

## Adding a term

Write each domain term the moment it is resolved, one term per write:

1. When no `GLOSSARY.md` exists yet, create it at the project root with the
   structure above, holding that single term.
2. Insert the term alphabetically into `## Language` with its `*Avoid*`
   aliases.
3. When it relates to existing terms, add or update its `## Relationships`
   entry.
4. When it conflicts with an existing term or alias, add a
   `## Flagged ambiguities` entry with the resolution.

</glossary_format>
