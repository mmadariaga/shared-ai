**Complexity**: high (5 capabilities, 13 requirements, 6 affected paths, no breaking change)

## Why

`sai/policies/prereqs.md` conflates two responsibilities at the exact site where delegation must attach: an executable shell gate (the three OpenSpec checks) and a declarative path table. Half a file cannot be delegated to a subagent, so no consumer can send the check downward while retaining the paths locally without this seam. Splitting the file into independently fetchable halves — behind a composing entry point that keeps every existing fetcher byte-equivalent — opens that seam as a pure enabling refactor.

## What Changes

- Decompose `sai/policies/prereqs.md` into `sai/policies/prereqs-check.md` (the executable gate: three checks + halt messages, current lines 1-9) and `sai/policies/prereqs-paths.md` (the declarative OpenSpec path table + no-write-on-failure rule, current lines 11-29).
- Rewrite `sai/policies/prereqs.md` as a composing entry point — a content-free router of fetch directives for the two halves — so all existing fetch sites (14 at the time of writing: 11 `sai/commands/*.md` bodies and the `sai-2-design`/`sai-5-review`/`sai-6-security` worker contracts) keep receiving both halves with unchanged effective content.
- Add an install-manifest retirement record for `sai/instructions/prereqs.md` (both harnesses) so the stale installed orphans — byte-identical leftovers of the pre-`894122b` layout — are recognized and removed by install/doctor. **Scope decision, surfaced for the approval gate:** the request's `prereqs-deduplication` capability was disconfirmed at repo level — the rename to `sai/policies/prereqs.md` already removed the repo duplicate — so the capability is renamed to `installed-prereqs-copy-retirement` and refilled with the only remaining redundant-copy removal: retiring the stale installed projections. This is the slice's single installed-world exception to behavior-preservation; it deletes only copies whose content matches the managed hash, and never user-modified copies, which are left in place and reported.
- Update the `prereq-verification` capability spec's pinned path from the already-nonexistent `sai/instructions/prereqs.md` to the new `sai/policies/prereqs-check.md`, since this change moves the exact check content that capability pins.
- Update the `doctor-project-health` capability spec's pinned path from the already-nonexistent `sai/instructions/prereqs.md` to the new `sai/policies/prereqs-check.md`, since this change moves the exact check content that capability pins (added via design amendment, approved in place).
- No fetcher's effective content changes; no consumer changes its delegation behavior; no **BREAKING** change.

## Capabilities

### New Capabilities

- `prereqs-file-decomposition`: the single prerequisite file is split into an executable-check artifact and a declarative path-reference artifact, each standalone and independently fetchable.
- `prereqs-composition-compatibility`: a composing entry point at the original fetch path delivers both halves to every existing fetcher with unchanged effective content and no content duplication.
- `installed-prereqs-copy-retirement`: the stale installed `sai/instructions/prereqs.md` copies in both harness projections are retired via the install manifest — a managed-hash-guarded deletion (matching copies removed, drifted copies preserved and reported) — leaving one canonical home for prerequisite content.

### Modified Capabilities

- `prereq-verification`: the requirement's pinned location for the check content changes from the nonexistent `sai/instructions/prereqs.md` to `sai/policies/prereqs-check.md`; the verification command (`openspec --version`) and platform-agnostic requirement are unchanged.
- `doctor-project-health`: the requirement's pinned location for the check content changes from the nonexistent `sai/instructions/prereqs.md` to `sai/policies/prereqs-check.md`; the requirement's wording, its four scenarios, and the aggregate-exit-code requirement are otherwise unchanged.

## Impact

- `sai/policies/prereqs.md` — rewritten as the composing entry point (same path, same fetch target).
- `sai/policies/prereqs-check.md` — new file (executable gate half).
- `sai/policies/prereqs-paths.md` — new file (path table half).
- `sai/install-manifest.json` — one new retirement record; new files install via the existing `sai-policies` glob, so no projection rule changes.
- `openspec/specs/prereq-verification/spec.md` — pinned path literal updated.
- `openspec/specs/doctor-project-health/spec.md` — pinned path literal updated (design amendment, approved in place).
- No dependency or API changes, and no user-facing behavior change to fetcher content or repo sources — with one named exception: the managed-hash-guarded removal of the stale installed `sai/instructions/prereqs.md` copy from both harness projections (matching copies removed; drifted copies preserved and reported). Installed projections receive the two new halves automatically via the existing `sai-policies` glob; the retired path stops resolving for any external consumer that still fetched it (none in-repo; zero live fetchers use it).

## Proposal Research Documentation

