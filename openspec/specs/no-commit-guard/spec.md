# no-commit-guard Specification

## Purpose
Keep HEAD immobile across every routed worker dispatch window with a deterministic snapshot/verify tool and a single pre-authorized remediation.

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

A guard window SHALL be the stretch between a guard `snapshot` and its `verify`, bounded by control hand-offs rather than by worker dispatches: one window SHALL span every consecutive worker stretch — fresh dispatches, same-worker continuations, and replacement workers alike — until the next boundary. The closed list of boundaries SHALL be exactly: (1) a human turn — a `needs_input` result (closed or open), a nonterminal extension whose handler hands the turn to the user, or a user interruption that is later resumed; (2) a coordinator git mutation — any git mutation the coordinator itself runs, including an apply commit gate whether asked or pre-authorized, a merge launch, checkout, `git mv`, or staging, the archive CLI move and post-archive commit, a close's staging and commit, and a nonterminal extension whose handler performs one; and (3) run close — the terminal result (`completed`, `failed`, `cancelled`) or user cancellation after which the coordinator dispatches no further worker before a human turn or its own git mutation. Nothing else SHALL be a boundary: a progress event, a `notice`, a ready return, a nonterminal extension whose handler neither asks the user nor mutates git, a terminal result followed directly by the next dispatch, and a segment transition inside a composition SHALL continue the running window, and the coordinator SHALL act on them with no guard call. The coordinator SHALL open a window with `snapshot` once the first dispatch's harness-native resumable handle is retained, immediately before the worker's expensive work proceeds; after a human turn, once the answer is in and before it is forwarded to a worker; and after a coordinator git mutation, before the next dispatch or continuation. The coordinator SHALL close the window with `verify --base <guard_base>` immediately before each boundary and before acting on it. Because every coordinator git mutation is a boundary, coordinator-owned mutations SHALL always run between windows and never inside one.

#### Scenario: a progress event takes no guard call

- **WHEN** a routed worker returns a progress event or a notice inside a running guard window
- **THEN** the coordinator acts on it and continues the same worker with no `snapshot` and no `verify`

#### Scenario: a human turn closes and reopens the window

- **WHEN** a routed worker returns a `needs_input` result inside a running guard window
- **THEN** the coordinator runs `verify` before presenting the question and runs a fresh `snapshot` after the answer arrives, before forwarding it to the worker

#### Scenario: the window closes before the result is acted on

- **WHEN** a routed worker returns a result that reaches a boundary — a `needs_input` result, a run-closing terminal result, or a result followed by a coordinator git mutation
- **THEN** the coordinator runs the guard's `verify` step before presenting input, routing the run-closing result, or running its own git mutation

### Requirement: guard_base is invocation-scoped coordinator conversation state

The baseline SHA SHALL live in coordinator conversation state as `guard_base`, exactly like `fast_track_active`: it SHALL never be written to `.openspec.yaml`, any artifact, any configuration, or any file; it SHALL never be a dispatch envelope key; it SHALL never be a reconstruction field; and it SHALL never be carried across a boundary. A replacement worker dispatched for recovery SHALL inherit the running window's `guard_base` and SHALL take no new snapshot, because no human turn and no coordinator git mutation occurs between the failed worker and its replacement. When the snapshot cannot resolve HEAD, `guard_base` SHALL be recorded as the literal `n/a`, the coordinator SHALL print one ordinary conversation line that the guard is inactive for this window — one line per window, never one per continuation — and the window's verify SHALL be skipped: no check, no auto-remediation, and the route continues. The next boundary SHALL attempt a fresh snapshot.

#### Scenario: the guard degrades without inventing a baseline

- **WHEN** the snapshot cannot resolve HEAD at the opening of a guard window
- **THEN** the coordinator records `guard_base` as the literal `n/a`, prints one line that the guard is inactive for that window, runs no verify for it, and attempts a fresh snapshot at the next boundary

#### Scenario: a replacement worker inherits the running baseline

- **WHEN** the coordinator dispatches a replacement worker for recovery inside a running guard window
- **THEN** the replacement runs under the running window's `guard_base` and no new snapshot is taken

### Requirement: A violation is remediated exactly once and the route continues

