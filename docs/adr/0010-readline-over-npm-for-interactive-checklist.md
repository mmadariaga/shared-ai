# ADR 0010: Raw readline for interactive checklist instead of npm library

## Status

Accepted

## Context

The `bin/install.js` installer needs an interactive terminal checklist where users navigate with arrow keys and toggle selections with space. The standard approach in Node.js CLIs is to reach for `inquirer` or `prompts`.

However, the installer must run via `npx github:mmadariaga/shared-ai` without any prior `npm install`. `npx github:` fetches the repo tarball but does NOT run `npm install` — any external npm dependency silently fails to load at runtime.

## Decision

Use raw `readline` with `process.stdin.setRawMode(true)` and `readline.emitKeypressEvents`. Implement keypress parsing, cursor tracking, and terminal re-rendering manually (~60–80 lines). Guard against non-TTY contexts by checking `process.stdin.isTTY` before calling `setRawMode` — without this guard, `setRawMode` throws `TypeError: setRawMode is not a function`, an opaque error that hides the real cause.

## Alternatives Considered

- **`inquirer` v9+**: ESM-only, requires `npm install`, breaks `npx github:` zero-dep model. Rejected.
- **`prompts`**: same constraint — requires install before use. Rejected.
- **Numbered menu (1/2/both)**: avoids raw mode entirely but is worse UX and does not match the checklist + arrow-key navigation requirement in the spec. Rejected.

## Consequences

- The installer runs immediately via `npx github:mmadariaga/shared-ai` on any Node.js ≥ 18 machine with no registry access required.
- ~60–80 lines of manual TTY management instead of ~5 lines with a library. This code lives only in `bin/install.js` and does not affect any other part of the project.
- The TTY guard means the installer exits with a clear error message (`Error: interactive mode requires a TTY. Run directly in a terminal.`) when run in CI or piped contexts.
- Adding a non-interactive `--all`/`--yes` flag in the future would bypass `promptChecklist` entirely and is compatible with this design.
