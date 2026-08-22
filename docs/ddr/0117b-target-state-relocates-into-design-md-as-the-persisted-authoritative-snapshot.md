# DDR 0117b: Target State relocates into design.md as the persisted authoritative snapshot

## Status

Accepted

## Context

The sai-2 design phase produces `interfaces.md` as the per-step contract of public signatures and exact test assertions, and the review snapshot lived inside it: `sai/instructions/design.md` mandated a leading `## Target State` section in `interfaces.md`, carrying `### Architecture Snapshot` and `### File Manifest`. That mixed implementation-facing step contracts with PR-review information in one artifact, and the pipeline had no single review projection — a reviewer assembled the picture from five artifacts (`proposal.md`, `specs/**`, `design.md`, `tasks.md`, `interfaces.md`).

This change adds `change-overview.md`, a derived review projection, and relocates the review snapshot: `## Target State` (with `### Architecture Snapshot` and `### File Manifest`) becomes a design-worker-authored, persisted first section of `design.md` — the authoritative source the overview generator projects at every regeneration.

## Decision

The `## Target State` review snapshot — with `### Architecture Snapshot` and `### File Manifest` — is authored and persisted by the design worker as the first section of `design.md`, and projected into `change-overview.md` at generation. `interfaces.md` contains no Target State and no snapshot/manifest subsection: every top-level section is a `## Step N` contract. Regeneration reads the snapshot from persisted sources and never synthesizes it.

## Alternatives Considered

- **Keep Target State inside interfaces.md** — rejected: it keeps the review snapshot mixed with execution contracts, and the generator would read the snapshot from an artifact whose primary purpose is step attribution.
- **Host Target State in design.md as the persisted authoritative source** — chosen: the snapshot's host is the design artifact that already carries the change's finished-shape narrative, and `change-overview.md` can project it at regeneration without synthesizing it anew.

## Consequences

The relocation is a coordinated surface change: the design instruction, the worker contract, the schema instruction blocks, both templates, and the generator projection all consume the host location; relocating back is comparable to moving a public API. The decision states a constraint the pipeline's domain imposes at all times — a derived review projection must be reproducible at regeneration time from persisted sources, never synthesized in transient worker context — which is why this record is a DDR.

## Provenance

User — the proposal mandates the relocation and the projection-from-persisted-sources rule. Recorded as Decision 1 in `design.md` with the `ddr` family marker.
