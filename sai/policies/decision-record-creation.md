# Decision Record Creation

Single source for creating the ADR and DDR records that design classified. The design step resolves each qualifying decision's family and writes no record. The outermost implementing command creates the records when its run completes, so each record describes the code that was built. The criteria and the family test live in `@sai/policies/adr-ddr-criteria.md`.

## Who creates the records

The outermost command is the one the user invoked directly. A segment that another command runs creates none.

- **`/sai-3-implement` invoked directly.** At its completed Close, in its own local commit.
- **`/sai-build`.** Its implement segments create none. `/sai-build` creates them at its own Close, only when every segment it ran completed, from the final code and the deviations both segments reported.
- **`/sai-deep-review`.** The completed Close of its fix segment creates them. A run whose fix segment did not run creates none.
- **Direct Build - Unattended.** Its ADR/DDR pass creates them, inside the route's single pre-authorized local commit.

A stopped, blocked, or unanswered run creates none. Invoking the command authorizes this one local commit; nothing is pushed.

## What qualifies

The decision source is `design.md`'s `## Decisions` (Direct Build: the block's Decisions & Rationale, resolved by its ADR/DDR pass). A decision qualifies when it carries `**Record family**: adr|ddr`. A design with no such decision creates no record and leaves the indexes untouched.

A change receives its records once. Skip a decision when a record of its family, in `docs/<family>/` or its `archive/` folder, already cites it: that record's `## Provenance` names the change in backticks and the decision's title. A later run on the same change, such as another `/sai-3-implement` or a `/sai-deep-review` after a `/sai-build`, creates nothing for a decision already cited, even when that run has deviations of its own.

## Creating a family's records

For each family with at least one decision to record:

1. **Inventory.** Resolve `decision-records.js` per `@sai/policies/tool-resolution.md` and run `inventory --family <adr|ddr> --json --cwd <project-root>`. The first new record takes `next_number`; each further record of the run takes the next number. Existing records are historical and never edited: a decision that changes an earlier record is a new record carrying the relationship (`supersedes`, `amends`, `reverses`, or `reframes`) in the family's header comment, as the existing records do.
2. **Folder and index.** When `docs/<family>/` or its `0000-INDEX.md` is missing, create what is missing: the folder, and the index from `@sai/commands/implement/adr-index.template.md` or `ddr-index.template.md`, with the skeleton note and the cold-build comments removed and each `<domain unit>` placeholder named after the unit the new record concerns.
3. **Record.** Write `docs/<family>/NNNN-<kebab-title>.md`. Follow the layout of the newest record in the folder; with none, use `# ADR NNNN: <title>` (`# DDR` for the domain family) and the sections `## Status` (`Accepted`), `## Context`, `## Decision`, `## Alternatives Considered`, `## Consequences`, and `## Provenance`. Context, alternatives, and rationale come from the decision source. The Decision states what the code does at the end of the run. When the run departed from the planned decision, the record describes what was implemented and cites the deviation with its reason. The Provenance section reads ``Change `<name>`, decision "<title>".``
4. **Index entry.** Add one entry line per new record to the family's `0000-INDEX.md`, in the form its existing entries use: `- [NNNN — <title>](./NNNN-<slug>.md)` plus any relationship note, under the subsection that fits. The index keeps its existing structure; nothing is recomputed.

Check every record path and the index path with `git check-ignore -q <path>`. An ignored path stays on disk, uncommitted, and the closing report says so; it is never force-added.

## Writer, commit, and report

The command's own session writes the files, as it writes `SAI_LEARNINGS.md`. Direct Build gives its coordinator no write tool, so there the coordinator prepares the order (families, numbers, titles, the ignore check) and the same implementer writes the files; their paths join the implementer's reported paths, minus the ignored ones, and enter the route's single commit.

A command that commits stages exactly the record and index paths that are not ignored, in one local Conventional Commits commit of at most 50 characters (for example `docs(adr): record <name> decisions`, `docs(ddr)` for the domain family, `docs` when both). Authorship credits follow the command's own commit rule. When every path is ignored, it commits nothing.

The closing report lists the records created with their paths, the paths left uncommitted because the project ignores them, and the decisions skipped because a record already cites them. It says nothing when the design has no decision carrying `**Record family**`.
