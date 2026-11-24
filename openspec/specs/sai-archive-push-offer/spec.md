# sai-archive-push-offer Specification

## Purpose

TBD - created by archiving change sai-archive-push-offer. Update Purpose after archive.

## Requirements

### Requirement: The archive coordinator SHALL accept a validated push answer argument

The ordinary `/sai-archive` invocation SHALL accept `[change-name] [--fast-track] [--push yes|no]`. The coordinator SHALL take `--push <value>` out of the arguments before the `--fast-track` parse and SHALL hold a `yes` or `no` value as the push answer for the whole run. A value other than exactly `yes` or `no`, or a `--push` with no value, SHALL end the run before anything is written, with `Cannot start /sai-archive: --push takes yes or no.`

#### Scenario: An invalid push value ends the run before any write

- **WHEN** `/sai-archive` is invoked with `--push maybe` or with `--push` and no value
- **THEN** the run ends with `Cannot start /sai-archive: --push takes yes or no.` and nothing is written, archived, or committed

#### Scenario: A given push value suppresses the question

- **WHEN** `/sai-archive` is invoked with `--push yes` or `--push no` and the branch has a push destination
- **THEN** the push question is not asked and the given value is the push answer of the run

### Requirement: The ordinary route SHALL ask the push question once before the archive

Without a `--push` value, the coordinator SHALL settle the push destination after the archive plan is not refused and before anything is written or moved: the branch's upstream, or `origin/<branch>` when the branch has no upstream and an `origin` remote exists. With a destination it SHALL ask once, on Claude Code through `AskUserQuestion` and on opencode through `question`, with the same text and options. It SHALL first print as plain text the branch, the destination, that the push sends every local commit of the branch and not only the archive commit, that it never uses force, and that nothing asks again; the picker question SHALL be `Push {branch} to {destination} when this archive ends?` with the options `Push the branch` (`yes`) and `Do not push` (`no`). A cancelled question SHALL count as `no`. The default branch SHALL get no special refusal. `--fast-track` SHALL neither skip the question nor count as the answer.

#### Scenario: The question names the branch and its destination

- **WHEN** an ordinary run without `--push` reaches a plan that is not refused, on a branch with an upstream
- **THEN** the context is printed as plain text and the picker asks `Push {branch} to {destination} when this archive ends?` with `Push the branch` and `Do not push`, before `openspec archive` runs

#### Scenario: No destination asks nothing and pushes nothing

- **WHEN** `HEAD` is detached, or the branch has no upstream and `git remote` lists no `origin`
- **THEN** no push question is asked, no push runs whatever the answer, and the closing summary states the reason

#### Scenario: Fast-track keeps the push question

- **WHEN** `/sai-archive` runs with `--fast-track` and without `--push` on a branch with a push destination
- **THEN** the push question is still asked and the commit gate auto-selects `Create a new commit` as before

### Requirement: The coordinator SHALL push at close only after an executed pushable commit

With the push answer `yes` and a destination, the coordinator SHALL push once after the post-archive commit gate, outside any worker window, only when the gate executed a commit: `Create a new commit` (the fast-track path included), or `Amend the latest commit` after the gate's existing pushed-HEAD check found `HEAD` unpushed, with no second check. It SHALL run `git push` when the branch has an upstream and `git push -u origin <branch>` when it has none, never with `--force` or `--no-verify`, and SHALL never create or update a pull request. After `Do nothing`, an empty index, a gate the skip rule skipped, a declined amend, or an amend of an already-pushed `HEAD`, it SHALL push nothing.

#### Scenario: A new commit is pushed on a yes answer

- **WHEN** the push answer is `yes` and the commit gate created a new commit
- **THEN** the coordinator runs `git push`, or `git push -u origin <branch>` when the branch has no upstream, without `--force` or `--no-verify`

#### Scenario: An amend of an already-pushed HEAD is not pushed

- **WHEN** the push answer is `yes` and the gate amended a `HEAD` that its pushed-HEAD check found already pushed
- **THEN** no push runs and the closing summary says that publishing it needs a force push, left to the user

#### Scenario: No executed commit means no push

- **WHEN** the push answer is `yes` and the gate ended with `Do nothing`, an empty index, or was skipped because nothing changed
- **THEN** no push runs and the closing summary states the push as not applicable with that reason

### Requirement: A failed push SHALL NOT undo the archive or withhold the completion literal

A failed push (rejected, authentication, or network) SHALL be a planned stop of the push alone, not an obstacle: the archive move and the commit SHALL stand, nothing SHALL be retried, and `Archive done.` SHALL still print when the archive move executed.

#### Scenario: A rejected push still closes the run

- **WHEN** the push answer is `yes`, the gate created a commit, and `git push` fails
- **THEN** the archive and the commit stay in place, the summary shows the error and the command to retry, and the run ends with `Archive done.`

### Requirement: The closing summary SHALL always state the push outcome on the ordinary route

When the archive move executed on the ordinary route, the closing summary SHALL state exactly one push outcome: pushed (branch and destination), not requested (the answer is `no`), not applicable with its reason (no destination, no commit executed, or an amend of an already-pushed `HEAD` that needs a force push), or failed with the error and the command to retry.

#### Scenario: A no answer is reported as not requested

- **WHEN** the push answer is `no` and the archive move executed
- **THEN** the closing summary states the push as not requested before `Archive done.`

### Requirement: The Direct Build archive route SHALL NOT push

The Direct Build (unattended) archive route, from `/sai-explore` or `/sai-direct-build`, SHALL receive neither the push question nor `--push`, and neither its composition nor the archive worker SHALL push.

#### Scenario: Direct Build archives without a push

- **WHEN** the archive runs on the Direct Build route
- **THEN** no push question is asked, no `--push` value is read, and no push runs
