# sai-learnings-promotion Specification

## Purpose

Defines the once-per-run learnings promotion pass of `/sai-4-apply`: the deviations-appendix source, the single artifact classification, and the terminal documentation commit with its own authorization gate, file visibility listing, and halted-run boundaries.

## Requirements

### Requirement: Promotion source is the deviations appendix

The promotion pass SHALL take its candidate entries from the `## Appendix: Plan vs Final Implementation` section of `openspec/changes/{change-name}/implementation.md` — the appendix the coordinator itself wrote from subagent report field 5. This is the primary source.

The technical learnings that the run's workers reported in report field 6 MAY be used as a supplementary source for the same run. They SHALL NOT be the sole source of a promoted entry when the deviations appendix is present. The coordinator keeps no learnings memory beyond those reports and SHALL NOT disclose pre-seeded keys, because nothing pre-seeds.

The criterion "the fact was observed during execution, not inferred from the plan" SHALL be treated as satisfied by construction for appendix-sourced candidates: a deviation is by definition something execution surfaced. No separate observation check SHALL be imposed on them.

Each deviation entry's `**Final:**` value — what was actually implemented — SHALL be treated as the carrier of "what works instead" when composing a promoted entry's fact.

Promotion SHALL NOT be triggered by any source other than these two. In particular, the coordinator SHALL NOT infer a promotable fact from a Step that succeeded without deviation, because a fact that execution never contradicted is not an observation.

#### Scenario: A deviation records a false toolchain assumption

- **WHEN** the appendix contains a deviation whose `**Plan:**` asserted a build flag the toolchain does not accept and whose `**Final:**` records the flag that works
- **THEN** the promotion pass considers it a candidate, and composes the promoted fact from the `**Final:**` value

#### Scenario: A field-6 learning has no appendix counterpart

- **WHEN** the coordinator holds a technical learning from field 6 that no deviation entry records
- **THEN** it MAY promote that learning as a supplement, subject to the same artifact filter as appendix-sourced candidates

### Requirement: A single artifact classification filters, keys, and anchors every entry

For each candidate, the coordinator SHALL apply exactly one classification: **does this candidate name a repo-level artifact rather than a symbol this change introduced?**

That single answer SHALL serve three purposes simultaneously:

1. It is the **promotion filter** — a candidate that fails it is not promoted.
2. It is the **supersede key** — the named repo-level artifact is the key the entry is written under.
3. It is the **reader anchor** — the value a later consumer matches on when deciding whether the entry is relevant.

A repo-level artifact is a package, a build target, a command, a configuration file, a compiler or linter rule, or a framework version constraint. A symbol the change introduced is a class, function, module, or file created or renamed by the change being applied.

No additional rubric, scoring, weighting, or multi-criteria judgement SHALL be imposed on the promotion decision. The classification is deliberately a single mechanical test, because `/sai-4-apply` runs on the cheapest model in the pipeline and the judgement budget is spent once.

#### Scenario: Candidate names a package version constraint

- **WHEN** a deviation records that a dependency at the pinned version lacks an API the plan assumed
- **THEN** the candidate passes the classification, is promoted, and is keyed on that package

#### Scenario: Candidate names a class the change created

- **WHEN** a deviation records that a newly created service class needed an extra constructor argument
- **THEN** the candidate fails the classification and is not promoted, because its subject is a symbol this change introduced

#### Scenario: Coordinator is tempted to score candidates

- **WHEN** the coordinator evaluates a borderline candidate
- **THEN** it applies only the single artifact classification and does not apply a severity score, a confidence rating, or any additional criterion

### Requirement: Promotion is committed separately behind its own authorization gate
The promotion commit runs behind its own authorization gate presenting the common commit-authorization option set — `yes (Recommended)` / `no` / `Allow on this session`. Only explicit `yes` (or an already-active `session_commit_authorized` grant) stages exactly the closed promotion set and commits; an off-option reply or silence is NOT a decline — the gate re-presents the identical ask per `@sai/policies/remember.md`; only explicit `no` declines, leaving entries uncommitted while continuing toward MANDATORY STOP.

