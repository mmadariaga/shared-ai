# merge-run-state Specification

## Purpose
TBD - created by archiving change sai-merge-runs-goal-driven. Update Purpose after archive.

## Requirements

### Requirement: merge-run machine holds identifiers only

The `sai-state` registry SHALL register a `merge-run@1` machine built on the shared run core `sai-state/machines/run-core.js`. It SHALL accept the events `start {dir}`, `launch {method, branch, head, baseline}`, `stop {stop}`, `attempt {obstacle}`, `escalate {obstacle}`, `answer {obstacle, choice}`, `record {ref, path}`, `close {outcome}`, and `status {}`. `launch` SHALL require a method of `merge`, `rebase`, or `rebase-squash`, a branch, a pre-launch `HEAD` of 7 to 64 lowercase hex characters, an optional baseline path, and a running run. `stop` SHALL require a positive integer and a running run, and `close` SHALL clear the stop index. `record` SHALL accept the references `obstacle`, `finding`, and `assumption` as paths without duplicates. Each obstacle SHALL have a budget of three attempts, and an `answer` SHALL reset only that obstacle. Free text SHALL live in files in the run directory and never in an event.

#### Scenario: Launch records the run identifiers

- **WHEN** a running run receives `launch` with method `rebase`, a branch, a valid commit id, and a baseline path
- **THEN** the run state holds exactly those identifiers

#### Scenario: Invalid launch is rejected

- **WHEN** `launch` carries an unknown method, a malformed `HEAD`, or arrives after the run closed
- **THEN** the machine rejects the event and the state is unchanged

#### Scenario: Fourth attempt is refused

- **WHEN** an obstacle has spent three attempts
- **THEN** a further `attempt` for that obstacle is rejected as exhaustion

### Requirement: Merge run session and run directory

The merge coordinator SHALL keep one `sai-state` session per run under the key `merge-{branch}` and SHALL create the run directory with `temp-root.js mkdtemp --harness <claude|opencode> --prefix merge-`, outside the repository, holding the provenance, baseline, worker reports, reviews, hand-over files, and the obstacle, finding, and assumption files. A completed or stopped run SHALL NOT block the next `start`. The run directory SHALL be removed with `temp-root.js remove` only when the run completed; a stopped, escalated, or unanswered run SHALL keep it and the report SHALL say where. When a state emit still fails after two retries with a corrected delivery form, the coordinator SHALL keep the same facts in `run-state.md` in the run directory and continue.

#### Scenario: Completed run removes its directory

- **WHEN** a run closes `completed`
- **THEN** its run directory is removed, and a failed removal only adds a line naming the kept path

#### Scenario: Escalated run keeps its directory

- **WHEN** a run closes `escalated`
- **THEN** its run directory is kept and the closing report names its path

### Requirement: Interrupted merge run resumes from the store and the git state

After a context compaction, or when the start finds a run of the named branch in progress, the coordinator SHALL emit `status`, read the files the state references, and compare them with the git state (`MERGE_HEAD` or the rebase directory, unmerged and staged paths, and `git log`); the git state SHALL win over the store. It SHALL continue at the first unfinished part of the stop: a written but unstaged resolution is reviewed as it stands, an unwritten stop starts at the strategy, and an operation with nothing left to resolve goes to final verification. Without the store, it SHALL rebuild from the git state and the newest `merge-*` run directory holding `provenance.json` for the branch, and a missing run directory SHALL leave the baseline unavailable. A `running` or `escalated` stored run whose git state shows no merge or rebase in progress SHALL be closed `stopped` and reported as ended outside the run. A lost worker handle SHALL be replaced by a new worker, spending no attempt, that receives a hand-over file, and an `escalated` stage SHALL ask its question again.

#### Scenario: Operation ended outside the run

- **WHEN** the store records a running merge run but git shows no merge or rebase in progress
- **THEN** the coordinator closes the run as `stopped` and reports that the operation ended outside the run

#### Scenario: Git state wins over the store

- **WHEN** the store and the git state disagree about the current stop
- **THEN** the coordinator continues from the git state
