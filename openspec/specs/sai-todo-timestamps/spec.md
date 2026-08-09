# Sai Todo Timestamps Specification

## Purpose

Define the HH:mm milestone-stamp annotation on the routed phase progress task lists: its decorative nature and scope carve-out, the stamping semantics at each render act (first render, progress-event updates, run-closing reconciliation), the freeze behavior, the call budget, the coordinator-only emission, and the per-harness wall-clock commands.

## Requirements

### Requirement: stamp-annotation-is-decorative

The neutral task-list policy `sai/policies/todo-structure.md` SHALL define the milestone-stamp annotation as a decorative rendering action: a stamp SHALL annotate a rendered step without changing its stable id, user-facing label, plan order, or derived state. The annotation carve-out SHALL NOT weaken the no-re-labelling rule for any other surface: no step of any progress task list SHALL be added, removed, renamed, reordered, or re-labelled by rendering, stamp annotation included.

#### Scenario: decorated step keeps identity and state

- **WHEN** a rendered step of a routed phase progress task list carries a milestone stamp
- **THEN** its stable id and user-facing label SHALL remain exactly as declared in the progress plan
- **AND** its derived state SHALL remain exactly the deterministic state (plan order plus marked set), with the stamp carrying no state semantics

#### Scenario: no-re-labelling rule preserved on every surface

- **WHEN** the list structure rule of `sai/policies/todo-structure.md` is applied on any surface
- **THEN** the stamp annotation SHALL NOT count as a label change, and no other surface SHALL gain a similar annotation carve-out

### Requirement: stamp-scope-three-routed-phase-lists

Milestone stamps SHALL be attached only to the progress task lists of the three routed planning phases whose adapters declare a progress plan — spec (`/sai-1-spec`), design (`/sai-2-design`), and implement (`/sai-3-implement`). The `sai-explore` Idea Progress List and the `/sai-4-apply` step projection SHALL NOT carry stamps.

#### Scenario: idea list carries no stamps

- **WHEN** the `sai-explore` Idea Progress List renders on the native task panel
- **THEN** no entry SHALL carry a milestone stamp, and the idea-list render contract SHALL remain unchanged

#### Scenario: apply projection carries no stamps

- **WHEN** `/sai-4-apply` renders the step projection from `implementation.md`'s `#### Step N:` headings
- **THEN** no entry SHALL carry a milestone stamp, and the projection SHALL remain exactly as governed by `sai/policies/todo-structure.md` today

### Requirement: first-render-start-stamp

At the render-at-dispatch act — the first render of the full plan before the first worker result — the coordinator SHALL attach the current wall-clock time as the start stamp of the first `in_progress` step. The stamp SHALL be an HH:mm value taken at the moment of the render act and SHALL reflect the coordinator's render time, not the worker's exact completion instant.

#### Scenario: first step carries a start stamp at dispatch

- **WHEN** a routed invocation begins with a declared plan of three or more steps
- **THEN** the task list SHALL be rendered before the first worker result with the first step `in_progress` and the rest `pending`
- **AND** the first step SHALL carry an HH:mm start stamp taken at that render act

#### Scenario: stamp reflects coordinator render time

- **WHEN** the start stamp is inspected
- **THEN** it SHALL equal the coordinator's wall-clock time at the render act, with no attempt to measure the worker's completion instant

### Requirement: progress-event-closure-and-inheritance

On each progress event, the coordinator SHALL attach the current wall-clock time (HH:mm, taken at the update render act) as a closure stamp on every step the event marks `completed`, and SHALL carry that same time forward as the start stamp of the step that renders `in_progress` after the update — the leading unmarked step in plan order. Every step after the first therefore inherits its start from the previous closure, with no additional time acquisition.

#### Scenario: marked steps receive closure stamps

- **WHEN** a progress event reports step ids on a routed phase
- **THEN** the coordinator SHALL attach an HH:mm closure stamp to every step those ids mark `completed`, all stamped from the same render act

#### Scenario: next in-progress step inherits the previous closure as its start

