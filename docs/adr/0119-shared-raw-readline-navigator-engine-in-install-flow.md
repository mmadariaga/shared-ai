# ADR 0119: Shared raw-readline navigator engine in `bin/install-flow.js`

## Status

Accepted

## Context

The post-setup model customizer (`bin/agent-customization.js`) collects every choice through `promptChoice`, a numbered type-a-number prompt built on `readline.createInterface` — the exact interaction pattern ADR 0010 already rejected for the installer. A full run asks two prompts per agent (14 for the 7 Claude Code agents, 20 for the 10 opencode agents), all typed-number input.

The installer already ships the accepted pattern: `promptChecklist` (`bin/install-flow.js:452-509`) is a raw-readline navigable multi-select (arrow keys, space toggle, Enter confirm, `>` cursor, `[x] markers) using only Node built-in modules per ADR 0010. Its keypress engine is inline inside `promptChecklist` and unexported — it is the repository's only raw-mode keypress code. The configurator must move to navigable single-selects (main menu, harness picker, per-agent model/effort) plus a navigable agent-selection checklist; every navigable surface needs the same raw-mode keypress machinery.

## Decision

Factor the inline raw-mode keypress loop out of `promptChecklist` into ONE shared engine function inside `bin/install-flow.js`, parameterized by mode (`single` / `multi`), and back both `promptChecklist` and a new exported `promptSelect` on it. The engine accepts an injectable input source (defaulting to `process.stdin`) so navigation, confirmation, and cancellation are machine-testable without a TTY, and returns a discriminated outcome (`confirmed` with the selected items, `cancelled`, or `non-interactive`) without ever calling `process.exit`. The engine's multi-select render accepts an optional footer line drawn beneath the item list. Exit policy stays caller-owned: the installer's `main()` maps outcomes to the pinned exit codes (1 on non-TTY, 0 on q/Ctrl-C, 0 on deselect-all), and the configurator maps cancellation outcomes to a run-wide abort that resolves `runPostSetupMenu` without configuring any agent.

## Alternatives Considered

- **A separate shared module** (e.g. `bin/readline-nav.js`) hosting the engine: cleaner separation between installer and navigator, but splits the interactive machinery across files and loosens the single-file distribution shape the installer has used since ADR 0010; same-file factoring keeps the engine next to its original consumer and the file layout unchanged. Rejected.
- **Duplicating the engine into `bin/agent-customization.js`**: no cross-module coupling, but duplicates the repository's only raw-mode code and risks the two copies drifting apart. Rejected.
- **Keeping numbered prompts in the configurator**: avoids raw mode entirely but is worse UX and does not match the checklist + arrow-key navigation requirement — the same reasoning ADR 0010 used to reject numbered menus for the installer. Rejected.

## Consequences

- One keypress engine backs both sibling tools; every surface-level difference (exit policy, prompts, TTY contract) stays caller-owned at the wrapper sites (`main()` for the installer, `runPostSetupMenu` for the configurator).
- `promptChecklist` becomes an exported, outcome-returning API; its externally observable interaction (arrow/space/enter, `>` cursor, `[x] markers) is unchanged, and the installer's `main()` maps outcomes to the existing exit codes, preserving parity.
- The engine is machine-testable through the injected input seam, so navigation, confirmation, and cancellation scenarios run in `node --test` without a TTY.
- No new runtime dependency: the navigator remains built-in modules only per ADR 0010.

<!-- adr-index: refs 0010 -->
