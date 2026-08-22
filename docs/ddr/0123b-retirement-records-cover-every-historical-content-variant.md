# DDR 0123b: Retirement records cover every distinct historical content variant, enumerated from git history at implementation time

## Status

Accepted

## Context

The `retire-orphan-inline-callers` change retires five inline phase-command bodies through the hash-gated `retirements[]` inventory in `sai/install-manifest.json`. A retirement record's `managedHashes` array is what lets install, doctor, and uninstall recognize an installed copy of a deleted body and remove it under the ownership safeguard: a copy whose bytes match no recorded digest is preserved rather than removed, and doctor reports it as an unexpected retired file. The enumeration method therefore decides whether an installed historical copy is recognized. The two precedent records (`retired-sai-2-design` with 23 digests, `retired-sai-3-implement` with 18) enumerated the canonical path only and reproduced exactly their plain-path counts — 23 of 23 and 18 of 18 — while `git log --follow` crosses renames and reaches 34 and 30 blobs respectively, so those records miss the predecessor-path content variants their `opencode/commands/` rename lineage contributed. A digest fixed at proposal time is also volatile: content can change between proposal and deletion, and a stale digest silently strands the installed copy.

## Decision

Each retirement record's `managedHashes` array SHALL contain the lowercase SHA-256 digest of every distinct content blob reachable via `git log --follow` over the file's history — one digest per historical variant, including predecessor-path blobs crossed by rename-following and the digest of the content at the moment of deletion. The deletion-time digest SHALL be computed from the file content at deletion during implementation, never fixed at proposal time. Over-collection is intentional and harmless: a digest no installed copy matches is inert, and a file that never varied historically contributes exactly one digest.

## Alternatives Considered

- **Enumerate only the canonical path** (`git log --format=%H -- <path>` without `--follow`) — rejected: it misses predecessor-path variants after renames, which the two precedent records demonstrate (23 of 34 and 18 of 30 reachable blobs); an installed copy whose bytes match a missed variant would be preserved rather than removed.
- **Fix digests at proposal time** — rejected: the content at proposal and the content at deletion can differ, so a stale digest silently strands the installed copy.

## Consequences

The retirement inventory recognizes any installed copy whose bytes match a historical managed variant, including copies predating the routed harnesses; unrecognized copies stay preserved with doctor identifying manual cleanup as remediation. Over-collection is inert. The cost is manual git archaeology per file with no tooling, so a missed variant remains possible — the safe direction (preserved rather than removed), accepted as the change's residual risk. This record is a DDR because recognizing every distinct historical managed variant is a constraint the pipeline's domain imposes on its manifest records at all times — stated as a property of the inventory, not of the enumeration mechanism that upholds it.

## Provenance

User — design.md D1 of `retire-orphan-inline-callers` (the change's spec states the requirement verbatim).
