# ADR 0109: R change-type entry is a single move entry, never a delete-plus-add pair

## Status

Accepted

## Context

Within the `A`/`M`/`D`/`R` change-type vocabulary of `tasks.md` `**Files Affected**`
(ADR 0108), a move or rename could have been recorded either as a single
entry or as a `D` entry plus an `A` entry. Splitting loses the move
relationship between the two paths: no later reader of the plan could tell
that the deleted path and the created path are the same file relocating. The
token also had to decide how much content movement it encodes — nothing, a
pure flag, or a similarity index.

## Decision

A move or rename is recorded as a single `R` entry carrying both the source
and the destination path in the form `R <source path> -> <destination path>`.
It is never emitted as a `D` entry plus an `A` entry. The `R` token covers
both a pure relocation and a relocation that rewrites the file's content; the
extent of content change is carried by the step's `**What Will Be Done**`
prose, not by the token. Consumers read the two paths on either side of the
` -> ` separator; which path a consumer acts on is defined by that consumer's
own requirement (the routing derivation acts on the destination path only).

## Alternatives Considered

- `D` + `A` pair: explicit about deletion and creation but loses the move
  relationship between the two paths.
- Carry a similarity index on the `R` token (e.g. `R(85%)`): encodes
  content-change extent in the token, but the token is deliberately a pure
  declaration of what happens to the file in the commit.

## Consequences

The move link between source and destination is preserved in the plan, and
the token stays a pure "what happens to the file" declaration. Readers that
need a similarity index read git at apply time; the extent of content change
is described in the step prose.

## Provenance

User decision recorded in the `declare-file-change-type-in-tasks` design
(Decision 2). Refines the `R` token of the vocabulary established in ADR 0108.

<!-- adr-index: refs 0108 -->
