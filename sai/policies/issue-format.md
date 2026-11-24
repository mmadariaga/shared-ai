# Backlog issue format

Use this provider-neutral reference when drafting a title and description for
`to-backlog`; `/sai-explore` reads the same format to recognize an issue and its
Maturity. A backlog item records the current agreement boundary, not a
transcript or permission to implement.

The same format is the **change document** of a crystallized change: the issue
extended with the block-only sections and a `## Change` metadata section, stored
as one file that `sai/tools/change-document.js` parses, validates, hashes, and
verifies (§ Change document). One format records the agreement, so publishing it
copies the document and re-importing it loses no field.

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
**Open questions**, and **Maturity**, in that order. Optional **Capabilities**,
**Terms**, **Edge cases**, **Implementation notes**,
**Out-of-scope implementation notes**, **Decisions**, **Alternatives considered**,
**Trade-offs accepted**, **Research leads**, and **Additional notes** appear between
Non-goals and Open questions, in that order; omit them when empty. The **Change** section, which is
required for a dispatchable change document and optional for an idea, comes last.
Problem and Goal take the place of the block's `Why` and `What`: a section that
already says the same thing is reused, never repeated under a second name.

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

### Capabilities — optional

List the agreed user-facing boundaries of the change as `capability: brief
description`, each a capability the change adds or alters. Bookkeeping artifacts
(`openspec/changes/{name}/**`, `openspec/specs/**`) are consequences of the
workflow, never capabilities. Omit when empty or unagreed; tentative capabilities
belong in Open questions.

### Terms — optional

List agreed terms as `term: definition`, fixed before the edge cases that use
them. Omit when empty or unagreed.

### Edge cases — optional

List agreed boundary or failure behaviors using `E#` identifiers. Omit when empty
or unagreed; tentative behaviors belong in Open questions. A reviewed and agreed
empty set permits `Edge cases agreed` without an empty Edge cases section.

### Implementation notes — optional

List agreed necessary implementation details using `I#` identifiers. Omit when
empty or unagreed; recommendations belong in Open questions. Include only details
needed for this work, not a copy of repository-wide conventions.

### Out-of-scope implementation notes — optional

In a slice set, list the agreed `I#` items that an earlier or a later slice owns,
with their identifiers and wording preserved, so a choice made here does not
block that slice. Each identifier appears in exactly one of this section and
Implementation notes of the same document, and every identifier of the set is in
Implementation notes of at least one document. The section is context: no
requirement or implementation obligation derives from it. Omit when empty.

### Decisions — optional

Record agreed choices and their rationale, including explicitly agreed deferrals.
Omit when empty or unagreed; tentative choices belong in Open questions. Verified
evidence alone does not establish agreement on an associated decision.

### Alternatives considered — optional

Record agreed rejected alternatives, each with the reason it was rejected.
Omit when empty or unagreed.

### Trade-offs accepted — optional

Record agreed trade-offs the change accepts, each with its cost. Omit when empty
or unagreed.

### Research leads — optional

List references and brief relevance notes as non-authoritative starting points
requiring investigation. They establish no requirement or verified fact by
themselves. Omit when empty.

### Additional notes — optional

Free Markdown with agreed, non-normative context that influences the work and fits
no other section, such as future behavior excluded from this change, follow-up
items, or a point the conversation left explicitly undecided (one `Undecided:`
sentence each, naming the `E#` or `I#` it affects). A non-goal is a binding
exclusion and belongs in Non-goals; only the detail of how the excluded behavior
should work later belongs here. Carry each fact once, in the section that owns it.
Omit when empty. Consumers read it as context: no requirement or scope derives
from it.

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

### Change — required to dispatch

The last section, present once the change is crystallized: the metadata of the
change as visible `Key: value` lines (a list marker before the key is accepted),
in any order. Metadata is visible text because a hidden marker never carries
agreed content and readers see the problem first. The identifier-counters comment
stays directly after Maturity, ahead of this section.

- `Change name:` — required; the kebab-case name of the change.
- `Depends on:` — optional; the immediate dependency change names, comma-separated,
  or `None`. A change never depends on itself and lists a dependency once.
