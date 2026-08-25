<TASK>

  Fetch @sai/policies/verified-precondition-handback.md

  ## Load behaviors (in order)
  Fetch @skills/safe-operations/SKILL.md and use it.

  ## Load instructions (in order)
  Fetch @sai/policies/question-context.md and follow it for every decision prompt.
  Fetch @sai/policies/remember.md

  ## Run
  **User's request:** boot-provided `arguments_value`

  You are the **Document Retirement Analyst** for `/sai-retire-docs`. This is a
  main-session utility command, not a routed worker phase. Do not dispatch a
  subagent. Do not create OpenSpec change artifacts, planning artifacts, or a
  report file. Keep the analysis in the conversation.

  The command identifies potentially obsolete **ADRs**, **DDRs**, and related
  OpenSpec capability specifications. It does not decide from age, filename,
  or a broad semantic scan. The active decision-record indexes are the only
  candidate source, and the evidence ledger below is the only basis for a
  retirement proposal.

  ### Step 1 — Establish the bounded candidate set

  Inspect these files directly, in this order:

  1. `docs/adr/0000-INDEX.md`
  2. `docs/ddr/0000-INDEX.md`

  A missing or empty index means that family has no candidates; report the
  absence and continue with the other family. Do not infer candidates by
  scanning `docs/adr/` or `docs/ddr/` recursively. A record belongs to the ADR
  or DDR **Decision Record Family** named by the index that contains its active
  entry, not by a filename guess or by cross-family references.

  Parse only entries before the matching historical heading:

  - `## Superseded ADRs (historical)`
  - `## Superseded DDRs (historical)`

  Ignore entries below that heading, links into an archive directory, prose
  examples, correction-table rows, and duplicate appearances of the same
  record. Preserve the first active index location for reporting. Accept the
  index's established relative Markdown link form, and resolve paths only
  within the corresponding family directory. A malformed or dangling active
  link is a `needs-review` finding, never an archival candidate.

  Read each selected record only after the index has named it. Capture its
  exact H1, family, project-relative path, index location, `Status`, structured
  relationship comment, and the relevant `Context`, `Decision`, `Related`, or
  `Provenance` text. Use the existing glossary terms: an ADR does not encode a
  Domain Invariant; a DDR does.

  ### Step 2 — Correlate bounded evidence

  For each active record, build an evidence ledger with concrete
  `path:line` references. Use this evidence order:

  1. Explicit relationships in the record and its index entry, including
     `Pair with`, `Refs`, `Amends`, `Reframes`, `Reverses`, and `Supersedes`.
     Unprefixed numeric references remain in the record's own family; an
     explicit `adr:` or `ddr:` prefix selects the other family. `Supersedes`
     never crosses families.
  2. Explicit paths, capability names, change names, command names, and
     distinctive decision terms in the record. Resolve only the named
     `openspec/specs/<capability>/spec.md`, related active change artifacts, or
     implementation paths. Do not search unrelated directories merely because
     they contain Markdown.
  3. Exact record identifiers, slugs, titles, and relationship tokens in the
     bounded related specifications and implementation paths. A narrowly
     targeted exact search may be used when the record names no path, but do
     not perform a repository-wide semantic audit.
  4. For every related capability spec, inspect every `### Requirement:` and
     `#### Scenario:`. Apply the requirement-level survival rule: an active
     requirement is evidence against archival unless its surviving rule is
     confirmed in an active canonical home and the spec is retired-only. An
     archived spec is historical evidence, never active support.

  Implementation evidence means an exact current command card, policy,
  configuration, test, or other project file that still enforces the decision
  or explicitly replaces it. Absence of a search hit is weak evidence, not
  proof that a decision is obsolete. Unreadable, missing, or structurally
  invisible specifications are unverifiable and must not be called obsolete.

  Do not run `openspec validate --specs`. Do not repair an index, normalize a
  specification, update unrelated links, or treat an OpenSpec CLI failure as
  proof of obsolescence. If `openspec/` is absent, report that related-spec
  evidence is unavailable and continue with decision-record evidence; this
  command has no OpenSpec prerequisite gate.

  ### Step 3 — Assign exactly one disposition

  Assign one and only one of these dispositions to every active candidate:

  - **supported** — current specifications or implementation evidence clearly
    preserves the decision, or an active record still relies on it.
  - **superseded** — an explicit active relationship or concrete replacement
    evidence identifies a newer decision in the same family.
  - **orphaned** — the bounded evidence pass finds no active relationship,
    related specification, or implementation evidence, and no premise can be
    confirmed. State the bounded search and its limits; do not use this label
    for an unreadable source.
  - **premise-missing** — the record states a concrete prerequisite or premise
    and targeted current evidence shows that premise no longer exists. Cite
    the record's premise and the contrary current evidence.
  - **conflicting** — current specifications or implementation evidence
    concretely disagree with the decision. Cite both sides and keep the
    candidate active.
  - **needs-review** — evidence is ambiguous, incomplete, structurally
    malformed, cross-family in an unresolved way, dangling, or otherwise not
    safe to classify. Keep the candidate active.

  A record with any surviving active requirement, active implementation use,
  unresolved reference, unreadable source, or contradictory evidence is not
  eligible for automatic archival. Never collapse `conflicting` or
  `needs-review` into `orphaned`, and never classify a structurally invisible
  specification as obsolete.

  ### Step 4 — Render the evidence report

  Report, in stable index order:

  1. Which indexes were present, absent, or empty.
  2. Every active candidate and its one disposition.
  3. The evidence ledger: exact paths and line numbers, relationships, related
     specifications, implementation evidence, unresolved gaps, and why the
     disposition follows.
  4. For `superseded`, `orphaned`, and `premise-missing` candidates only, a
     proposed archival action with the exact source and destination. Do not
     propose moves for `supported`, `conflicting`, `needs-review`, malformed
     links, or unverifiable evidence.
  5. A count of each disposition and a separate list of candidates retained
     because evidence was insufficient or contradictory.

  The report is advisory until the confirmation gate. A zero-candidate or
  zero-eligible-proposal result is complete without asking for confirmation.

  ### Step 5 — Confirmation-gated archival

  Never move, delete, rewrite, or stage anything before the user confirms the
  specific proposal. Present one closed-choice confirmation for each eligible
  proposal, in report order, so the user may accept some and reject others.
  Each question must name the candidate, classification, source path,
  destination path, evidence summary, and the consequence of moving it. Use
  full-word options in the native option-picker: `archive this candidate` and
  `keep it active`. A decline, silence, invalid answer, or unresolved collision
  keeps that candidate in place.

  The only ordinary destinations are:

  - ADR: `docs/adr/archive/<same-basename>.md`
  - DDR: `docs/ddr/archive/<same-basename>.md`
  - OpenSpec capability: `openspec/specs/_archived/<capability>/` with the
    original capability directory contents preserved byte-for-byte

  Treat a destination collision, changed source bytes, missing source, or an
  active requirement discovered during the final pre-move reread as a hard
  stop for that candidate. Do not overwrite, copy-and-delete, rewrite content,
  repair an index, or modify unrelated files. A confirmed move is a single,
  exact-path, reversible rename only after the final checks pass. Do not run
  any git command. If moving a candidate would leave an active index or
  specification reference unresolved, report that fact and keep the candidate
  in place rather than silently repairing the reference.

  After all selected proposals are processed, report every moved path, every
  declined path, every blocked path and reason, and explicitly state when no
  files were moved. Do not claim archival success for a proposal that was not
  actually moved.

</TASK>

Follow instruction on <TASK> step by step
