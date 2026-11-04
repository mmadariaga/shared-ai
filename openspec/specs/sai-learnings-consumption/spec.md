# sai-learnings-consumption Specification

## Purpose

Defines how the design, RED, GREEN, and review phases read `SAI_LEARNINGS.md` without breaching test-writer blindness.

## Requirements

### Requirement: Promoted facts never breach test-writer blindness

A `SAI_LEARNINGS.md` entry that the RED worker reads SHALL never reveal the current Step's GREEN implementation body.

This invariant is held closed by construction rather than by an added filter: an entry keys on a repo-level artifact and never on a symbol the change being applied introduces. A fact that cannot name the change's new symbols cannot disclose that change's implementation body.

The coordinator SHALL NOT inject an accumulated learning into any dispatch: the step brief carries only the path of `SAI_LEARNINGS.md`, and the worker reads the file itself.

#### Scenario: A promoted Stack fact reaches the test-writer

- **WHEN** the RED worker reads `SAI_LEARNINGS.md` and the file carries a promoted **Stack** entry
- **THEN** the entry names a repo-level artifact such as a framework version or a project convention, and reveals nothing about the current Step's implementation body

#### Scenario: Injection-time blindness is unchanged

- **WHEN** the coordinator composes a RED step brief
- **THEN** the brief carries the path of `SAI_LEARNINGS.md` and no accumulated learning, and nothing in it reveals the current Step's GREEN body

### Requirement: Wrapper wiring fetches the format file for both consuming commands

Each reader SHALL fetch `sai/policies/sai-learnings-format.md` at its point of use, only when a project-root `SAI_LEARNINGS.md` exists, and never when the file is absent: the design research step when it reads the file, the RED and GREEN step files when the brief names the file, the review analysis step at its Consistency with Codebase pass, and the `/sai-3-implement` coordinator in its run-close learnings promotion. The design tasks step SHALL NOT fetch it for an Implementation Context merge.

Harness parity SHALL ride the shared instruction bodies rather than being duplicated per harness, consistent with how the existing `glossary-format.md` fetch achieves parity today.

#### Scenario: sai-4-apply loads its instructions

- **WHEN** the command catalog is read
- **THEN** no `/sai-4-apply` command exists, so no apply invocation fetches `sai/policies/sai-learnings-format.md`

#### Scenario: sai-2-design tasks step with SAI_LEARNINGS.md present

- **WHEN** the design worker runs in a project with a root `SAI_LEARNINGS.md`
- **THEN** it fetches `sai/policies/sai-learnings-format.md` in its research step and reads § Consumption, and its tasks step merges nothing into `## Implementation Context`

#### Scenario: sai-2-design without SAI_LEARNINGS.md

- **WHEN** the design worker runs in a project with no `SAI_LEARNINGS.md`
- **THEN** `sai/policies/sai-learnings-format.md` is never fetched

#### Scenario: Parity across harnesses

- **WHEN** the same command is invoked under a different harness
- **THEN** the promotion and consumption behavior is identical, because it is defined in the shared instruction bodies rather than in per-harness wrapper copies

### Requirement: Design, RED, GREEN, and review read SAI_LEARNINGS.md directly

When a project-root `SAI_LEARNINGS.md` exists, the design research step, the RED and GREEN workers of `/sai-3-implement`, and the review analysis step SHALL read it directly, per `sai/policies/sai-learnings-format.md` § Consumption. No instruction SHALL copy its entries into another artifact, so the file is the only copy. The design worker SHALL apply its entries to the decisions of `design.md` and the steps of `tasks.md` without copying them into either, and SHALL NOT list the file under `## Required Documentation`. The `/sai-3-implement` step brief SHALL carry the path `SAI_LEARNINGS.md` when the file exists, and SHALL NOT mention the file when it does not. The review's Consistency with Codebase pass SHALL check conventions against the code and the file's entries, and against the code only when the file does not exist. When the file does not exist, every reader SHALL skip it silently, with no warning, prompt, or halt.

#### Scenario: Design reads the learnings file in its research step

- **WHEN** the design worker runs its research step in a project with a root `SAI_LEARNINGS.md`
- **THEN** it reads the file, applies its entries to the decisions of `design.md` and the steps of `tasks.md`, and copies no entry into either

#### Scenario: The step brief carries the learnings path

- **WHEN** the `/sai-3-implement` coordinator writes a step brief in a project with a root `SAI_LEARNINGS.md`
- **THEN** the brief names the path `SAI_LEARNINGS.md`, and RED and GREEN read the file before writing

#### Scenario: No learnings file

- **WHEN** design, RED, GREEN, or review runs in a project with no `SAI_LEARNINGS.md`
- **THEN** it proceeds with no warning, the step brief does not mention the file, and review checks conventions against the code only

### Requirement: A learnings entry wins over contradicting code

When existing code does the opposite of a `SAI_LEARNINGS.md` entry, the entry SHALL be taken as correct: design, RED, and GREEN SHALL follow it in what they write. Contradicting code in a file the change modifies SHALL be corrected in the same step. Contradicting code in a file the change does not touch SHALL stay unchanged; GREEN SHALL report its path and the entry's key in `notes`, the coordinator SHALL record it as a deviation starting `SAI_LEARNINGS.md contradiction:`, and the closing report SHALL show the path and the entry's key. A belief that an entry is old, contradicted by code, or irrelevant SHALL NOT be evidence to correct or delete it.

#### Scenario: Contradicting code outside the change

- **WHEN** GREEN finds that a file the change does not touch contradicts a `SAI_LEARNINGS.md` entry
- **THEN** that file stays unchanged, and the closing report shows its path and the entry's key

#### Scenario: Contradicting code inside the change

- **WHEN** a file the step modifies contradicts a `SAI_LEARNINGS.md` entry
- **THEN** the step follows the entry and corrects that code in the same step

### Requirement: Execution settles a stale learnings entry

When following a `SAI_LEARNINGS.md` entry fails on execution (the compiler, linter, or tests reject what it directs), the entry SHALL be treated as stale. RED and GREEN SHALL write the alternative that works and report the entry's key and the failure in `notes`; when the coordinator's own run of a Test Command taken from the file fails because of the entry and another command works, the same SHALL apply. The coordinator SHALL record a deviation starting `SAI_LEARNINGS.md stale:` with the entry's section and key, the failure as evidence, and the alternative that worked. At its close it SHALL correct the entry by key with that alternative, or delete it when no durable fact remains, and SHALL write each correction or deletion to a `## Learnings Corrections` section at the end of the change's `design.md` (section, key, previous value, new value or `deleted`, and the evidence), creating the section when absent; when `design.md` does not exist, the closing report alone SHALL carry them. The closing report SHALL list each correction or deletion with its evidence. The run SHALL NOT stage or commit `SAI_LEARNINGS.md` or the corrections section.

#### Scenario: A stale entry is corrected at close

- **WHEN** GREEN reports that following a `SAI_LEARNINGS.md` entry failed on execution and names the alternative that worked
- **THEN** the coordinator records a `SAI_LEARNINGS.md stale:` deviation, corrects or deletes the entry at close, writes the change to `## Learnings Corrections` in `design.md`, and lists it in the closing report
