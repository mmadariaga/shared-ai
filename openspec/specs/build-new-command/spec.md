# build-new-command Specification

## Purpose
TBD - created by archiving change sai-build-new-walking-skeleton. Update Purpose after archive.

## Requirements

### Requirement: Build-new chains the implement-new segment

`/sai-build-new` SHALL run `/sai-3-implement-new` as its first and only segment in the same session, with the same `arguments_value`, without entering another wrapper, and without asking for approval between segments. It SHALL reserve the next segment position for `/sai-4-review` and SHALL NOT use `sai/orchestration/composition.md` or the `meta-build` coordinator.

#### Scenario: Build-new runs the implementation segment

- **WHEN** a user invokes `/sai-build-new` with a change name
- **THEN** the coordinator follows `sai/commands/implement-new/coordinator.md` with the same `arguments_value` and closes after that segment, because the review segment does not exist yet.

### Requirement: Build-new closing line

When its segment completes, `/sai-build-new` SHALL print the segment's closing report and end with exactly `Build-new done.` in place of the segment's own closing line. When the segment ends blocked (an escalation the user did not resolve), stopped, or with a failed precondition, it SHALL print that report, name `build-log.md` when the segment wrote one, end without a closing line, and start no later segment.

#### Scenario: Segment stops

- **WHEN** the implement-new segment ends with an escalation or a failed precondition
- **THEN** `/sai-build-new` prints the segment's report, prints no `Build-new done.` line, and starts no later segment.
