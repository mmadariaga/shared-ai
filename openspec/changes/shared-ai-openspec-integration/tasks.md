## 1. Instructions Layer

- [ ] 1.1 Create `instructions/spec.propose.md` — stripped variant of spec.common.md for use inside ai-1-spec wrapper (remove output template sections that conflict with opsx:propose skill)
- [ ] 1.2 Verify spec.propose.md does not duplicate or contradict opsx:propose SKILL.md instructions

## 2. New and Renamed Commands (claude/commands/)

- [ ] 2.1 Create `claude/commands/ai-explore.md` — wrapper for openspec-explore skill, adds caveman.md, prerequisite check
- [ ] 2.2 Rewrite `claude/commands/ai-1-spec.md` — wrapper for openspec-propose skill with caveman, glossary-format, spec.propose, remember, prerequisite check; model: claude-opus-4-7
- [ ] 2.3 Rename and rewrite `claude/commands/ai-2-plan.md` → `ai-2-implement.md` — reads openspec artifacts, writes implementation.md to change dir; model: claude-sonnet-4-6
- [ ] 2.4 Rename and rewrite `claude/commands/ai-3-implement.md` → `ai-3-apply.md` — reads implementation.md, uses openspec CLI for context; model: claude-haiku-4-5
- [ ] 2.5 Create `claude/commands/ai-archive.md` — wrapper for openspec-archive skill, adds caveman.md, prerequisite check
- [ ] 2.6 Update `claude/commands/ai-4-review.md` — change argument-hint to `[change-name]`, update artifact paths to `openspec/changes/{name}/`
- [ ] 2.7 Update `claude/commands/ai-5-security.md` — same path update as ai-4-review
- [ ] 2.8 Update `claude/commands/ai-6-performance.md` — same path update
- [ ] 2.9 Update `claude/commands/ai-7-accessibility.md` — same path update
- [ ] 2.10 Update `claude/commands/ai-pr.md` — read from `openspec/changes/{name}/` instead of `plans/`
- [ ] 2.11 Delete `claude/commands/ai-2-plan.md` and `claude/commands/ai-3-implement.md` (replaced by renamed files)

## 3. Mirror to opencode/commands/

- [ ] 3.1 Create `opencode/commands/ai-explore.md` mirroring claude equivalent
- [ ] 3.2 Rewrite `opencode/commands/ai-1-spec.md` mirroring claude equivalent
- [ ] 3.3 Rename and rewrite `opencode/commands/ai-2-plan.md` → `ai-2-implement.md`
- [ ] 3.4 Rename and rewrite `opencode/commands/ai-3-implement.md` → `ai-3-apply.md`
- [ ] 3.5 Create `opencode/commands/ai-archive.md`
- [ ] 3.6 Update `opencode/commands/ai-4-review.md` through `ai-7-accessibility.md`
- [ ] 3.7 Update `opencode/commands/ai-pr.md`
- [ ] 3.8 Delete old renamed files in opencode/commands/

## 4. Documentation

- [ ] 4.1 Update `INSTALL.claude.md` — add Prerequisites section with openspec CLI install + `openspec init` instructions; remove any skill-copy steps
- [ ] 4.2 Update `INSTALL.copilot.md` if references plans/ or skill copying
- [ ] 4.3 Rewrite pipeline section in `AGENTS.md` — new command names, openspec/changes/{name}/ artifact paths, remove plans/ references, mark opsx commands as internal
- [ ] 4.4 Update `README.md` pipeline diagram and artifact table

## 5. Cleanup

- [ ] 5.1 Remove `github/prompts/ai-2-plan.prompt.md` and `ai-3-implement.prompt.md` (renamed)
- [ ] 5.2 Add `github/prompts/ai-2-implement.prompt.md` and `ai-3-apply.prompt.md`
- [ ] 5.3 Add `github/prompts/ai-explore.prompt.md` and `ai-archive.prompt.md`
- [ ] 5.4 Verify no remaining `plans/` references in any .md file
