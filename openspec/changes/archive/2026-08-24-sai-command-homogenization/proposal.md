**Complexity**: high (seventeen requirement deltas across nine capabilities, more than eight affected paths)

> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Comparable situations behaved differently across SAI commands: three treatments of `recovery_policy`, three fast-track banner ownership models, split-brain `--overview-lang` validation between coordinator and worker, duplicated change-picker logic inline in the spec worker, two git-gate ask styles between `/sai-commit` and `/sai-4-apply`, and twin audit cards declaring their done-literals differently. Additionally, no contract covered harness-native subagent dispatch-failure retries (observed live as uncovered `network_error` handling). The change applies eleven agreed corrections — flag-parsing-unification, lifecycle-declaration-unification, git-gate-alignment, shared-policy-extraction, and audit-terminal-style — while keeping every deliberate divergence documented in AGENTS.md byte-identical.

## What Changes

- **Flag parsing unified.** `sai/policies/fast-track-flag.md` single-sources the canonical model: the coordinator/main session owns both parse and banner on every opt-in command, the presence-plus-strip fast-track parse runs FIRST wherever other flags are validated, and activation travels as invocation-scoped `fast_track_active` session state (never an envelope key, never persisted). `sai-explore`'s body validates `--overview-lang` after the fast-track strip; the design coordinator owns the fast-track parse/banner and fail-fast `--overview-lang` form validation before plan selection, rendering, change resolution, and dispatch; the design worker receives the cleaned request, emits no banner notice, keeps no `fast_track_banner_emitted` dedup state, and strips stray tokens tolerantly.
- **Lifecycle declarations unified.** The audit coordinators (review, security, performance, accessibility) declare explicit `recovery_policy: false`; implement declares `recovery_policy: true`; progress-plan wording drops step-count qualifiers to "canonical progress plan"; the spec coordinator drops its retired five-step wording; each audit done-literal is declared exactly once in its coordinator navigation section.
- **Git gates aligned.** The apply runner-owned terminal documentation gate adopts the common authorization option set (`yes (Recommended)` / `no` / `Allow on this session`) with re-present-on-invalid-or-silence semantics; `/sai-commit` distinguishes an explicit `no` from off-option replies or silence identically.
- **Shared policies extracted.** `sai/policies/bounded-dispatch-retry.md` (transport-class dispatch-failure retries of the identical prompt, max two retries) is fetched by every delegated-dispatching worker card and explore's Auto contract; `sai/policies/autonomy-audit-log.md` pins the scannable audit layout consumed by reference with a caller-supplied phase label; `sai/policies/question-context.md` centralizes the registry of pinned anatomy exemptions; the spec worker fetches `sai/policies/change-picker.md` instead of duplicating its logic, and the picker gains `sai-1-spec` as a conditional consumer.
- **Known limitations left behind.** Until archive-time spec sync, the `design-planning-worker`, `worker-lifecycle-protocol`, and `sai-fast-track-flag` main specs still mandate the retired worker-emitted banner and dedup state (the delta specs here resolve this at sync); the design-only notice shape remains in `worker-core.md` and `question-context-policy` with no producer (retirement/generalization deliberately deferred); audit phases keep bounded recovery disabled even though redispatch would be cheap (accepted trade-off); the autonomy-audit extraction is observability-only — no standalone command gained auto-answer machinery.

## Capabilities

### New Capabilities
- `sai-bounded-dispatch-retry` — shared bounded retry contract for transport-class harness-native subagent dispatch failures.

### Modified Capabilities
- `sai-fast-track-flag` — canonical model single-sourced; sai-2-design parse/banner moved to its coordinator card.
- `design-planning-worker` — coordinator-owned fast-track activation and overview-language form validation; notice emission and dedup state retired.
- `worker-lifecycle-protocol` — `fast_track_banner_emitted` removed from design reconstruction metadata and design-lifecycle-scoped extensions.
- `commit-auth-gate` — common authorization option set and re-present-on-invalid semantics across gates, including the apply terminal documentation gate.
- `sai-learnings-promotion` — terminal documentation gate scenario updated to the aligned gate semantics.
- `change-picker` — sai-1-spec added as a conditional consumer fetching the picker only when arguments_value is empty.
- `question-context-policy` — centralized registry of pinned anatomy exemptions.
- `pipeline-autonomy-audit-log` — pinned scannable layout single-sourced in a shared policy consumed by reference.

## Impact

- New files: `sai/policies/bounded-dispatch-retry.md`, `sai/policies/autonomy-audit-log.md`, `sai/policies/fast-track-flag.md`
- Modified files: `AGENTS.md`; `sai/commands/accessibility/coordinator.md`, `sai/commands/performance/coordinator.md`, `sai/commands/review/coordinator.md`, `sai/commands/security/coordinator.md` (terminal_navigation, progress-plan wording, recovery_policy declaration); bounded-dispatch-retry fetch lines in `sai/commands/{accessibility,design,implement,performance,review,security}/worker.md` and `sai/commands/backfill/worker.md`; `sai/commands/design/coordinator.md` and `sai/commands/design/worker.md` (parse ownership, validation split, notice retirement); `sai/commands/implement/coordinator.md` (recovery_policy true, opaque-envelope wording); `sai/commands/spec/coordinator.md` and `sai/commands/spec/worker.md` (picker fetch, wording cleanup); `sai/commands/explore/body.md` and `sai/commands/explore/instructions.md` (parse order, retry policy, audit-layout delegation, chained-banner ownership); `sai/commands/apply/coordinator.md` and `sai/commands/apply/runner.md` (terminal gate option set); `sai/commands/commit/coordinator.md` and `sai/commands/commit/instructions.md` (invalid-input semantics); `sai/commands/worktree/instructions.md` (anatomy reference); `sai/policies/change-picker.md` and `sai/policies/question-context.md`

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Proposal Research Documentation

This backfill reconstructs a change explored and crystallized in-session from a four-explorer audit of the SAI command corpus; the audit findings are the evidence base for the eleven axes (flag-parsing-unification, lifecycle-declaration-unification, git-gate-alignment, shared-policy-extraction with four extractions, audit-terminal-style). Key paths consulted while composing this record: `sai/orchestration/command-runner.md` (shared runner routing and recovery wiring), `sai/policies/bounded-recovery.md` (recovery semantics the new `recovery_policy` declarations toggle), `sai/policies/question-context.md` (five-element anatomy and the centralized exemption registry), `sai/commands/design/coordinator.md` (coordinator-owned fast-track parse and fail-fast overview-language validation), `sai/commands/explore/body.md` (canonical fast-track-first parse order), and `sai/install-manifest.json` (projection surface confirming no installer changes were needed).

## Additional Notes

Post-hoc provenance: this record was produced by `/sai-backfill` against the staged implementation diff (`git diff --staged`, 28 files, +265/−89) with a user-supplied statement of intent; grounded auto-answer records from the original supervised session exist only in conversation-only state and are deliberately not persisted here. Until archive-time sync, the `design-planning-worker`, `worker-lifecycle-protocol`, and `sai-fast-track-flag` main specs transiently mandate the retired worker-emitted banner and dedup state.