- `Specs:` — optional; `none — <reason>` declares that the change has no
  spec-level behavior, with a reason after the dash.
- `Explore origin:` — optional; `<harness> <sessionID>[, <harness> <sessionID>…]`
  with harness `opencode` (`ses_…`) or `claude` (a session UUID); an entry without
  a harness inherits the previous entry's. Provenance only.
- `Backlog origin:` — optional; the canonical GitHub, GitLab, or Azure DevOps issue
  URL of the item the change came from. Provenance, not remote-mutation authority.

An unknown key, a repeated key, or a value of an invalid form makes the document
not dispatchable.

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

## Change document

The change document is this format stored as one file for one crystallized
change. Section headings and the keys of `## Change` are always English; the
language gate of the crystallization decides only the language of the content.

**File form.** The first line is `# <title>` with a non-empty title, the
description follows, and `## Change` comes last. One file holds one document: a
second `# ` heading, a missing first line, or an empty title fails verification.
A heading or a `---` line inside a fenced code block is content; a `---` outside
a fence is ordinary content and separates nothing, because it is a valid Markdown
horizontal rule. A slice set is several files, never several documents in one.

**Hash.** The sha256 over the whole file with line endings normalized to LF, so a
CRLF copy hashes like its LF text. The hash identifies the stored agreement: every
reader of an exported file verifies it before it reads the file.

**Dispatchable.** A document is dispatchable when `change-document.js check` names
no failed check and every line its lexical pre-filter flags carries a `context`
verdict. The checks are:

- the first line is `# <title>`, and there is no second document;
- every `##` heading is a known section, appears once, and follows the order of
  this format; an optional section that is present is not empty;
- Problem, Goal, Scope, and Non-goals are agreed (not `Not agreed yet.`), and
  Scope, Problem, and Goal are not empty;
- Open questions reads `None.` and Maturity reads `Ready to propose`;
- every item of Edge cases, Implementation notes, and Out-of-scope implementation
  notes carries its `E#` or `I#`, and an `I#` appears once per document;
- `## Change` is present, with a valid `Change name:` and only the known keys, each
  value in its form.

With Maturity at `Ready to propose`, an absent Edge cases or Implementation notes
section means the set was agreed empty. In a slice set each document also carries
at least one `I#` in Implementation notes, and `check-set` verifies the set: unique
change names, every out-of-scope `I#` in scope of one document, and dependencies
that exist and form no cycle. The validator checks completeness, never
contradictions inside the prose; the agreement and update boundary above handles
those.

**Hygiene.** A document never asks for planning artifacts, a mutating git command,
subagent dispatch, or direct edits of published specs as implementation work. The
tool flags candidate lines by pattern over the whole document, and each flagged
line takes one `context` or `violation` verdict under
`@sai/policies/block-hygiene-judgment.md`, with its four clauses unchanged. Verdicts
travel as a JSON array in a file beside the document, with each `line` counted in
the document file, because the hash covers the whole file and leaves no room for
an appended marker.

**Transport.** The document and its verdicts travel as files: no document content
passes through a shell command. `node <tool-path> check --document-file <path>
[--verdicts-file <path>] [--slice]` validates one document, `check-set` validates a
set (`--document-file` once per document), `hash` prints the hash, `verify-file
--document-file <path> --document-hash <sha256>` verifies an exported file and
changes nothing, and `compare --stored-file <path> --document-file <path>` reports
`metadata` when only the `Backlog origin:` or `Explore origin:` lines of
`## Change` changed and `content` otherwise. `change-document.js` is resolved per
`@sai/policies/tool-resolution.md`.

An example of a dispatchable document:

```markdown
# Show the greeting in a banner

## Problem
The greeting is easy to miss.

## Goal
Show the greeting in a banner.

## Scope
- The banner shows the greeting text.

## Non-goals
None.

## Edge cases
- E1: An empty greeting shows no banner.

## Implementation notes
- I1: The banner reuses the existing renderer.

## Open questions
None.

## Maturity
Ready to propose

## Change
- Change name: greeting-banner
- Depends on: None
```

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