- **WHEN** a progress event update leaves a leading unmarked step rendering `in_progress`
- **THEN** that step SHALL carry as its start stamp the closure time of the render act that just completed the preceding step

#### Scenario: inheritance requires no extra time call

- **WHEN** the start stamp of any step after the first is derived
- **THEN** it SHALL be taken from the previous closure value, and the coordinator SHALL NOT issue an additional wall-clock call for it

#### Scenario: multi-mark event yields zero-width spans

- **WHEN** a progress event marks more than one step in a single update
- **THEN** every step it marks after the first SHALL carry a start stamp equal to its own closure stamp — a zero-width span — because its inherited start and its closure are both taken from the same render act

### Requirement: bulk-close-shared-stamp

At the run-closing `completed` reconciliation, when the coordinator renders every unmarked step `completed`, it SHALL attach one shared wall-clock time (HH:mm, taken at the reconciliation render act) as the closure stamp of every step reconciled in that single update.

#### Scenario: completed run stamps remaining steps with one shared time

- **WHEN** the worker returns `completed` with unmarked steps remaining
- **THEN** the coordinator SHALL render every step `completed`
- **AND** every step reconciled by that single update SHALL carry the same HH:mm closure stamp

### Requirement: freeze-on-needs-input-and-unsuccessful-results

A `needs_input` result SHALL leave the list exactly as last rendered — its stamps unchanged and no stamping call issued — and the elapsed pause time SHALL be absorbed into the next milestone stamp: the next closure stamp SHALL be taken at the coordinator's next render act after the pause. `failed` and `cancelled` results SHALL likewise leave the list and its stamps exactly as last rendered, with no further stamps and no clearing.

#### Scenario: needs-input freezes the list and its stamps

- **WHEN** the worker returns `needs_input` with the list rendered
- **THEN** the coordinator SHALL leave the list and its stamps exactly as last rendered and SHALL issue no wall-clock call

#### Scenario: pause time absorbed into the next closure stamp

- **WHEN** the worker resumes after a `needs_input` pause and a later progress event arrives
- **THEN** the closure stamp of that event SHALL be taken at the coordinator's render act after the pause, absorbing the pause duration into the step's elapsed span

#### Scenario: failed run leaves stamps as last rendered

- **WHEN** the worker returns `failed` or `cancelled`
- **THEN** the coordinator SHALL leave the list and its stamps exactly as last rendered, with no further marks, no clearing, and no stamping call

### Requirement: stamp-call-budget

The coordinator SHALL acquire the stamp time with at most one wall-clock shell call per render act — the first render, each progress-event update, and the run-closing `completed` reconciliation — and SHALL NOT issue per-step time calls. The run-closing reconciliation SHALL issue a wall-clock call only when it stamps at least one step; a reconciliation that stamps nothing SHALL issue no call. The transitive inheritance SHALL cover the whole list, so a plan of N steps SHALL be fully annotated in at most N+1 shell calls.

#### Scenario: one call per render act

- **WHEN** the coordinator performs any render act that attaches stamps
- **THEN** it SHALL issue at most one wall-clock shell call for that act, regardless of how many steps the act stamps

#### Scenario: whole list covered in N+1 calls

- **WHEN** a plan of N steps completes with all steps annotated
- **THEN** the total number of wall-clock shell calls SHALL NOT exceed N+1 — the first render, one per progress-event update, and the run-closing reconciliation only when it stamps at least one step

### Requirement: stamp-emission-coordinator-only

The wall-clock shell calls and the attachment of stamps SHALL originate exclusively from the coordinator session, never from a worker subagent: a worker SHALL NOT acquire time or attach stamps. This extends the emission-ownership invariant of `sai/policies/todo-structure.md` to stamp acquisition.

#### Scenario: worker never stamps

- **WHEN** a worker reports completed plan steps or returns a terminal payload
- **THEN** the worker SHALL NOT issue a wall-clock call and SHALL NOT attach or carry any stamp value

#### Scenario: coordinator owns the shell calls

- **WHEN** a progress task list is rendered or updated on either harness
- **THEN** the wall-clock shell call SHALL be issued by the coordinator session — where the harness's shell tool is available in that session per `coordinator-wall-clock-permission-grant` — and SHALL NOT be issued by any subagent

