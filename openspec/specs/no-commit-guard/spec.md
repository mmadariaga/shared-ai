# no-commit-guard Specification

## Purpose
TBD - created by archiving change worker-no-commit-guard. Update Purpose after archive.
## Requirements
### Requirement: The no-commit guard is a HEAD-only deterministic tool

The deterministic HEAD-immobility check SHALL be performed by `sai/tools/no-commit-guard.js`, never re-derived in prose. The tool SHALL expose exactly two sub-commands: `snapshot`, which resolves HEAD and reports it as the dispatch window's baseline, always exiting 0 with verdict `clean` (HEAD resolved) or `n/a` (no check possible); and `verify --base <sha|n/a> [--allow-commit]`, which compares the current HEAD against the baseline and reports the window verdict. The closed verdict vocabulary across both sub-commands SHALL be exactly `clean`, `violation`, `allowed`, and `n/a`. Exit codes SHALL be exactly: 0 for `clean`, `allowed`, or `n/a` (the route continues); 1 for `violation` (the caller remediates before continuing); 2 for a usage or IO error (no verdict printed). Both sub-commands SHALL always accept `--json` and `--cwd`. A `--base` argument SHALL be either a 7–40 character hex SHA or the literal `n/a`; any other value (including `HEAD` or a branch name) is a usage error. When HEAD cannot be resolved — not a git repository, git unavailable, or an unborn HEAD (empty repository) — the tool SHALL report verdict `n/a` with a machine-readable `reason` and SHALL NOT exit non-zero. On a violation, the verify payload SHALL carry the commit evidence — the sha and subject pairs of exactly `git log <base>..HEAD` — because the caller's remediation reset erases those commits; the tool SHALL NOT phrase the remediation itself.

#### Scenario: a violation reports evidence before any remediation

- **WHEN** HEAD moved during the dispatch window and no `--allow-commit` flag was carried
- **THEN** `verify` exits 1 with verdict `violation` and a `commits` list of sha/subject pairs covering exactly the commits between the baseline and the current HEAD

#### Scenario: an unresolvable HEAD is n/a, never a failure

- **WHEN** `snapshot` runs in a directory that is not a git repository, or with an unborn HEAD, or with git missing
- **THEN** it exits 0 with verdict `n/a` and a `reason` naming which case resolved

### Requirement: Every routed worker dispatch window is paired

Every dispatch-to-result stretch of a routed worker SHALL be one guard window: the coordinator SHALL run the guard's `snapshot` sub-command immediately before each worker dispatch and immediately before each same-worker continuation, holding the returned head SHA as invocation-scoped `guard_base` for that window only, and SHALL run the `verify` sub-command immediately after every returned worker result — progress event, notice, nonterminal extension, and terminal status alike — before acting on that result. A coordinator-owned mutation (an apply commit gate, a merge launch, the archive post-archive commit, backfill staging) SHALL always run between windows and never inside one, because every next stretch opens with its own fresh snapshot. A replacement dispatch SHALL be a new window with its own fresh snapshot; `guard_base` SHALL never be carried across stretches.

#### Scenario: the window closes before the result is acted on

- **WHEN** a routed worker returns any result and the coordinator holds a `guard_base` for the window
- **THEN** the coordinator runs the guard's `verify` step before marking progress, presenting input, or routing the result

### Requirement: guard_base is invocation-scoped coordinator conversation state

The baseline SHA SHALL live in coordinator conversation state as `guard_base`, exactly like `fast_track_active`: it SHALL never be written to `.openspec.yaml`, any artifact, any configuration, or any file; it SHALL never be a dispatch envelope key; and it SHALL never be a reconstruction field. When the snapshot cannot resolve HEAD, `guard_base` SHALL be recorded as the literal `n/a`, the coordinator SHALL print one ordinary conversation line that the guard is inactive for this window, and the window's verify steps SHALL be skipped entirely — one `n/a` line per window, no check, no auto-remediation, and the route continues.

