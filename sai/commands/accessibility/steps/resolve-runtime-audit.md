# Accessibility Step — Resolve Runtime-Audit Gate

Active step: resolve-runtime-audit. The step is done when the runtime gate is resolved — the applicable runtime checks run or are legitimately skipped — and the `resolve-runtime-audit` progress event is reported per the worker contract.

### Phase 9: Optional Runtime Audit (`--runtime` mode only)

Without `--runtime`, resolve the gate as legitimately skipped without asking. With it, follow the worker contract's Runtime Authorization: the server-confirmation question (which also collects the dev-server `{url}`), then one authorize-or-skip question per command:

- `npx @axe-core/cli {url} --exit` — automated rule scan
- `npx pa11y {url} --reporter cli` — alternative scanner for cross-checking
- `npx lhci autorun --only-categories=accessibility` — Lighthouse accessibility category
- **Keyboard walk** — describe the keyboard path for each critical flow in the report; user verifies in browser
- **Screen reader smoke test** — direct user to test with NVDA/VoiceOver/TalkBack on top 1–2 flows

Cross-reference automated findings with static phase results; runtime tools have known false positives — verify before flagging.
