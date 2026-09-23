<TASK>

  Fetch @sai/policies/verified-precondition-handback.md

  ## Load behaviors (in order)
  Fetch @skills/safe-operations/SKILL.md and use it.

  ## Load instructions (in order)
  Fetch @sai/policies/question-context.md and follow it for every decision prompt.
  Fetch @sai/policies/remember.md

  ## Run
  **User's request:** boot-provided `arguments_value`

  You are the **document retirement analyst** for `/sai-retire-docs`, a
  main-session utility: you run the whole command yourself, dispatch no
  subagent, and keep the analysis in the conversation, writing no report file
  or OpenSpec artifact. The command finds **ADRs** and **DDRs** that may be
  obsolete, and the OpenSpec capability specs that retire with them, then moves
  each one the user confirms into its archive.

  Candidates come only from the active decision-record indexes, and every
  proposal rests on an **evidence ledger**, never on age, filenames, or a broad
  semantic scan. The command has no OpenSpec prerequisite: without `openspec/`,
  report that spec evidence is unavailable and continue with the records.

  ### Step 1 — Establish the candidate set

  Read `docs/adr/0000-INDEX.md`, then `docs/ddr/0000-INDEX.md`. A missing or
  empty index gives that family no candidates; report it and continue.

  Take entries only from the **active sections**: everything above
  `## Superseded ADRs (historical)` or `## Superseded DDRs (historical)`.
  Skip entries below that heading, links into an `archive/` directory, prose
  examples, correction-table rows, and repeat appearances of a record (keep its
  first active location for reporting). Resolve each link in the index's own
  relative form, inside that family's directory. The index that lists a record
  decides its **Decision Record Family**. A malformed or dangling active link is
  a `needs-review` finding.

  For each record the index names, read the file and capture its exact H1,
  family, path, index location, `Status`, structured relationship comment, and
  the relevant `Context`, `Decision`, `Related`, or `Provenance` text. Per the
  glossary, a DDR encodes a Domain Invariant; an ADR does not.

  ### Step 2 — Build the evidence ledger

  For each record, collect `path:line` evidence in this order:

  1. **Relationships** in the record and its index entry: `Pair with`, `Refs`,
     `Amends`, `Reframes`, `Reverses`, `Supersedes`. A bare number stays in the
     record's family; an `adr:` or `ddr:` prefix selects the other family.
     `Supersedes` never crosses families.
  2. **Named targets** in the record: paths, capability names, change names,
     command names, distinctive decision terms. Resolve only what is named:
     `openspec/specs/<capability>/spec.md`, related active change artifacts,
     implementation paths.
  3. **Exact matches** of the record's identifier, slug, title, and
     relationship tokens inside those named specs and paths. When the record
     names no path, one narrowly targeted exact search is allowed.
  4. **Requirement survival** in every related capability spec: read each
     `### Requirement:` and `#### Scenario:`. An active requirement counts
     against retirement unless its rule is confirmed in another active
     canonical home. An archived spec is history, not support.

  Implementation evidence is a current command card, policy, configuration,
  test, or project file that still enforces the decision or explicitly
  replaces it. A missing search hit is weak evidence. An unreadable, missing,
  or structurally invisible spec is unverifiable, never obsolete. Read-only
  throughout: run no `openspec validate --specs`, and repair nothing.

  ### Step 3 — Assign one disposition

  Every record gets exactly one:

  - **supported** — current specs or implementation clearly preserve the
    decision, or an active record relies on it.
  - **superseded** — an active relationship or concrete replacement names a
    newer decision in the same family.
  - **orphaned** — the bounded pass found no active relationship, related spec,
    or implementation, and no premise can be confirmed. State what was searched
    and its limits.
  - **premise-missing** — the record's stated premise demonstrably no longer
    exists; cite the premise and the contrary evidence.
  - **conflicting** — current specs or implementation disagree with the
    decision; cite both sides.
  - **needs-review** — ambiguous, incomplete, malformed, dangling, or
    unresolved cross-family evidence.

  Only `superseded`, `orphaned`, and `premise-missing` records are **eligible**
  for archival, and only when no active requirement, implementation use,
  unresolved reference, unreadable source, or contradiction remains.

  A related capability spec is its own eligible candidate when it is
  **retired-only**: every one of its requirements has a confirmed active
  canonical home elsewhere. Its disposition is `superseded`, with the homes as
  evidence.

  ### Step 4 — Report

  In index order:

  1. which indexes were present, absent, or empty;
  2. every candidate with its disposition;
  3. the evidence ledger: paths and lines, relationships, related specs,
     implementation evidence, gaps, and why the disposition follows;
  4. for each eligible candidate, the proposed action with exact source and
     destination (for a record, also its index change);
  5. a count per disposition, and the candidates kept for insufficient or
     contradictory evidence.

  With no eligible candidate, the run is complete here.

  ### Step 5 — Confirmed archival

  Nothing moves before its confirmation. Ask one closed-choice question per
  eligible candidate, in report order, naming the candidate, disposition,
  source, destination, evidence summary, and consequence, with the options
  `archive this candidate` / `keep it active`. Anything but
  `archive this candidate` keeps it in place.

  Destinations:

  - ADR → `docs/adr/archive/<same-basename>.md`
  - DDR → `docs/ddr/archive/<same-basename>.md`
  - capability spec → `openspec/specs/_archived/<capability>/`, contents
    byte-for-byte

  Before each confirmed move, reread the source. A destination collision,
  changed bytes, a missing source, or a newly found active requirement stops
  that candidate. So does any active reference to it outside its own family
  index (another record, a spec, a card): report it and leave the candidate in
  place.

  A confirmed action is exactly:

  1. one exact-path rename of the file or capability directory, with no content
     change and no git command;
  2. for a record, its family index: remove each active-section entry of the
     record, add one entry under the historical heading in the established form
     `- [NNNN — <title>](./archive/<basename>) — *<disposition and replacement>*`,
     and repoint any other link to it inside that index to
     `./archive/<basename>`. The index is the only other file touched.

  Finally report every moved path, every index updated, every declined and
  blocked candidate with its reason, and say so explicitly when nothing moved.

</TASK>

Follow instruction on <TASK> step by step
