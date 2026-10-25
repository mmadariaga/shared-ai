# Fast-Track Flag (`--fast-track`)

Canonical model for the `--fast-track` opt-in. This file is the single source
for parse ownership, banner ownership, and the state-channel name. Consuming
cards reference it; they SHALL NOT restate or redefine the model inline.

## Scope

The model governs `/sai-archive` and `/sai-backfill`, the two commands where
the flag skips real questions and gates. No other command takes part in it:
the commands listed under the exceptions below accept the token and ignore it.

## Canonical model

1. **Owner** — the coordinator owns BOTH the parse and the banner for
   `sai-archive`. Workers never parse `--fast-track` for activation and never
   emit the activation banner; `sai-backfill` is the phase-owned exception
   below.
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
5. **Canonical parse order** — the fast-track presence-plus-strip parse runs
   FIRST, and every other validation runs afterwards on the cleaned
   remainder. The banner, when due, prints at its owning parse.

## Deliberate documented exceptions

These divergences are intentional and stay byte-stable; do not "unify" them:

- `sai-backfill` parses `--fast-track` and the diff-source tokens
  (`--staged | --unstaged | --diff <sha>`) in its own worker card
  (phase-owned parse, no banner). Standalone, it keeps its interview as user
  questions; the flag skips exactly the generated reconciliation questions,
  the spec-conflict decision, and the change-name confirmation.
- `/sai-1-spec`, `/sai-2-design`, `/sai-plan`, `/sai-deep-review`, `/sai-build`,
  `/sai-3-implement`, and `/sai-4-review` accept and ignore an explicit
  `--fast-track` token: they commit locally by
  invocation and ask for no approval, so the token activates nothing and
  prints no banner. Runs with and without the token behave identically.
- `/sai-explore` strips the token silently and treats the remainder as the
  request: no banner, no `fast_track_active` state, and no behavioral effect,
  so runs with and without the token behave identically.
