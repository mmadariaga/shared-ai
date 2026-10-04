# Backlog issue format

Use this provider-neutral reference when drafting a title and description for
`to-backlog`. A backlog item records the current agreement boundary, not a
transcript or permission to implement.

## Agreement and update boundary

**Agreed** means explicitly accepted by the user in the conversation. Agent
recommendations, user silence, and draft existence are insufficient. Put
unconfirmed behaviors, constraints, and decisions in **Open questions**. All
behaviors, constraints, and decisions outside that section must be agreed;
**Research leads** is the explicitly non-authoritative exception.

For creation, apply the whole format. For update, apply the agreed refinement
to the current baseline and preserve unaffected description content verbatim.
Do not migrate or normalize historical issues. Apply these rules to the content
being changed, retaining existing section structure outside the edit boundary.
If that boundary is unclear, ask before changing it. Where a refinement
invalidates an earlier agreement, revisit affected content and lower Maturity
to the highest still-supported level; preserve unaffected content.

## Title

Write an imperative, outcome-focused title with no type prefix, for example
`Preserve backlog agreement boundaries`. Include only the captured outcome.

## Description order

The mandatory sections are **Problem**, **Goal**, **Scope**, **Non-goals**,
**Open questions**, and **Maturity**, in that order. Optional **Edge cases**,
**Implementation notes**, **Decisions**, and **Research leads** appear between
Non-goals and Open questions, in that order; omit them when empty.

Use `##` headings. This skeleton shows the mandatory sections for an incomplete
idea; replace its contents with agreed results where available:

```markdown
## Problem
Not agreed yet.

## Goal
Not agreed yet.

## Scope
Not agreed yet.

## Non-goals
Not agreed yet.

## Open questions
None.

## Maturity
Not agreed yet.

<!-- backlog-id-counters: E=0 I=0 Q=0 -->
```

### Problem — mandatory

State the agreed problem, who or what is affected, and why it matters. If the
problem is not agreed, use `Not agreed yet.`; place tentative interpretations
in Open questions instead of inventing missing information.

### Goal — mandatory

State the agreed outcome, distinct from a proposed solution. If the goal is not
agreed, use `Not agreed yet.` and place proposed outcomes in Open questions.

### Scope — mandatory

List agreed behaviors and constraints as verifiable statements: a later reader
must be able to determine whether each statement is satisfied. Use Scope rather
than a duplicate acceptance-criteria section. Include repository-wide conventions
only for a concrete exception or risk. If scope is not agreed, use
`Not agreed yet.` and move tentative scope to Open questions.

### Non-goals — mandatory

List agreed exclusions. An explicitly agreed empty set is `None.`. If exclusions
are not agreed, use `Not agreed yet.`; proposed exclusions belong in Open questions.

### Edge cases — optional

List agreed boundary or failure behaviors using `E#` identifiers. Omit when empty
or unagreed; tentative behaviors belong in Open questions. A reviewed and agreed
empty set permits `Edge cases agreed` without an empty Edge cases section.

### Implementation notes — optional

List agreed necessary implementation details using `I#` identifiers. Omit when
empty or unagreed; recommendations belong in Open questions. Include only details
needed for this work, not a copy of repository-wide conventions.

### Decisions — optional

Record agreed choices and their rationale, including explicitly agreed deferrals.
Omit when empty or unagreed; tentative choices belong in Open questions. Verified
evidence alone does not establish agreement on an associated decision.

### Research leads — optional

List references and brief relevance notes as non-authoritative starting points
requiring investigation. They establish no requirement or verified fact by
themselves. Omit when empty.

### Open questions — mandatory

Use `Q#` identifiers for unresolved questions and unconfirmed proposals. Phrase
proposals as choices requiring agreement, rather than requirements. Use `None.`
when empty. On resolution, move agreed content to the appropriate section with
a new identifier where applicable; retain the used Q counter.

### Maturity — mandatory

**Maturity** is the highest cumulative level of agreement supported by the
conversation, not implementation status. Use exactly one supported value:

- `Idea`: the problem and goal are agreed; scope is pending.
- `Scope agreed`: adds agreed scope and exclusions to the Idea criteria.
- `Edge cases agreed`: adds reviewed and agreed edge cases, including an agreed
  empty set, to the Scope agreed criteria.
- `Ready to propose`: adds reviewed and agreed necessary implementation details,
  including an agreed empty set, with no proposal-blocking questions, to the
  Edge cases agreed criteria.

Require all preceding levels. A deferred decision stops blocking only when its
deferral is explicitly agreed. Section presence does not establish maturity.
If even the Idea criteria are unsupported, use `Not agreed yet.`. Recompute after
refinement; an invalidated agreement can lower the level.

## Stable identifiers

Preserve existing E#, I#, and Q# identifiers during updates. Never renumber or
reuse removed identifiers; gaps are valid. Retain maximum-used identifiers in
the description as `<!-- backlog-id-counters: E=3 I=2 Q=5 -->` (values vary).
Before allocation, take each maximum from both existing identifiers and the
stored counter; allocate new identifiers above the corresponding maximum.
For a new item, start unused families at zero. For a baseline without counters,
initialize from its existing identifiers; do not invent unavailable history.
Counters never decrease after deletion or resolution. Update the comment when
allocating, and retain it as agreed metadata in the published description.
Show the comment literally in the complete publication-approval draft, using
a code block if necessary so Markdown rendering does not hide it.

## Final drafting checks

Drafting is complete only when every applicable section satisfies its local
rules, mandatory missing agreement is explicit, empty optional sections are
omitted, and unconfirmed proposals remain in Open questions. Verify section
order within the update boundary, verifiable Scope, non-authoritative Research
leads, preserved identifiers and maximum-used counters, and Maturity against
conversation evidence. On update, confirm unaffected content is unchanged.
Publish results rather than template instructions or placeholders; the explicit
`Not agreed yet.` and `None.` markers and identifier comment are result content.

Publication approval is a separate explicit step in `SKILL.md`; passing these
checks does not authorize publication or turn tentative content into agreement.
