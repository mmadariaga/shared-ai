# DDR 0149: The Orchestration Core contracts live under `sai/orchestration/`

## Status

Accepted

Supersedes the placement rule of `docs/ddr/0128-neutral-root-protocols-and-command-cards.md`.

## Context

DDR 0128 placed the harness-neutral command protocol at `sai/command-runner.md` and the harness-neutral worker lifecycle protocol at `sai/worker-core.md`, calling them "root protocols". Since then `GLOSSARY.md` defined **Orchestration Core** as "the canonical `sai/orchestration/` contracts for coordinator mechanics and worker lifecycle behavior shared by routed planning phases" — naming a home the two files do not occupy.

The two records therefore disagree about where the same pair of contracts belongs. This is not undocumented drift that a move silently corrects: 0128 is an accepted decision, and relocating the files reverses its placement rule. The disagreement has to be settled by a record rather than by editing either text.

The rest of 0128 is unaffected. Its substantive decision — that the neutral protocols provide reusable mechanics and never branch on harness or phase names, with command cards selecting behavior through their card class and flags — remains in force and is not revisited here.

## Decision

Relocate both contracts to `sai/orchestration/command-runner.md` and `sai/orchestration/worker-core.md`, at source and at installed destination, so the layout under each harness config root mirrors the repository layout. The glossary definition is authoritative for the location; 0128's placement rule is superseded, and the term "root protocols" no longer describes these two files.

Each contract keeps its own dedicated per-file manifest projection with updated `source` and `destination.path`. The recursive `claude-orchestration` and `opencode-orchestration` projections are not widened to cover them: their `include` is the no-match sentinel `["__moved__.md"]`, and widening it would start installing the `worker-template.md` files under `sai/orchestration/workers/`, which this decision does not authorize.

The old installed destinations `sai/command-runner.md` and `sai/worker-core.md` gain retirement entries in the same manifest version as the projection change, per the hash-gated retirement mechanism of `docs/adr/0138-manifest-projections-and-hash-gated-retirement-records.md`, with `managedHashes` enumerated from git history per `docs/ddr/0123-retirement-records-cover-every-historical-content-variant.md`.

## Alternatives Considered

- **Rewrite the `GLOSSARY.md` definition to name the root instead** — rejected: the glossary describes the intended architecture, and two contracts loose at the root is the weaker layout of the two the records disagree about.
- **Move both files to a new `sai/shared/` directory** — rejected: `sai/orchestration/` is already the named canonical home, and a third location would force rewriting the glossary definition as well.
- **Amend 0128 in place with the new paths** — rejected: 0128's Decision text is the historical record of where the files were put and why, and remains accurate about the state it recorded. Superseding preserves it; amending would falsify it.
- **Widen the recursive orchestration projections instead of keeping dedicated ones** — rejected: the sentinel include means the contracts would ship uninstalled, breaking every `Fetch @sai/orchestration/...` directive at runtime.

## Consequences

The installed layout matches the documented definition of the Orchestration Core, and the `sai/` root no longer carries loose protocol contracts. Every card, adapter, and boot directive resolves `@sai/orchestration/command-runner.md` and `@sai/orchestration/worker-core.md`.

Existing installs lose their old root copies on the next install or doctor run, but only where the file still matches a published hash. An install whose root copy was user-modified keeps a stale, inert file at the old path: retirement preserves rather than deletes it, by design.

This is a durable property of the repository and installed layout rather than a one-off migration step, so it is recorded as a DDR.

## Provenance

Assistant — the conflict between `GLOSSARY.md`'s Orchestration Core definition and DDR 0128's placement rule was identified while implementing the relocation, after the change was initially framed as drift correction requiring no decision record.
