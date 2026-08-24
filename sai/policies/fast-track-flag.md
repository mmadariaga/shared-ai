# Fast-Track Flag (`--fast-track`)

Canonical model for the `--fast-track` opt-in. This file is the single source
for parse ownership, banner ownership, and the state-channel name. Consuming
cards reference it; they SHALL NOT restate or redefine the model inline.

## Canonical model

1. **Owner** — the coordinator (or the main session on surfaces without a
   routed coordinator) owns BOTH the parse and the banner for every opt-in
   command (`sai-explore`, `sai-2-design`, `sai-4-apply`, `sai-archive`,
   `sai-backfill`, `sai-merge`). Workers never parse `--fast-track` for
   activation and never emit the activation banner.
2. **Parse** — inspect the opaque request string for the positional token
   `--fast-track`. On presence: activate fast-track, remove the token, trim
   surrounding whitespace, and use the cleaned remainder downstream.
   Presence-plus-strip only: while parsing fast-track the owner inspects no
   other token's semantics and never interprets another flag's value.
3. **Banner** — when the token was present, print the exact line
   `> FAST-TRACK MODE ACTIVE` exactly once per invocation as ordinary
   conversation text (never written to any file). Every fast-track invocation
   produces exactly one visible activation confirmation; no composition emits
   the banner twice.
4. **State channel** — the activation signal travels everywhere as
   invocation-scoped session state named exactly `fast_track_active`
   (boolean). It is never written to `.openspec.yaml`, configuration, or any
   file.
5. **Canonical parse order** — on every surface that also parses other
   options, the fast-track presence-plus-strip parse runs FIRST, and every
   other flag validation (for example `--overview-lang`) runs afterwards on
   the cleaned remainder. The banner, when due, prints at its owning parse.
   This order keeps banner timing identical across surfaces that share the
   same halt literals.

## Deliberate documented exceptions

These divergences are intentional and stay byte-stable; do not "unify" them:

- `sai-backfill` parses `--fast-track` and the diff-source tokens
  (`--staged | --unstaged | --diff <sha>`) in its own worker card
  (phase-owned parse, no banner).
- `/sai-build` and `/sai-review` strip an explicit `--fast-track` token as a
  behavioral no-op: they neither activate fast-track nor emit a banner.