On a `violation` verdict — HEAD moved during the window without authorization — the coordinator SHALL remediate exactly once, in this order: capture the evidence first (the verify payload's `commits` list, used verbatim, because the reset erases the commits); run exactly `git reset <guard_base>` (mixed) — never `--hard`, `--soft`, `--keep`, a checkout, or a branch operation; print the single pinned incident line from the guard policy's § Incident line as ordinary conversation text, never more than one line per violation and never written to any file; then act on the result normally. A violation SHALL never be a failure, cancellation, recovery trigger, or diagnosis-round input of its own. The remediation reset is pre-authorized by the calling flow and explicitly carved out of safe-operations; the carve-out covers exactly that one mixed reset, and every other safe-operations confirmation stays in force. Remediation never deletes: out-of-scope working-tree changes are left unstaged and removal is always the user's call.

#### Scenario: an unauthorized worker commit is remediated and the route continues

- **WHEN** a routed worker's verify reports a violation with commit evidence
- **THEN** the coordinator captures the evidence, runs `git reset <guard_base>` (mixed), prints exactly one pinned incident line, and continues the route without treating the violation as a failure

### Requirement: allow_commit is a lax dispatch-carried flag with a single carrier

`allow_commit` SHALL be a dispatch-carried, coordinator-held flag with lax semantics: any HEAD movement passes while the flag is carried, with no scope validation, and the flag is never persisted. A dispatch or continuation carrying the flag SHALL always open its own guard window and SHALL never be merged with a preceding one: the coordinator SHALL run a normal `verify` immediately before it, a fresh `snapshot`, and `verify --allow-commit` over that window only, so the flag cannot mask an unauthorized commit made by an earlier worker. The verify for the window carrying the flag resolves verdict `allowed` (exit 0). The system's only carrier is the archive worker's pre-authorized Direct Build (unattended) `--direct-build-execute` continuation — the one local commit inside its validated closed execution order; no other dispatch carries the flag.

#### Scenario: the pre-authorized execute continuation moves HEAD legitimately

- **WHEN** the archive worker's Direct Build execute continuation performs its one pre-authorized local commit inside its window
- **THEN** that window's verify runs with `--allow-commit` and resolves verdict `allowed`, and no other window in the system carries the flag

#### Scenario: the allow_commit window is isolated from the preceding window

- **WHEN** the coordinator is about to send the `--direct-build-execute` continuation while an archive window is running
- **THEN** it closes the running window with a normal `verify` first and opens a fresh window from a new `snapshot` whose verify alone carries `--allow-commit`

### Requirement: Concurrent batch dispatches are one guard window

A concurrent batch dispatch SHALL sit inside one guard window and SHALL NOT be a window rule of its own: the coordinator SHALL NOT move HEAD and SHALL ask nothing inside a batch. A window already running at batch start SHALL continue through the batch; otherwise the snapshot SHALL run at batch start, once every batch handle is captured. The verify SHALL run at batch close, before acting on the batch outcome, whenever that close is a boundary.

#### Scenario: the audit batch is verified as a whole

- **WHEN** several audit workers are dispatched concurrently in one batch whose close is a boundary
- **THEN** the coordinator verifies once at batch close, after every activated segment's Result Loop has closed and before the combined terminal, with no guard call between the segments

### Requirement: Every coordinator that dispatches a routed worker carries the guard

Every coordinator card that dispatches a routed worker binding — the spec, design, implement, apply, review, security, performance, accessibility, commit, archive, backfill, merge, and meta-review coordinator cards — plus explore's three Direct Build guard windows SHALL fetch `@sai/policies/no-commit-guard.md` and pair the guard at the boundaries of every guard window: a `snapshot` at each window opening and a `verify` immediately before each boundary the policy lists (human turn, coordinator git mutation, run close), acting on a progress event or notice with no guard call. On the artifact-blind clean route, the guard's own two tool invocations per window are the coordinator's only git observations. Worker contracts keep their prose prohibitions unchanged: the guard adds no worker prohibition, no binding edit, and no helper-permission change.

#### Scenario: a clean-route coordinator's only git access is the guard

- **WHEN** a coordinator card that dispatches a routed worker runs on a clean route with no gate or mutation of its own
- **THEN** its only git access is the guard's snapshot and verify tool invocations at each guard window's opening and closing boundary

#### Scenario: worker prohibitions stay unchanged

- **WHEN** a dispatched worker contract is read after the guard is wired
- **THEN** it keeps its prose "never run a mutating git command" prohibition unchanged

### Requirement: The guard's violation line is pinned in the guard policy

The no-commit-guard policy (`sai/policies/no-commit-guard.md`) SHALL own a `## Incident line` section pinning the one visible violation line the no-commit guard's coordinator prints per remediation, in the fixed field order: `> NO-COMMIT GUARD: unauthorized commit(s) detected after <worker label> dispatch — reset to <base> (mixed); commits preserved unstaged; evidence: <sha> <subject>[; <sha> <subject>]`. The line SHALL be conversation-only: NEVER written to any file, artifact, change directory, or configuration, and never more than one line printed per violation. `<worker label>` names every worker dispatched inside the window, in dispatch order and joined with ` + ` (a single worker's name when only one ran), `<base>` is the window's `guard_base`, and the evidence pairs come verbatim from the verify payload's `commits` list; when that list is empty the evidence field SHALL read exactly `evidence: none reported`. Coordinator cards SHALL NOT restate the remediation recipe or the line; they remediate exactly as the guard policy prescribes.

#### Scenario: a remediation prints exactly one pinned line

- **WHEN** the guard remediates a violation whose evidence lists one unauthorized commit
- **THEN** the coordinator prints exactly one conversation line in the pinned field order carrying the worker label, the guard_base, and that commit's sha and subject, and writes no incident text to any file or artifact

#### Scenario: a multi-worker window names every worker

- **WHEN** a violation is detected in a window inside which two workers were dispatched
- **THEN** the incident line's worker label names both workers in dispatch order, joined with ` + `

### Requirement: A violation is detected at its window's closing boundary

The guard SHALL detect a violation when its window closes at the next boundary, not at the exact worker stretch that committed. The remediation SHALL remain the single mixed `git reset <guard_base>` to the window base, which preserves all content unstaged, and the one incident line SHALL aggregate the commit evidence of every worker dispatched inside that window.

#### Scenario: a commit inside a multi-stretch window is caught at the boundary

- **WHEN** a worker commits inside a window that spans several worker stretches and the window reaches its closing boundary
- **THEN** the closing verify reports the violation, the mixed reset returns HEAD to the window's `guard_base` with all content preserved unstaged, and one incident line carries the evidence for every commit in the window
