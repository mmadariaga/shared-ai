# Accessibility Step — Resolve Runtime-Audit Gate

Active step: resolve-runtime-audit. The step is done when every applicable runtime check has run or is recorded as unavailable or pending, and `step-done` is reported for `resolve-runtime-audit`.

### Phase 9: Optional Runtime Audit (`--runtime` mode only)

Without `--runtime`, resolve the gate with no scanner. With it, `--runtime` is the whole authorization: ask no question, and never wait for an answer. Run each scanner against the dev server at `--url`:

- `npx @axe-core/cli {url} --exit` — automated rule scan
- `npx pa11y {url} --reporter cli` — alternative scanner for cross-checking
- `npx lhci autorun --only-categories=accessibility` — Lighthouse accessibility category

A scanner that is not installed or fails to start is not an obstacle: record it as unavailable in the report's `Runtime tools used` line with the reason, and go on. Without a `--url` value, or when the URL does not respond, no scanner can run: record the runtime part as unavailable with that reason, and go on with the static audit. Never retry a failed command.

Two checks only a person can run go into the report's `## Pending Manual Checks` section, never presented as verified:

- **Keyboard walk** — describe the keyboard path for each critical flow touched by the change.
- **Screen reader smoke test** — name the top 1–2 flows to test with NVDA, VoiceOver, or TalkBack.

Cross-reference automated findings with static phase results; runtime tools have known false positives — verify before flagging.
