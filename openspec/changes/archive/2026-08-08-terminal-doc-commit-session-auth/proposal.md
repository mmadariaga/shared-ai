**Complexity**: medium (4 affected paths, 3 modified capabilities, no breaking change)

## Why

The session-scoped commit-authorization flag `session_commit_authorized` is defined inside `## STOP & COMMIT Checklist` (`sai/instructions/apply.md:421-429`) and read only at that checklist's step 3, while the sibling `## Terminal Documentation Commit` defines an unconditional yes/no authorization ask (`sai/instructions/apply.md:364`). This contradicts `openspec/specs/commit-auth-gate/spec.md:24` ("every subsequent commit-authorization gate in the same in-conversation session SHALL be skipped") and under-delivers on the sai-4-apply fast-track opt-out set named in `openspec/specs/sai-fast-track-flag/spec.md:142` ("commit authorization"). The defect fires on both activation paths: `--fast-track` pre-activation and an explicit `Allow on this session` selection at an earlier Step.

## What Changes

- The terminal documentation commit gate in `sai/instructions/apply.md:364` becomes flag-aware: when `session_commit_authorized` is active for the current in-conversation session, the coordinator skips the ask and proceeds directly to staging and committing the terminal set — exactly as every per-Step commit already does. When the flag is inactive, the gate keeps its unchanged yes/no yes-only picker.
- The flag's read rule (`apply.md:426`), Scope boundary paragraph (`apply.md:429`), and Git Operations Session opt-in carve-out bullet (`apply.md:456`) are amended to state explicitly that the grant covers both commit-authorization gates of an apply run — the per-Step STOP & COMMIT gate and the terminal documentation commit gate — and still covers nothing else, so `apply.md` holds no narrower statement of the same rule.
- The `sai-fast-track-flag` opt-out entry for `sai-4-apply` is clarified to name both commit gates, so the canonical opt-out list matches the implemented behavior.
- The terminal gate does **not** gain an `Allow on this session` option: it is the last commit of the run, so there is nothing further to grant.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities
- `sai-learnings-promotion`: the terminal documentation commit's authorization gate becomes flag-aware — skipped when `session_commit_authorized` is active, unchanged yes/no yes-only picker when inactive; the gate still offers no `Allow on this session` option.
- `commit-auth-gate`: the session grant's scope boundary states explicitly that it covers both commit-authorization gates in an apply run (per-Step and terminal), and still covers nothing else.
- `sai-fast-track-flag`: the `sai-4-apply` fast-track opt-out entry is clarified to name both commit gates, so the canonical opt-out list matches the implemented behavior.

## Impact

- `sai/instructions/apply.md` — terminal documentation commit ask (line 364) made flag-aware; flag read rule (line 426), Scope boundary paragraph (line 429), and Git Operations Session opt-in carve-out bullet (line 456) amended to name both commit gates with the same wording, so no narrower statement of the grant remains in the file. The promotion disclosure, the terminal file visibility listing, and the proposed commit message stay unconditional; only the ask and wait are removed under an active flag.
- `openspec/specs/sai-learnings-promotion/spec.md` — MODIFIED requirement "Promotion is committed separately behind its own authorization gate".
- `openspec/specs/commit-auth-gate/spec.md` — MODIFIED requirement "Session-scoped commit authorization via Allow on this session".
- `openspec/specs/sai-fast-track-flag/spec.md` — MODIFIED requirement "The fast-track flag opts out only of the gates named per command, never others".
- Not touched: the per-Step commit gate, the pre-commit file visibility report, the terminal set derivation (changed `docs/**` plus promotion-written `SAI_LEARNINGS.md`; never `git add -A`, never `openspec/changes/{change-name}/`), the promotion pass's classification and supersede rules, the empty-terminal-set rule (no message, no ask), wrappers, the install manifest, and `GLOSSARY.md` (no new domain term; `session_commit_authorized` is an in-conversation identifier, not glossary language).

## Proposal Research Documentation

**Local files**: sai/instructions/apply.md (lines 330-471); sai/commands/sai-4-apply.md; openspec/specs/sai-learnings-promotion/spec.md; openspec/specs/commit-auth-gate/spec.md; openspec/specs/sai-fast-track-flag/spec.md; test/apply-coordinator-verification.test.js; GLOSSARY.md; sai/policies/glossary-format.md; sai/instructions/spec.propose.md; sai/policies/remember.md

**External URLs**: - None

## Additional Notes

- Reframing: this is not "fast-track forgot a gate" but "the session-authorization flag has a narrower read scope than its own spec claims" — the fast-track symptom and the `Allow on this session` symptom are one defect with one fix: widen the flag's read scope to the terminal gate.
- Reuse `session_commit_authorized` rather than a `--fast-track`-only branch at the terminal gate: one mechanism instead of two parallel paths, and it repairs the `Allow on this session` case in interactive runs too, which a fast-track-only branch would leave broken.
- Under `--fast-track`, the run's last remaining interactive pause disappears; the terminal listing plus proposed message remain the sole pre-commit visibility, which is the same guarantee already accepted for every per-Step commit.
- The grant is not widened: `push`, `--force`, branch create/switch, rebase, merge, tag, and `gh pr` still require per-operation approval; the GREEN-conflict STOP and the Human Verification gate still halt regardless of the flag. Safe-operations confirmations remain in force under `--fast-track`.
- The flag stays in in-conversation memory only — never written to `.openspec.yaml`, config, or any file.
- Behavior stays identical across Claude Code, opencode, and Copilot (Mirror discipline); the change touches only the shared `apply.md` body, so all harnesses inherit it unchanged.
