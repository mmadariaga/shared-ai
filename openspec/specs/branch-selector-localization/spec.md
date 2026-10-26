# branch-selector-localization Specification

## Purpose
Defines how the merge branch selector keeps a canonical English source question and renders it in the ambient conversation language while preserving exact branch values and date labels.

## Requirements

### Requirement: Missing branch is asked by the coordinator in the chat language

When `/sai-merge` is invoked without a branch, the coordinator itself SHALL ask which branch to integrate, in the chat language, through the native picker with the newest preflight candidates up to the picker capacity and the picker's free text, or in plain text when there are none; a picked candidate SHALL name its full `ref` as its value. When the invocation also carries neither `--rebase` nor `--squash`, the method question SHALL be asked in the same picker call. The worker SHALL return no branch-selection gate.

#### Scenario: Branch is asked only when missing

- **WHEN** the invocation names a branch
- **THEN** no branch question is asked

#### Scenario: Branch and method share one picker call

- **WHEN** the invocation names neither a branch nor a method option
- **THEN** the coordinator asks the branch and the method in one native picker call