**Local files**:
- `sai/policies/prereqs.md` — the file being split; seam at lines 1-9 (checks) / 11-29 (paths)
- `sai/install-manifest.json` — `sai-policies` projection glob (`**/*.md`) that auto-installs new halves; `retirements` record shape (`class`, `path`, `harnesses`, `managedHashes`)
- `openspec/config.yaml` — schema declaration consumed by check 3
- `openspec/specs/prereq-verification/spec.md` — live capability pinning the check content's location to the stale `sai/instructions/prereqs.md`
- `openspec/specs/fetch-existence-check-before-read/spec.md`, `openspec/specs/claude-fetch-resolution/spec.md`, `openspec/specs/extract-bodies/spec.md` — use the retired path only as fetch-mechanics example literals
- `sai/commands/sai-explore.md` (and 10 sibling command bodies) — the 11 command fetch sites
- `sai/orchestration/workers/sai-2-design-worker.md` (plus `sai-5-review-worker.md`, `sai-6-security-worker.md`) — the 3 worker fetch sites
- `sai/orchestration/workers/sai-7-performance-worker.md`, `sai/orchestration/workers/sai-8-accessibility-worker.md` — inline the three checks without fetching; must stay consistent with the check artifact
- `skills/claude/fetch/SKILL.md`, `skills/opencode/fetch/SKILL.md` — hardcode the `@sai/policies/prereqs.md` resolution string; unaffected because the composing path is unchanged
- `GLOSSARY.md` — no new domain terms; the split is file organization, not domain vocabulary
- `test/install-claude.test.js`, `test/install-opencode.test.js`, `test/design-coordinator-worker.test.js`, `test/spec-coordinator-worker.test.js`, `test/doctor-retirement-step-5.test.js`, `test/install-manifest.test.js` — invariants the change must keep green
- Git history: commit `894122b` renamed `sai/{instructions => policies}/prereqs.md` (0-line diff), establishing the policies copy as canonical

**External URLs**: none

## Additional Notes

- **Disconfirmed premise**: the request assumed a byte-identical duplicate at `sai/instructions/prereqs.md`. It does not exist in the repo — commit `894122b` already renamed it into `sai/policies/prereqs.md` (0-line diff). The canonical source is `sai/policies/prereqs.md`, which all 14 live fetchers and the `sai-policies` projection already target. The only surviving redundant copies are the stale installed orphans at `~/.claude/sai/instructions/prereqs.md` and `~/.config/opencode/sai/instructions/prereqs.md`, which are byte-identical to the pre-split content (SHA-256 `9AE247A9BB2A03999FE00DC2852530F5AE228E815DC6804CDAD4CC85BC182480`) — that hash is the correct `managedHashes` value for the retirement record.
- **Seam**: the check half is lines 1-9 (heading, `## OpenSpec`, `### Prerequisite checks (halt if any fails)`, the three numbered checks with exact stop messages). The paths half is lines 11-29 (`### Path resolution`, the direct-paths rule, the path table, and the no-write-on-failure rule). The request's slice is preserved exactly; the no-write rule travels with the paths block.
- **Composition mechanism**: the composing entry is a router of fetch directives, relying on recursive fetch resolution, which both harness fetch skills document (`skills/claude/fetch/SKILL.md` and `skills/opencode/fetch/SKILL.md` each carry a Recursion rule). The recursion dependency is pinned as a requirement of the composition capability. Residual risk: if a future harness or model fails to follow the documented recursion, the gate fails open (an empty router is delivered) rather than closed; accepted because both skills document the rule and the composing entry is transitional scaffolding. This is a recorded, accepted risk — carry it into design as a known risk rather than reopening it in this slice. The composing entry must not restate content, or it would add yet another duplicate of content that already lives in the two halves and in the two inline worker copies (`sai-7-performance-worker.md:18`, `sai-8-accessibility-worker.md:20`), which this change exempts from the composition contract with a consistency obligation and leaves untouched per the slice's non-goal.
- **Behavior-preservation scope**: "behavior-preserving" applies to fetcher effective content and repo sources. The retirement is the slice's explicit installed-world exception: it removes only copies whose content matches the managed hash; copies that drifted (user-modified or older versions) are left in place and reported as unrecognized retired copies, matching the tested retirement mechanism.
- **Line-29 no-write rule**: the sentence "Do not create or modify any files if any prerequisite check fails." remains in the paths half per the request's 11-29 slice; the composing entry still delivers it to every fetcher.
- **Pre-existing staleness left out of scope**: `prereq-verification`'s pinned path was already stale (points at a nonexistent repo file) — this change fixes that pin because it moves the pinned content. The example literals in `fetch-existence-check-before-read`, `claude-fetch-resolution`, and `extract-bodies` are fetch-mechanics examples, not prereqs contracts; after the retirement they become fully stale (their "file exists" scenarios no longer apply) but remain mechanically valid as conditional-behavior descriptions. Updating them is a docs-sync concern outside this change's seam.
- **Keep-green invariants**: install tests assert `prereqs.md` lands in `<dest>/sai/policies/` (still true); `design-coordinator-worker.test.js` asserts active sources contain no `@sai/instructions/...prereqs.md` fetch (still true); `spec-coordinator-worker.test.js` asserts the spec invocation core does not fetch policies prereqs (untouched). The retirement record must follow the tested shape (`class: sai`, hex `managedHashes`).
- **Check numbering** is preserved (1, 2, 3), so `sai/policies/remember.md` ("verified by prerequisite #2") and `sai/policies/change-picker.md` remain accurate.
- No `GLOSSARY.md` update needed: the split introduces no new domain vocabulary.
