## Why

During `/sai-4-apply`, a multi-step implementation fires the per-commit authorization gate on every Step, forcing the user to click `yes` repeatedly for a stream of local, reversible commits. A session-scoped opt-in lets the user authorize `git add` + `git commit` once for the rest of the in-conversation session, removing the repeated clicking without weakening the default per-commit gate for users who do not opt in.

## What Changes

- Append a third option, `Allow on this session`, to the commit authorization gate, after the existing `yes` (Recommended) / `no` options.
- Selecting `Allow on this session` authorizes and performs the current commit (`git add` + `git commit`) AND sets a session-scoped in-memory authorization flag.
- While the flag is active, every subsequent commit-authorization gate in the same in-conversation session is skipped — the agent runs `git add` + `git commit` without asking. The pre-commit file visibility report and commit-message proposal still print unconditionally; only the yes/no wait is removed.
- The flag lives in the agent's working memory, in-conversation only — it is NEVER written to `.openspec.yaml` or any file, and it resets on a new chat / new `/sai-*` invocation.
- Scope is limited to `git add` + `git commit` (local, reversible). The grant does NOT cover `push`, `--force`, branch create/switch, rebase, merge, tag, or `gh pr` — those stay per-operation.
- The grant does NOT bypass the GREEN-conflict STOP or the apply Human Verification gate — those still halt regardless of the flag.
- **Amend** `apply.md`'s CRITICAL "ask every time / No implicit authorization" block (lines ~214–222) with an explicit opt-in carve-out. The session grant is in-session implicit authorization, which contradicts that block as written; the change reconciles them by scoping the carve-out to `git add` + `git commit` and requiring the user's explicit `Allow on this session` selection — it does not otherwise relax "ask every time" for any other operation.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `commit-auth-gate`: the gate shifts from strictly per-invocation authorization to "per-invocation OR session-scoped by explicit opt-in"; adds the `Allow on this session` option and the session-scoped authorization state.

## Impact

- **Spec**: `openspec/specs/commit-auth-gate/spec.md` — one modified requirement plus one added requirement.
- **Instructions (downstream, not this phase)**: `sai/instructions/apply.md` commit-gate checklist (the `Ask explicitly` step at line ~203 and its yes/no branches) and the `sai-commit` gate present this gate and will gain the third option and the session-flag check. `apply.md:203` already carries the `yes (Recommended)` / `no` ordering from change A, so this change only appends `Allow on this session` after `no` — it does not need to re-establish the ordering. Separately, the downstream edit MUST reconcile the CRITICAL "ask every time / No implicit authorization" block (`apply.md` lines ~214–222) with the session opt-in carve-out named in What Changes.
- **Dependency**: builds on `gate-recommended-default-ordering`, which reorders this gate's options to `yes` (Recommended) first, then `no`. That ordering must land first; this change appends the third option after `no`.
- No production runtime code, config, or data is affected — this is an agent-instruction capability. The session flag is agent working memory only and never touches disk.

## Proposal Research Documentation

**Local files**:
- `openspec/specs/commit-auth-gate/spec.md` — current per-invocation authorization requirement (options `yes` / `no`).
- `openspec/changes/gate-recommended-default-ordering/specs/commit-auth-gate/spec.md` — the `[yes (Recommended), no]` ordering this change appends to.
- `sai/instructions/apply.md` — commit-gate checklist (lines ~201–235), GREEN-conflict STOP, Human Verification gate, and "ask every time / no implicit authorization" rules (lines ~214–222); the "regardless" rule for branch operations (lines ~216–217).
- `sai/instructions/remember.md` — Closed-choice prompts rule (option-picker mapping) and the feedback-gate iteration-counter precedent for in-memory-only state.

**External URLs**: <!-- none -->

## Additional Notes

- **In-memory-only precedent**: the session flag follows the same "working memory, never persisted" model as the feedback-gate iteration counter — no disk writes, resets per invocation.
- **Alternatives rejected**: persisting the grant to `.openspec.yaml`/config (breaks the per-invocation model and makes expiry murky); covering all of `git *` (would swallow push/--force/branch-switch, which are shared/irreversible and collide with the "regardless" rule in `apply.md` and with safe-operations).
- **Trade-off accepted**: the session opt-in weakens the per-commit gate for that session; acceptable because it is an explicit, informed user choice limited to local, reversible operations.
- **Transparency boundary**: skipping the gate removes only the authorization ask, not the mandatory pre-commit file visibility report or the commit-message proposal — the user still sees what is about to be committed on every Step.