#### Scenario: Silence is not a decline
- **WHEN** the terminal documentation authorization gate receives no answer
- **THEN** the gate re-presents the same ask and commits nothing until an explicit option is chosen

### Requirement: Terminal documentation commit emits a file visibility listing

The terminal documentation commit, which replaces the former single-file promotion commit, SHALL print a terminal file visibility listing before the coordinator proposes its commit message and before authorization.

For this terminal commit, the listing SHALL not depend on a Step number, a matching `tasks.md` scope, or a subagent report. It SHALL show the exact paths under `docs/**` and the root paths `SAI_LEARNINGS.md` and `GLOSSARY.md` that would be staged, and SHALL show working-tree paths that would remain uncommitted because they are outside that terminal set. It SHALL not stage or mutate the index while producing the preview.

The standard pre-commit file visibility report SHALL continue to fire unchanged at every ordinary STOP & COMMIT marker, including per-Step commits.

#### Scenario: Terminal documentation commit has docs and learnings files

- **WHEN** the terminal documentation commit is about to be proposed and `docs/**` and `SAI_LEARNINGS.md` are eligible but the project-root `GLOSSARY.md` is not
- **THEN** the coordinator prints a terminal file listing containing both sets of paths, plus any working-tree paths excluded from the commit, before proposing the message or asking for authorization

#### Scenario: Terminal documentation commit has docs, learnings, and glossary files

- **WHEN** the terminal documentation commit is about to be proposed and `docs/**`, `SAI_LEARNINGS.md`, and `GLOSSARY.md` are all eligible
- **THEN** the coordinator prints a terminal file listing containing all three sets of paths, plus any working-tree paths excluded from the commit, before proposing the message or asking for authorization

#### Scenario: Terminal documentation commit has no subagent report

- **WHEN** the terminal documentation commit follows the last Step and no subagent report exists for it
- **THEN** the terminal file visibility listing uses the eligible path set directly and does not attempt a Step-number, plan cross-check, or subagent-to-git comparison

#### Scenario: Ordinary Step commit remains covered

- **WHEN** an ordinary Step reaches a STOP & COMMIT marker
- **THEN** the existing full pre-commit file visibility report still fires before that Step's commit proposal

### Requirement: Terminal documentation commit is independent of the per-Step add-list rule

Per-Step commits SHALL remain field-8-only: the coordinator SHALL continue to stage exactly the add-list supplied by the applicable subagent report field 8 for each Step and SHALL NOT widen that rule to sweep `docs/**`, `SAI_LEARNINGS.md`, or `GLOSSARY.md`.

The terminal documentation commit SHALL use its own fixed path set, consisting only of `docs/**`, `SAI_LEARNINGS.md`, and the project-root `GLOSSARY.md`. The coordinator SHALL determine eligibility from the terminal working-tree state, whether root `SAI_LEARNINGS.md` is modified (tracked-modified or untracked), and whether the project-root `GLOSSARY.md` is changed in the working tree — tracked-modified or untracked; it SHALL NOT consult a Step's intended add-list or any subagent report field 8 to construct this terminal set.

Root `SAI_LEARNINGS.md` SHALL be eligible whenever it is modified: when a stop of an earlier run wrote it, when it was already modified at run start, and when the promotion of this run wrote nothing.

The coordinator SHALL NOT use `git add -A`, a broad working-tree sweep, or an equivalent operation that stages paths outside `docs/**`, `SAI_LEARNINGS.md`, and the project-root `GLOSSARY.md`. In particular, `openspec/changes/{change-name}/` and its `implementation.md` SHALL remain outside the terminal documentation commit.

#### Scenario: Terminal commit stages only documentation, learnings, and glossary

- **WHEN** the coordinator authorizes the terminal documentation commit while unrelated files and OpenSpec artifacts are also modified
- **THEN** it stages only changed paths under `docs/**`, `SAI_LEARNINGS.md`, and the project-root `GLOSSARY.md`, leaving every other path uncommitted

#### Scenario: Per-Step add-list remains field-8-only

