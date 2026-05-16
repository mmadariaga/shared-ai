## Why

The repo carries dead weight: GitHub Copilot harness assets nobody uses, legacy spec wrappers superseded by `spec.propose.md`, the Chinese variant of `remember.md`, and redundant opencode model variants. Removing them shrinks the surface area, removes confusion about which wrapper is active, and lowers maintenance cost.

## What Changes

- **BREAKING** Drop GitHub Copilot harness entirely: delete `INSTALL.copilot.md`, `github/prompts/` directory (11 wrapper files), `instructions/spec.copilot.md`, and remove all Copilot references from `README.md`, `AGENTS.md`, install docs.
- **BREAKING** Delete dead spec wrappers: `instructions/spec.claude.md`, `instructions/spec.opencode.md`, `instructions/spec.common.md` (legacy, replaced by `spec.propose.md`).
- **BREAKING** Delete redundant opencode model variants: `opencode/commands/sai-1-spec-gemini.md`, `sai-1-spec-gpt.md`, `sai-1-spec-opus.md` (keep canonical `sai-1-spec.md`).
- **BREAKING** Delete `instructions/remember.chinese.md`.
- Update `README.md` and `AGENTS.md` to reflect the slimmer asset list (no Copilot, no spec.common chain).
- Keep `Intelligence vs Cost (May 2026).png` — used by `README.md`.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `command-wrappers`: requirement changes — Copilot harness path removed from scope; `spec.propose.md` is the sole spec instruction file (legacy `spec.common.md` / `spec.claude.md` / `spec.opencode.md` chain deleted).

## Impact

- Files deleted: ~18 (Copilot wrappers, legacy spec instructions, remember.chinese, opencode model variants).
- Files modified: `README.md`, `AGENTS.md`, `INSTALL.claude.md` (if Copilot mentioned).
- No code or runtime dependency impact — repo is documentation/prompt assets only.
- Users on Copilot lose support.
