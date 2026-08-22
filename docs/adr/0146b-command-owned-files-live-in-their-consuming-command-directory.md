# ADR 0146b: Command-owned files live in their consuming command's directory

## Status

Accepted

Supersedes the root-exception rule of [ADR 0003](./0003-fetch-path-convention-commands-sai.md).

## Context

ADR 0003, as amended by `fold-sai-instructions-templates`, folded phase content into
the command directories it serves and then carved out three files that stayed at the
`sai/` root: `sai/change-overview.md`, `sai/adr-index.template.md`, and
`sai/ddr-index.template.md`. It called them "root exceptions" and justified the carve-out
by describing them as "shared rather than command-owned".

Each of the three is consumed by exactly one command. The overview-generation
instruction is executed only by the `/sai-2-design` worker. Both index templates are read
only by `sai/commands/implement/instructions.md`, in the Step 3 index-maintenance cold
build. The change-overview card's own `(shared contract)` header means shared across
harnesses and runs — the property every card in `sai/commands/` already has — not shared
across commands. The carve-out therefore rested on a misreading of that header rather
than on a layout property the three files actually have.

The cost of the carve-out is three dedicated per-file projections in
`sai/install-manifest.json` duplicating coverage the recursive `sai-commands` projection
(`sai/commands/**/*.md`) provides for free, plus a "root exception" vocabulary carried in
`AGENTS.md`, `README.md`, `INSTALL.claude.md`, and `INSTALL.opencode.md`.

## Decision

Each of the three files moves into the directory of the command that consumes it, at
source and at installed destination: `sai/commands/design/change-overview.md`,
`sai/commands/implement/adr-index.template.md`, and
`sai/commands/implement/ddr-index.template.md`. The two templates thereby join the
`<artifact>.template.md` convention already used by the six co-located templates, beside
`sai/commands/implement/implementation-plan.template.md`. All three keep their current
names; `change-overview.md` coexists with `instructions.md` in `sai/commands/design/`
without renaming, because its name is established project vocabulary.

The three dedicated projections are deleted rather than rewritten. Once the files live
under `sai/commands/`, the recursive `sai-commands` projection already covers them, and
a dedicated projection alongside it would target the same destination twice. The old
installed destinations `sai/change-overview.md`, `sai/adr-index.template.md`, and
`sai/ddr-index.template.md` gain retirement entries in the same manifest version as the
projection deletion, per the hash-gated retirement mechanism of
[ADR 0138](./0138-manifest-projections-and-hash-gated-retirement-records.md), with
`managedHashes` enumerated from git history per
[ddr:0123b](../ddr/0123b-retirement-records-cover-every-historical-content-variant.md).

The term "root exception" is retired: `sai/` root membership is no longer an exception
class, and the only files remaining at the `sai/` root are `install-manifest.json` and
`SAI_AGENTS.md`, neither of which is a fetched card. ADR 0003's Decision text is left
unedited — it is the accurate historical record of where the files were put and why.

## Alternatives Considered

- **Keep the three at the `sai/` root under a renamed grouping** — rejected: renaming the
  category does not change the fact that no member is shared across commands, so the
  grouping would still have no defining property.
- **Rewrite the three projections to the new paths instead of deleting them** — rejected:
  the recursive `sai-commands` projection already installs every `sai/commands/**/*.md`,
  so a dedicated projection would produce two projections for one destination.
- **Rename `change-overview.md` on arrival to fit the command-local `instructions.md`
  convention** — rejected: the name is established project vocabulary shared with the
  per-change artifact and the schema template, and renaming would widen the reference
  rewrite surface for no benefit.
- **Amend ADR 0003 in place with the new paths** — rejected: its Decision text records the
  state it decided and remains accurate about it. Superseding preserves that record;
  amending would falsify it.

## Consequences

The installed layout under each harness config root carries no loose command-owned files:
every fetched card, instruction, and template resolves under `sai/commands/{name}/`. The
manifest loses three projections and gains three retirements, so the projection set now
reflects one rule instead of one rule plus a carve-out.

Existing installs lose their old root copies on the next install or doctor run, but only
where the file still matches a published hash. An install whose root copy was
user-modified keeps a stale, inert file at the old path: retirement preserves rather than
deletes it, by design.

Three normative requirements still name the old paths —
`openspec/specs/wrapper-fetch-paths/spec.md`, `openspec/specs/instructions-fold/spec.md`,
and `openspec/specs/docs-sync/spec.md`. They are deliberately not rewritten by this
change and lag the layout until a later change updates them.

Separately, `wrapper-fetch-paths` and `instructions-fold` require a
`Fetch @sai/change-overview.md` directive that no live card emits. That gap predates this
decision and is independent of the move; this ADR neither closes it nor authorizes a card
to start emitting the directive.

## Provenance

User — the "shared rather than command-owned" premise was challenged directly, on the
observation that each of the three files has exactly one consuming command.