- **WHEN** an ordinary Step commit is prepared after or before the terminal documentation commit
- **THEN** its add-list remains sourced only from the relevant subagent report field 8 and does not include unrelated `docs/**` paths by default

#### Scenario: Glossary alone triggers the terminal set

- **WHEN** root `SAI_LEARNINGS.md` is unmodified, `docs/**` has no working-tree changes, and the project-root `GLOSSARY.md` is changed in the working tree
- **THEN** the coordinator constructs the terminal set from the changed glossary path and does not require a qualifying promotion as a trigger

#### Scenario: No learning promotion but docs trigger the terminal set

- **WHEN** the promotion pass writes no learning entry but `docs/**` has working-tree changes
- **THEN** the coordinator constructs the terminal set from the changed docs paths and does not require a qualifying promotion as a trigger

#### Scenario: Learnings file modified before this run's promotion

- **WHEN** root `SAI_LEARNINGS.md` was already modified at run start and the promotion of this run wrote nothing
- **THEN** the terminal set includes `SAI_LEARNINGS.md`

### Requirement: Terminal documentation commit preserves the halted-run boundary

The terminal documentation commit SHALL be evaluated only after the Final sweep and the promotion of the completed closing report. If the run stops before the Final sweep, the coordinator SHALL promote learnings before its stopped report prints and SHALL NOT perform the terminal documentation commit.

#### Scenario: Run halts before the Final sweep

- **WHEN** a GREEN conflict, user stop, or declined per-Step commit ends the run before the Final sweep
- **THEN** no terminal documentation commit is proposed, and any docs or learnings changes, including a learnings file the stop wrote, remain subject to a later completed run or manual commit

### Requirement: Bootstrap on first promotion

When the promotion pass produces at least one qualifying entry and `SAI_LEARNINGS.md` does not yet exist, the coordinator SHALL create it at the project root with the full four-section structure, placing the qualifying entries in their sections and leaving the remaining section headings present and empty.

On bootstrap the coordinator SHALL notify the user that the file was created and that future runs will append to and supersede entries within it.

When the promotion pass produces no qualifying entry and the file does not exist, the coordinator SHALL NOT create it. An empty `SAI_LEARNINGS.md` SHALL never be written.

#### Scenario: First qualifying entry in a repo with no file

- **WHEN** the promotion pass produces one qualifying entry and no `SAI_LEARNINGS.md` exists
- **THEN** the coordinator creates the file with all four section headings, places the entry in its section, and notifies the user that the file was bootstrapped

#### Scenario: No qualifying entries in a repo with no file

- **WHEN** the promotion pass produces no qualifying entry and no `SAI_LEARNINGS.md` exists
- **THEN** no file is created

### Requirement: Promotion runs once at every closing report, stopped or completed

The `/sai-4-apply` coordinator SHALL perform one promotion pass at each closing report of `sai/policies/implementation-closing-report.md`, stopped or completed, before that report prints. The promotion rule SHALL be single-sourced in `sai/commands/apply/steps/learnings-promotion.md`: `sai/commands/apply/steps/terminal-lifecycle.md` § 3 SHALL load it after a passing Final sweep, and the shared stopped report SHALL load it for an apply stop.

The pass SHALL NOT be performed per Step, SHALL NOT be delegated to a worker, and SHALL NOT be performed by the `/sai-build` supervisor. A run that continues after a stop SHALL promote again at its next closing report, and an entry that an earlier promotion wrote SHALL be superseded by its key. A stop that prints fixed text instead of the closing report, and an interruption (a chat that dies without reaching a stop), SHALL promote nothing.

#### Scenario: A routed run completes all Steps

- **WHEN** the coordinator finishes the Final sweep and every Step is checked
- **THEN** `terminal-lifecycle.md` § 3 loads `learnings-promotion.md` and the coordinator promotes once before terminal documentation evaluation and the completed closing report

#### Scenario: A run stops before the Final sweep

- **WHEN** an apply run stops for a human before the Final sweep and prints the stopped closing report
- **THEN** the coordinator promotes once before that report prints

