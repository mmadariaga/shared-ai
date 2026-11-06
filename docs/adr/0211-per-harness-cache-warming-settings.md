# ADR 0211: Per-harness cache warming settings

## Status

Accepted.

## Context

The Cache warming screen mixed Claude Code and opencode provider/model pairs, because pair discovery collected both harnesses into one set and deduplicated it before the screen saw it. The `warming` setting also held one global `{defaults, rules}` value, so one entry applied to both harnesses and the screen could not express a difference between them.

The effect was that a user could not tell which settings applied to each harness, and editing a value for one harness changed the other. The same provider and model can be used by both harnesses, so a single shared list could not represent a rule that should exist in only one of them.

## Decision

1. **The setting holds one block per harness, with the legacy global value as fallback.** `warming.claude` and `warming.opencode` each carry the existing `{defaults, rules}` shape. The top-level `defaults` and `rules` remain valid and apply to a harness that has no block of its own. Validation accepts both shapes, and it still rejects an unknown top-level key and a block with a key other than `defaults` or `rules`. A harness with neither a block nor a global value reads `off`.
2. **The resolver takes an explicit harness.** For a harness with a block, `warming[harness]` is resolved; otherwise the top-level value is. Within the chosen value the order is unchanged: exact model rule, model-family rule for `anthropic`, provider rule, role default, then `off`. The `warming` command requires `--harness claude|opencode`, and every caller passes it: `sai/policies/cache-warming.md`, `sai/commands/explore/steps/handoff-warming.md`, and the benchmark's warming override.
3. **Pair discovery is grouped per harness.** `guidedWarmingPairs` returns `{claude: {agent, subagent}, opencode: {agent, subagent}}` and deduplicates within each harness, so a provider/model pair used by both harnesses appears in both groups and neither harness loses provenance.
4. **The Cache warming screen asks for a harness first.** It presents the existing harness choice, lists only the chosen harness's role defaults and guided pairs, and saves only that harness's block. It rebuilds the whole `warming` value from what is stored, so the other harness's block and the legacy global keys stay in the file; the global keys are never deleted automatically. `Done` saves the harness and leaves the screen, `Back` saves it and returns to the harness choice, `Back` or `Esc` at the choice returns to the project behavior settings screen, and cancelling discards unsaved edits. A harness without a block is shown seeded from the global value, and its first edit writes that block from it.
5. **No automatic migration.** The change writes a harness block only when the user edits that harness; it never moves, rewrites, or deletes the legacy global keys, and a local override still replaces the whole `warming` value. A local value with per-harness blocks applies only to the harnesses it names, and an unnamed harness reads `off`; the documentation states this.

## Alternatives Considered

- **A display-only filter over a global setting** — rejected: the same provider/model could not differ between harnesses, which is the difference the change exists to express.
- **A per-entry `harness` tag on rules** — rejected: role defaults would need a second shape, and shared-versus-specific precedence would add cases to validation and resolution.

## Consequences

- A rule valid for both harnesses is duplicated once both blocks are edited.
- Legacy global keys stay in the file after both blocks exist and are ignored; the change never deletes user configuration.
- A local override still replaces the whole `warming` value, so an override that names one harness leaves the other reading `off`.
- The resolver now requires a harness argument, so a caller can no longer silently read the wrong block.
- The screen writes only `.sai/settings.jsonc`; local overrides stay hand-edited.
- Role names, timing validation, model-family matching, pair discovery, and the Experimental section of the project behavior settings screen are unchanged.

## Provenance

Change `harness-scoped-cache-warming-settings`, decision "Per-harness cache warming settings".