### Requirement: per-harness-time-command

Each harness binding SHALL name its own wall-clock command: the Claude Code binding SHALL use `date +%H:%M` (bash) and the opencode binding SHALL use `Get-Date -Format "HH:mm"` (PowerShell). The neutral policy `sai/policies/todo-structure.md` SHALL NOT name a per-harness command — per-harness tool mechanics SHALL stay in the harness bindings.

#### Scenario: Claude binding carries the bash command

- **WHEN** the Claude Code spec, design, and implementation worker bindings are read
- **THEN** each SHALL name `date +%H:%M` as the wall-clock command for stamp acquisition

#### Scenario: opencode binding carries the PowerShell command

- **WHEN** the opencode spec, design, and implementation worker bindings are read
- **THEN** each SHALL name `Get-Date -Format "HH:mm"` as the wall-clock command for stamp acquisition

#### Scenario: policy names no command

- **WHEN** `sai/policies/todo-structure.md` is read
- **THEN** it SHALL define stamp semantics without naming `date`, `Get-Date`, or any other per-harness command

### Requirement: every-step-carries-start-and-closure

On a `completed` run, every rendered step SHALL carry both a start stamp and a closure stamp as HH:mm values — the first step's start from the first-render act, every later step's start inherited from the preceding closure, and every step's closure from a progress-event update or the bulk-close shared stamp — so the user sees at a glance when each pipeline step started and finished.

#### Scenario: completed run shows start and finish per step

- **WHEN** a routed phase run closes with `completed`
- **THEN** every step of the progress task list SHALL display an HH:mm start stamp and an HH:mm closure stamp, with the first step's start taken at dispatch and every later step's start equal to the preceding step's closure

#### Scenario: durations derivable from adjacent closures

- **WHEN** a user reads the stamped list
- **THEN** each step's elapsed span SHALL be derivable as `closure(N) − closure(N−1)` with `closure(0)` equal to the first-render start stamp, without any measured duration stored on the list

### Requirement: coordinator-wall-clock-permission-grant

The spec, design, and implementation planning-phase coordinator sessions SHALL be granted a narrowly-scoped wall-clock shell permission for milestone-stamp acquisition, as the sole exception to their tool restrictions: on Claude Code, each planning-phase coordinator's `allowed-tools` SHALL declare the base read-only list of `per-command-tool-scoping` plus the scoped entry `Bash(date:*)`; on opencode, the coordinator session SHALL be permitted to run the wall-clock command named by `per-harness-time-command` and no other shell work. The permission SHALL be limited to at most one call per render act per `stamp-call-budget`, SHALL NOT extend the design coordinator's restriction surface in `design-coordinator` or `design-subagent-delegation` beyond that single call, and SHALL NOT grant any stamp authority to a worker subagent per `stamp-emission-coordinator-only`.

#### Scenario: claude coordinators carry the scoped entry

- **WHEN** the frontmatter of `commands/claude/sai-1-spec.md`, `commands/claude/sai-2-design.md`, or `commands/claude/sai-3-implement.md` is inspected
- **THEN** the `allowed-tools` list SHALL contain `Read, Glob, Skill, Agent, SendMessage, AskUserQuestion` and `Bash(date:*)`
- **AND** it SHALL NOT contain `Edit`, `Write`, or a bare `Bash` entry

#### Scenario: design coordinator exception is limited to the stamp call

- **WHEN** the design coordinator issues the wall-clock call for milestone-stamp acquisition
- **THEN** that single call SHALL be permitted despite `coordinator-has-no-file-search-shell-git-web-openspec-access` of `design-coordinator` and the shell prohibition of `design-subagent-delegation`
- **AND** the design coordinator SHALL perform no other shell, file, search, git, web, or OpenSpec operation

#### Scenario: worker stamp authority unchanged

- **WHEN** a worker subagent runs on either harness
- **THEN** it SHALL NOT acquire time or attach stamps, and the permission grant SHALL NOT alter `stamp-emission-coordinator-only`