#### Scenario: The terminal suite gate stops the run

- **WHEN** the terminal suite gate of `terminal-lifecycle.md` § 0 stops the run
- **THEN** the coordinator promotes like any other stop before the stopped report prints

#### Scenario: A run continues after a stop

- **WHEN** an authorized Step retry continues a run that already promoted at a stop
- **THEN** the coordinator promotes again at the next closing report and supersedes by key any entry already written

#### Scenario: The coordinator is tempted to promote per Step

- **WHEN** a Step's deviations are appended to the appendix mid-run and no closing report is due
- **THEN** no promotion occurs at that point

#### Scenario: A stop prints fixed text instead of the closing report

- **WHEN** a run stops with fixed text because `implementation.md` is missing
- **THEN** no promotion occurs

#### Scenario: A chat is interrupted

- **WHEN** a chat dies without reaching a stop
- **THEN** no promotion occurs

### Requirement: A stop promotes from the candidates written so far and makes no commit

On a stop, the promotion candidates SHALL be every entry written so far in `## Appendix: Plan vs Final Implementation` and the workers' field-6 learnings, the stopped Step's included, under the unchanged qualification rule and the unchanged learnings format. When the promotion writes `SAI_LEARNINGS.md`, the stopped report SHALL list the path, the entries added and superseded, and that the file is uncommitted. When no candidate qualifies, the coordinator SHALL write no file and the report SHALL carry no learnings line.

A stop SHALL NOT make a commit: `SAI_LEARNINGS.md` SHALL stay modified in the working tree, and Step commits SHALL NOT include it.

#### Scenario: A stop has qualifying candidates

- **WHEN** an apply stop has at least one qualifying candidate among the appendix entries written so far and the workers' field-6 learnings
- **THEN** the coordinator writes root `SAI_LEARNINGS.md` and the stopped report lists the path, the entries added and superseded, and that the file is uncommitted

#### Scenario: A stop has no qualifying candidate

- **WHEN** an apply stop has no qualifying candidate
- **THEN** no file is written and the stopped report carries no learnings line

#### Scenario: A stop leaves the file uncommitted

- **WHEN** a stop's promotion wrote `SAI_LEARNINGS.md`
- **THEN** no commit is made and the file stays modified until the terminal documentation commit of the run that completes

### Requirement: The Build supervisor prints the apply coordinator's learnings lines

Under `/sai-build`, the apply coordinator SHALL promote before it hands its results to the supervisor, and the supervisor's single stopped report SHALL print the learnings lines the apply coordinator hands over: the path, the entries added and superseded, and that the file is uncommitted. The supervisor SHALL NOT promote. A stop outside the apply coordinator, including a stop in Build's implement segment and a Direct Build stop, SHALL promote nothing.

#### Scenario: A stop inside the apply segment closes a Build invocation

- **WHEN** a stop inside the apply segment closes a `/sai-build` invocation after the apply coordinator promoted
- **THEN** the supervisor's single stopped report prints the handed-over learnings lines and the supervisor promotes nothing itself

#### Scenario: A stop in the implement segment

- **WHEN** a `/sai-build` invocation stops in its implement segment
- **THEN** no promotion occurs and the stopped report carries no learnings line

### Requirement: The apply tool treats the root learnings file as coordinator-owned

`sai/tools/apply-step.js` SHALL treat root `SAI_LEARNINGS.md` as coordinator-owned in every gate that takes `--baseline`: a change to it SHALL never be a preservation error, SHALL never be reported as protected or unrelated work, and SHALL never be counted among a Step's written files.

#### Scenario: Learnings file modified at run start and rewritten during the run

- **WHEN** root `SAI_LEARNINGS.md` is modified at run start and rewritten during the run
- **THEN** `verify` and `inspect` report no preservation error and do not list the file as changed, protected, unreported, or unrelated

#### Scenario: A Step commit closes while the learnings file is modified

- **WHEN** `close` commits a Step while root `SAI_LEARNINGS.md` is modified
- **THEN** the Step commit excludes the file and its working-tree content is unchanged
