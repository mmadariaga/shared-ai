# Fast-Track Flag (`--fast-track`)

Canonical model for the `--fast-track` opt-in. This file is the single source
for parse ownership, banner ownership, and the state-channel name. Consuming
cards reference it; they SHALL NOT restate or redefine the model inline.

## Canonical model

1. **Owner** — the coordinator (or the main session on surfaces without a
   routed coordinator) owns BOTH the parse and the banner for every opt-in
   command except `sai-2-design` and `sai-backfill` (`sai-explore`,
   `sai-3-implement`, `sai-4-apply`, `sai-archive`, `sai-merge`). Workers never parse
   `--fast-track` for activation and never emit the activation banner, except
   where a documented exception below assigns phase-owned parse
   (`sai-2-design`, `sai-backfill`).
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

- `sai-2-design` parses `--fast-track` in its own worker card
  (phase-owned parse): the worker owns parse-plus-strip on every route,
  routed and supervised, and the coordinator never parses. On the routed
  route the worker returns a nonterminal notice carrying
  `> FAST-TRACK MODE ACTIVE` with dedup (`fast_track_banner_emitted`
  initialized and updated by the coordinator, carried in the worker
  reconstruction fields); the coordinator prints it. On the supervised
  route the worker parses and strips with no notice and Explore owns the
  chained-segment banner. The worker never prints the banner line directly.
- `sai-backfill` parses `--fast-track` and the diff-source tokens
  (`--staged | --unstaged | --diff <sha>`) in its own worker card
  (phase-owned parse, no banner).
- `/sai-review` strips an explicit `--fast-track` token as a pure
  behavioral no-op: it neither activates fast-track nor emits a banner.
- `/sai-build` strips an explicit `--fast-track` token as a build-local
  no-op: no build-local activation and no banner at strip time — the
  explicit token decides nothing. The supervisor always injects
  `fast_track_active=true` as invocation-scoped session state (never written
  to a file) for the chained implement segment and the chained apply segment
  and prints the single `> FAST-TRACK MODE ACTIVE` supervisor banner once at
  the first fast-track activation of the build (implement activation), never
  twice — zero times when neither segment activates. Builds with and without
  the explicit token behave identically; the chained segments' skipped shells
  print no second banner.
- `sai-explore`'s POC lane does NOT auto-approve or skip any of its three stops
  under `--fast-track`: the go/no-go at the close of stage 1, the `C1..Cn`
  candidate-list agreement, and the verdict menu. All three are always
  presented, and fast-track cannot alter the lane's pinned Direct Build
  `--no-specs` profile. The late explicit entry into the lane from stages 2
  through 4 is a user request, not a stop: fast-track neither triggers it nor
  suppresses it. Fast-track bypasses only the crystallization language
  gate and the overview-language ask, never the POC lane machinery.
