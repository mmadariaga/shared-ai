# Merge step: renumbering plan

Fetch @sai/commands/merge/steps/common.md and read it once.

Goal: plan how the ADR and DDR records that the source branch introduced get unique identifiers on the final integrated tree, and every reference to a renamed record stays correct. The plan is read-only: the coordinator applies it. The brief names the provenance file, the `merge.js collision` receipt, and the verification outcome.

## Decide whether anything needs to change

Reconcile the source-introduced records with the final tree: drop a deleted record, and keep a record that conflict resolution renamed only when the same record survives at its resolved path. When no source-introduced record survives, or neither `docs/adr/` nor `docs/ddr/` exists, the applicability is `not-applicable`.

A collision is silent: distinct filenames merge cleanly. The collision key is `(family, numeric prefix)`, where family is `adr` or `ddr`: `adr:0010` and `ddr:0010` differ. Group the final-state records matching `NNNN-*.md` and `NNNN[a-z]+-*.md`, excluding the two index files, and consider only keys that a surviving source-introduced record holds. For each, collect the whole group, target-side records included. Groups outside that frontier stay untouched even when they already collide.

## Assign identifiers

1. Date each record from the captured refs, never from `HEAD` history: a source-introduced record from `source_sha`, a target-side record from `target_sha`. Resolve unmerged entries from `git ls-files --unmerged --stage -- docs/adr/ docs/ddr/` through the Sides mapping (stage 1 anchors to `merge_base`), including records that exist only in the index. Walk the path with `git log --follow --find-renames --name-status --format='%aI%x00%H' <anchor_sha> -- <path>` and take the earliest `A` event, following renames back. A record whose introduction cannot be established is an escalation.
2. Order each group oldest first by `(introduction_timestamp, introduction_commit, family, numeric prefix, final_path)`.
3. Within each family, every final record of the group keeps a unique identifier, existing suffixes included. When existing suffixes disagree with the date order, reassign the whole group as one plan so that no proposed name is occupied. Assign suffixes in order, oldest `a`, then `b`, `c`, skipping an occupied one: `0010-Name1.md` (older) becomes `0010a-Name1.md`, `0010-Name2.md` becomes `0010b-Name2.md`.

One identifier is used everywhere for a record: the filename prefix with the slug preserved, the H1 with the title preserved, the index label's text and link target, and every reference. Read each renamed record's exact current H1 and index label and derive the new values.

## References

Search the repository, including outside `docs/`, for the old identifiers of renamed records only:

- Markdown links, same-family `./NNNN-slug.md` and cross-family `../adr/…` or `../ddr/…`, keeping the relative path and slug; link text that is itself the old identifier (index labels, correction-table cells, `*Superseded by [NNNN]*`) changes, descriptive text does not.
- Relationship tokens: `— Supersedes`, `— Pair with`, `— Refs`, `— **Amends**`, `— **Reframes**`, `— **Reverses**`, with family prefixes in cross-family forms. Only the target changes.
- Structured metadata: `<!-- adr-index: ... -->`, `<!-- ddr-index: ... -->`, and correction-table source and target cells.
- OpenSpec mentions: canonical links, family-aware tokens, metadata, and exact old filenames or identifiers under `openspec/`. A bare four-digit number without ADR or DDR context is not a reference.
- An ambiguous reference (a bare number with no reliable family, or matching several records), an orphan reference (a canonical reference that matches no file after the renames), and a delete/modify conflict in a group are escalations: list them with their candidates, and change nothing for them.

## Report

Write the report as a YAML file:

```yaml
status: done | blocked
summary: string
changed_files: []
applicability: not-applicable | no-collision | repair-required | escalation-required
renames: {old_path: string, new_path: string, family: adr|ddr, identifier: string, introduction_anchor: source_sha|target_sha|merge_base, introduction_commit: string, introduction_timestamp: string, old_h1: string, new_h1: string, old_index_label: string, new_index_label: string}[]
reference_updates: {file: string, line: n, old: string, new: string}[]
escalations: {file: string, kind: ambiguous|orphan|delete-modify|undated, detail: string}[]
```

`no-collision` says no collision was detected and claims no repository-wide scan. You write nothing to the repository in this step.
