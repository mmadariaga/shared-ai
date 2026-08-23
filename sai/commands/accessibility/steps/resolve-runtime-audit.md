# Accessibility Step — Resolve Runtime-Audit Gate

Active step: resolve-runtime-audit. Resolve the runtime request, server-confirmation, and per-command authorization gates per the worker contract; when they admit the mode, execute the runtime protocol below. Report the `resolve-runtime-audit` progress event per the worker contract — completed whether the applicable runtime checks run or are legitimately skipped.

### Phase 9: Optional Runtime Audit (`--runtime` mode only)

Only when `--runtime` flag is passed AND user has started the dev server AND user explicitly authorizes each command:

- `npx @axe-core/cli {url} --exit` — automated rule scan
- `npx pa11y {url} --reporter cli` — alternative scanner for cross-checking
- `npx lhci autorun --only-categories=accessibility` — Lighthouse accessibility category
- **Keyboard walk** — describe the keyboard path for each critical flow in the report; user verifies in browser
- **Screen reader smoke test** — direct user to test with NVDA/VoiceOver/TalkBack on top 1–2 flows

Cross-reference automated findings with static phase results; runtime tools have known false positives — verify before flagging.
