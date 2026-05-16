## 1. Remove GitHub Copilot harness

- [x] 1.1 Delete `INSTALL.copilot.md` from repo root
- [x] 1.2 Delete entire `github/prompts/` directory (all `sai-*.prompt.md` files)
- [x] 1.3 Delete `instructions/spec.copilot.md`
- [x] 1.4 Remove Copilot section/references from `README.md`
- [x] 1.5 Remove Copilot mentions from `AGENTS.md` (including the `spec.common.md` legacy reference line that names Copilot)
- [x] 1.6 Remove Copilot mentions from `INSTALL.claude.md` if any cross-reference exists

## 2. Remove legacy spec instruction chain

- [x] 2.1 Delete `instructions/spec.claude.md`
- [x] 2.2 Delete `instructions/spec.opencode.md`
- [x] 2.3 Delete `instructions/spec.common.md`
- [x] 2.4 Update `AGENTS.md` to drop the legacy spec-chain row from the instructions table

## 3. Collapse opencode sai-1-spec variants

- [x] 3.1 Delete `opencode/commands/sai-1-spec-gemini.md`
- [x] 3.2 Delete `opencode/commands/sai-1-spec-gpt.md`
- [x] 3.3 Delete `opencode/commands/sai-1-spec-opus.md`
- [x] 3.4 Verify `opencode/commands/sai-1-spec.md` remains as canonical wrapper and fetches `spec.propose.md`

## 4. Remove remember.chinese

- [x] 4.1 Delete `instructions/remember.chinese.md`
- [x] 4.2 Grep for references to `remember.chinese`; remove any survivors

## 5. Documentation sync

- [x] 5.1 Update `README.md` to reflect supported harnesses (Claude Code + OpenCode only), remove Copilot install steps
- [x] 5.2 Update `AGENTS.md` to describe pipeline without Copilot and without spec.common chain
- [x] 5.3 Confirm `Intelligence vs Cost (May 2026).png` reference in `README.md` still resolves

## 6. Spec sync

- [x] 6.1 After implementation, archive will merge this change's `specs/command-wrappers/spec.md` deltas into `openspec/specs/command-wrappers/spec.md`
- [x] 6.2 Verify no orphan references to deleted files remain via `grep -r "spec\.claude\|spec\.copilot\|spec\.opencode\|spec\.common\|remember\.chinese\|INSTALL\.copilot\|github/prompts" .` (excluding `openspec/changes/archive/`)

## 7. Final verification

- [x] 7.1 Run `openspec validate simplify-codebase-cleanup --strict`
- [x] 7.2 Manual smoke: open `claude/commands/sai-1-spec.md` and `opencode/commands/sai-1-spec.md`, confirm fetches resolve
- [x] 7.3 Commit deletions and doc updates in logically grouped commits