#### Scenario: the guard degrades without inventing a baseline

- **WHEN** the snapshot cannot resolve HEAD at the start of a dispatch window
- **THEN** the coordinator records `guard_base` as the literal `n/a`, logs one line that the guard is inactive, and runs no verify steps for that window

### Requirement: A violation is remediated exactly once and the route continues

On a `violation` verdict — HEAD moved during the window without authorization — the coordinator SHALL remediate exactly once, in this order: capture the evidence first (the verify payload's `commits` list, used verbatim, because the reset erases the commits); run exactly `git reset <guard_base>` (mixed) — never `--hard`, `--soft`, `--keep`, a checkout, or a branch operation; print the single pinned incident line from `@sai/policies/autonomy-audit-log.md` (§ Incident line) as ordinary conversation text, never more than one line per violation and never written to any file; then act on the result normally. A violation SHALL never be a failure, cancellation, recovery trigger, or diagnosis-round input of its own. The remediation reset is pre-authorized by the calling flow and explicitly carved out of safe-operations; the carve-out covers exactly that one mixed reset, and every other safe-operations confirmation stays in force. Remediation never deletes: out-of-scope working-tree changes are left unstaged and removal is always the user's call.

#### Scenario: an unauthorized worker commit is remediated and the route continues

- **WHEN** a routed worker's verify reports a violation with commit evidence
- **THEN** the coordinator captures the evidence, runs `git reset <guard_base>` (mixed), prints exactly one pinned incident line, and continues the route without treating the violation as a failure

### Requirement: allow_commit is a lax dispatch-carried flag with a single carrier

`allow_commit` SHALL be a dispatch-carried, coordinator-held flag with lax semantics: any HEAD movement passes while the flag is carried, with no scope validation, and the flag is never persisted. The verify for a window carrying the flag runs with `--allow-commit` and resolves verdict `allowed` (exit 0). The system's only carrier is the archive worker's pre-authorized Direct Build (unattended) `--direct-build-execute` continuation — the one local commit inside its validated closed execution order; no other dispatch carries the flag.

#### Scenario: the pre-authorized execute continuation moves HEAD legitimately

- **WHEN** the archive worker's Direct Build execute continuation performs its one pre-authorized local commit inside its window
- **THEN** that window's verify runs with `--allow-commit` and resolves verdict `allowed`, and no other window in the system carries the flag

### Requirement: Concurrent batch dispatches are one guard window

Concurrent batch dispatches SHALL be one guard window: one `snapshot` at batch start and one `verify` at batch close, before acting on the batch outcome. No coordinator mutation of HEAD SHALL occur inside a batch.

#### Scenario: the audit batch is verified as a whole

- **WHEN** several audit workers are dispatched concurrently in one batch
- **THEN** the coordinator snapshots once at batch start and verifies once at batch close, after every activated segment's Result Loop has closed, before the combined terminal

### Requirement: Every coordinator that dispatches a routed worker carries the guard

Every coordinator card that dispatches a routed worker binding — the spec, design, implement, apply, review, security, performance, accessibility, commit, archive, backfill, merge, and meta-review coordinator cards — plus explore's three Direct Build guard windows SHALL fetch `@sai/policies/no-commit-guard.md` and pair the guard around every dispatch and same-worker continuation (or batch start and batch close). On the artifact-blind clean route, the guard's own two tool invocations per window are the coordinator's only git observations. Worker contracts keep their prose prohibitions unchanged: the guard adds no worker prohibition, no binding edit, and no helper-permission change.

#### Scenario: a clean-route coordinator's only git access is the guard

- **WHEN** a coordinator card that dispatches a routed worker runs on a clean route with no gate or mutation of its own
- **THEN** its only git access is the guard's snapshot and verify tool invocations around each dispatch window
- **AND** every dispatched worker contract keeps its prose "never run a mutating git command" prohibition unchanged

