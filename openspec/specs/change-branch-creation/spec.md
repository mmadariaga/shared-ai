# change-branch-creation Specification

## Purpose
TBD - created by archiving change group-post-crystallization-question-rounds. Update Purpose after archive.

## Requirements

### Requirement: Prepare suggested bases for a caller without creating

On request from any workflow, `new-change-branch` SHALL run its inspection and return the suggested bases in their returned order, as the display options and exact references of the first page (up to four options in all: with more than four bases, three bases plus `More`; with four or fewer, every base without `More`; plus the free-text entry), without asking and without repository mutation. The caller SHALL present that question and hand the answer back as a supplied base. The skill SHALL NOT name or depend on its caller, and standalone use SHALL keep its existing sections unchanged.

#### Scenario: Caller requests base preparation

- **WHEN** a workflow asks `new-change-branch` to prepare bases
- **THEN** the skill returns the first page of suggested bases with their exact references and creates nothing

#### Scenario: More than four bases are prepared

- **WHEN** inspection returns more than four suggested bases
- **THEN** the prepared first page carries the first three bases in returned order plus `More` and the free-text entry

#### Scenario: Four or fewer bases are prepared

- **WHEN** inspection returns four or fewer suggested bases
- **THEN** the prepared first page carries every base in returned order without `More`, plus the free-text entry

### Requirement: Accept a supplied base and resolved name

`new-change-branch` SHALL accept from an invoking workflow a supplied `base` bound to a user answer already collected for that exact base reference, or an advance authorization of the whole creation, together with an optional resolved type, name, and identifier. With a matching supplied base, it SHALL skip the base question, resolve the base with its helper, show the final branch and base without waiting, and continue. A supplied base that does not match the prepared base reference, or no supplied answer, SHALL keep the base question. A supplied type, name, and identifier SHALL still pass through the skill's `name` operation, and the skill SHALL ask only for what `name` rejects or leaves ambiguous. `skills/universal/new-change-branch/SKILL.md` SHALL contain no reference to `sai-explore` or Explore.

#### Scenario: Supplied base does not match the prepared reference

- **WHEN** a workflow supplies a base that differs from the base reference the skill prepared
- **THEN** the skill asks its standalone base question

#### Scenario: Supplied name is ambiguous

- **WHEN** a workflow supplies a type and name that the `name` operation rejects
- **THEN** the skill asks only for the rejected naming data
